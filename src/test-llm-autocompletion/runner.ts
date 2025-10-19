#!/usr/bin/env node

import fs from "fs"
import path from "path"
import { LLMClient } from "./llm-client.js"
import { StrategyTester } from "./strategy-tester.js"
import { testCases, getCategories, TestCase } from "./test-cases.js"
import { checkApproval } from "./approvals.js"

interface TestResult {
	testCase: TestCase
	isApproved: boolean
	completion: string
	error?: string
	actualValue?: string
	newOutput?: boolean
	llmRequestDuration?: number
	strategyName?: string
}

export class TestRunner {
	private llmClient: LLMClient
	private strategyTester: StrategyTester
	private verbose: boolean
	private results: TestResult[] = []
	private skipApproval: boolean

	constructor(verbose: boolean = false, skipApproval: boolean = false) {
		this.verbose = verbose
		this.skipApproval = skipApproval
		this.llmClient = new LLMClient()
		this.strategyTester = new StrategyTester(this.llmClient)
	}

	async runTest(testCase: TestCase): Promise<TestResult> {
		try {
			const startTime = performance.now()
			const completion = await this.strategyTester.getCompletion(testCase.input)
			const llmRequestDuration = performance.now() - startTime

			const changes = this.strategyTester.parseCompletion(completion)

			let actualValue: string

			if (changes.length > 0) {
				// Apply the change: replace search with replace in the input
				const change = changes[0]
				actualValue = testCase.input.replace(change.search, change.replace)
			} else {
				actualValue = "(no changes parsed)"
			}

			// Auto-reject if no changes were parsed
			if (actualValue === "(no changes parsed)") {
				return {
					testCase,
					isApproved: false,
					completion,
					actualValue,
					llmRequestDuration,
				}
			}

			const approvalResult = await checkApproval(
				testCase.category,
				testCase.name,
				testCase.input,
				actualValue,
				this.skipApproval,
			)

			return {
				...approvalResult,
				testCase,
				completion,
				actualValue,
				llmRequestDuration,
			}
		} catch (error) {
			return {
				testCase,
				isApproved: false,
				completion: "",
				error: error instanceof Error ? error.message : String(error),
			}
		}
	}

	private isUnknownResult(result: TestResult): boolean {
		return !result.isApproved && result.newOutput === true && this.skipApproval
	}

	async runAllTests(): Promise<void> {
		console.log("\n🚀 Starting AutoTrigger Strategy LLM Tests\n")
		console.log("Provider:", this.llmClient["provider"])
		console.log("Model:", this.llmClient["model"])
		if (this.skipApproval) {
			console.log("Skip Approval: enabled (tests will fail if not already approved)")
		}
		console.log("Total tests:", testCases.length)
		console.log("Categories:", getCategories().join(", "))
		console.log("\n" + "─".repeat(80) + "\n")

		for (const category of getCategories()) {
			console.log(`\n📁 ${category}`)
			console.log("─".repeat(40))

			const categoryTests = testCases.filter((tc) => tc.category === category)

			for (const testCase of categoryTests) {
				const strategyName = this.strategyTester.getSelectedStrategyName(testCase.input)
				process.stdout.write(`  Running ${testCase.name} [${strategyName}]... `)

				const result = await this.runTest(testCase)
				result.strategyName = strategyName
				this.results.push(result)

				if (result.isApproved) {
					console.log("✓ PASSED")
					if (result.newOutput) {
						console.log(`    (New output approved)`)
					}
				} else if (this.isUnknownResult(result)) {
					console.log("? UNKNOWN")
					console.log(`    (New output without approval)`)
				} else {
					console.log("✗ FAILED")
					if (result.error) {
						console.log(`    Error: ${result.error}`)
					} else {
						console.log(`    Input:`)
						console.log("    " + "─".repeat(76))
						console.log(
							testCase.input
								.split("\n")
								.map((l) => "    " + l)
								.join("\n"),
						)
						console.log("    " + "─".repeat(76))
						console.log(`    Got:`)
						console.log("    " + "─".repeat(76))
						console.log(
							(result.actualValue || "")
								.split("\n")
								.map((l) => "    " + l)
								.join("\n"),
						)
						console.log("    " + "─".repeat(76))

						if (this.verbose && result.completion) {
							console.log("    Full XML Response:")
							console.log(
								result.completion
									.split("\n")
									.map((l) => "      " + l)
									.join("\n"),
							)
						}
					}
				}

				if (this.verbose) {
					console.log(`    Description: ${testCase.description}`)
				}
			}
		}

		this.printSummary()
	}

	private printSummary(): void {
		console.log("\n" + "═".repeat(80))
		console.log("\n📊 Test Summary\n")

		const unknownResults = this.results.filter((r) => this.isUnknownResult(r))
		const failedResults = this.results.filter((r) => !r.isApproved && !this.isUnknownResult(r))
		const passedResults = this.results.filter((r) => r.isApproved)

		const passed = passedResults.length
		const unknown = unknownResults.length
		const failed = failedResults.length
		const knownTotal = passed + failed
		const passRate = knownTotal > 0 ? ((passed / knownTotal) * 100).toFixed(1) : "0.0"

		console.log(`  ✓ Passed: ${passed}`)
		console.log(`  ✗ Failed: ${failed}`)
		if (unknown > 0) {
			console.log(`  ? Unknown: ${unknown}`)
		}
		console.log(`  📈 Accuracy: ${passRate}% (${passed}/${knownTotal})`)

		const requestDurations = this.results
			.filter((r) => r.llmRequestDuration !== undefined)
			.map((r) => r.llmRequestDuration!)
		if (requestDurations.length > 0) {
			const avgTime = (
				requestDurations.reduce((sum, duration) => sum + duration, 0) / requestDurations.length
			).toFixed(0)
			console.log(`  ⏱️  Avg LLM Request Time: ${avgTime}ms`)
		}

		// Category breakdown
		console.log("\n📁 Category Breakdown:")
		for (const category of getCategories()) {
			const categoryResults = this.results.filter((r) => r.testCase.category === category)
			const categoryPassed = categoryResults.filter((r) => r.isApproved).length
			const categoryTotal = categoryResults.length
			const categoryRateNum = (categoryPassed / categoryTotal) * 100
			const categoryRate = categoryRateNum.toFixed(0)

			const statusIndicator = categoryRateNum === 100 ? "✓" : categoryRateNum >= 75 ? "⚠" : "✗"

			console.log(`  ${category}: ${statusIndicator} ${categoryPassed}/${categoryTotal} (${categoryRate}%)`)
		}

		// Strategy usage statistics
		const strategyUsage = new Map<string, number>()
		for (const result of this.results) {
			if (result.strategyName) {
				strategyUsage.set(result.strategyName, (strategyUsage.get(result.strategyName) || 0) + 1)
			}
		}

		if (strategyUsage.size > 0) {
			console.log("\n🎯 Strategy Usage:")
			const sortedStrategies = Array.from(strategyUsage.entries()).sort((a, b) => b[1] - a[1])
			for (const [strategyName, count] of sortedStrategies) {
				const percentage = ((count / this.results.length) * 100).toFixed(0)
				console.log(`  ${strategyName}: ${count} (${percentage}%)`)
			}
		}

		// Failed tests details
		if (failed > 0) {
			console.log("\n❌ Failed Tests:")
			for (const result of failedResults) {
				console.log(`  • ${result.testCase.name} (${result.testCase.category})`)
				if (result.error) {
					console.log(`    Error: ${result.error}`)
				}
			}
		}

		// Unknown tests details
		if (unknown > 0) {
			console.log("\n❓ Unknown Tests (new outputs without approval):")
			for (const result of unknownResults) {
				console.log(`  • ${result.testCase.name} (${result.testCase.category})`)
			}
		}

		console.log("\n" + "═".repeat(80) + "\n")

		// Exit with appropriate code
		process.exit(failed > 0 ? 1 : 0)
	}

	async runSingleTest(testName: string): Promise<void> {
		const testCase = testCases.find((tc) => tc.name === testName)
		if (!testCase) {
			console.error(`Test "${testName}" not found`)
			console.log("\nAvailable tests:")
			testCases.forEach((tc) => console.log(`  - ${tc.name}`))
			process.exit(1)
		}

		const numRuns = 10

		console.log(`\n🧪 Running Single Test: ${testName} (${numRuns} times)\n`)
		console.log("Category:", testCase.category)
		console.log("Description:", testCase.description)
		console.log("\nInput Code:")
		console.log(testCase.input)
		console.log("\n" + "═".repeat(80))

		const results: TestResult[] = []

		for (let i = 0; i < numRuns; i++) {
			console.log(`\n🔄 Run ${i + 1}/${numRuns}...`)

			const result = await this.runTest(testCase)

			results.push(result)

			const status = result.isApproved ? "✓ PASSED" : "✗ FAILED"
			const llmTime = result.llmRequestDuration ? `${result.llmRequestDuration.toFixed(0)}ms LLM` : "N/A"
			console.log(`   ${status} - ${llmTime}`)
		}

		console.log("\n" + "═".repeat(80))
		console.log("\n📊 Test Statistics\n")

		const passedRuns = results.filter((r) => r.isApproved).length
		const failedRuns = numRuns - passedRuns
		console.log(`  ✓ Passed: ${passedRuns}/${numRuns}`)
		console.log(`  ✗ Failed: ${failedRuns}/${numRuns}`)

		const llmTimes = results.filter((r) => r.llmRequestDuration !== undefined).map((r) => r.llmRequestDuration!)
		if (llmTimes.length > 0) {
			const sortedLlmTimes = [...llmTimes].sort((a, b) => a - b)
			const avgLlmTime = llmTimes.reduce((sum, time) => sum + time, 0) / llmTimes.length
			const minLlmTime = sortedLlmTimes[0]
			const maxLlmTime = sortedLlmTimes[sortedLlmTimes.length - 1]
			const medianLlmTime = sortedLlmTimes[Math.floor(llmTimes.length / 2)]

			console.log("\n⚡ LLM Request Time:")
			console.log(`  Average: ${avgLlmTime.toFixed(0)}ms`)
			console.log(`  Median:  ${medianLlmTime.toFixed(0)}ms`)
			console.log(`  Min:     ${minLlmTime.toFixed(0)}ms`)
			console.log(`  Max:     ${maxLlmTime.toFixed(0)}ms`)
		}

		const lastResult = results[results.length - 1]

		console.log("\n" + "═".repeat(80))
		console.log("\n📝 Last Run Details\n")

		if (lastResult.isApproved) {
			console.log("✓ TEST PASSED")
			if (lastResult.newOutput) {
				console.log("(New output approved)")
			}
		} else {
			console.log("✗ TEST FAILED")
			if (lastResult.error) {
				console.log(`Error: ${lastResult.error}`)
			} else {
				console.log("\nExtracted value being tested:")
				console.log(`  "${lastResult.actualValue}"`)
			}
		}

		if (lastResult.completion) {
			const changes = this.strategyTester.parseCompletion(lastResult.completion)
			if (changes.length > 0) {
				console.log("\nParsed Changes:")
				changes.forEach((change, i) => {
					console.log(`Change ${i + 1}:`)
					console.log("  Search:")
					console.log("  " + "─".repeat(78))
					console.log(
						change.search
							.split("\n")
							.map((l) => "  " + l)
							.join("\n"),
					)
					console.log("  " + "─".repeat(78))
					console.log("  Replace:")
					console.log("  " + "─".repeat(78))
					console.log(
						change.replace
							.split("\n")
							.map((l) => "  " + l)
							.join("\n"),
					)
					console.log("  " + "─".repeat(78))

					const extracted = change.replace.replace(testCase.input, "").trim()
					console.log("  Extracted for test:", extracted || "(full replacement)")
				})
			} else {
				console.log("\nNo changes were parsed from the response")
			}

			console.log("\nFull LLM Response:")
			console.log(lastResult.completion)
		}

		console.log("\n" + "═".repeat(80) + "\n")

		process.exit(passedRuns === numRuns ? 0 : 1)
	}

	async cleanApprovals(): Promise<void> {
		console.log("\n🧹 Cleaning approvals for non-existent test cases...\n")

		// Create a set of existing test case identifiers
		const existingTestCases = new Set(testCases.map((tc) => `${tc.category}/${tc.name}`))

		const approvalsDir = "approvals"
		let cleanedCount = 0
		let totalFiles = 0

		if (!fs.existsSync(approvalsDir)) {
			console.log("No approvals directory found.")
			return
		}

		// Recursively scan approvals directory
		function scanDirectory(dirPath: string, currentCategory?: string): void {
			const items = fs.readdirSync(dirPath, { withFileTypes: true })

			for (const item of items) {
				const fullPath = path.join(dirPath, item.name)

				if (item.isDirectory()) {
					// Category directory
					scanDirectory(fullPath, item.name)
				} else if (item.isFile() && item.name.endsWith(".txt")) {
					totalFiles++

					// Parse filename: testName.approved.1.txt or testName.rejected.1.txt
					const match = item.name.match(/^(.+)\.(approved|rejected)\.\d+\.txt$/)
					if (match) {
						const testName = match[1]
						const category = currentCategory || path.basename(path.dirname(fullPath))
						const testCaseId = `${category}/${testName}`

						if (!existingTestCases.has(testCaseId)) {
							console.log(`Removing approval for non-existent test case: ${testCaseId}`)
							fs.unlinkSync(fullPath)
							cleanedCount++
						}
					}
				}
			}
		}

		scanDirectory(approvalsDir)

		console.log(`\n✅ Cleaned ${cleanedCount} approval files out of ${totalFiles} total files.`)
		if (cleanedCount > 0) {
			console.log("Removed approvals for test cases that no longer exist.")
		} else {
			console.log("No orphaned approval files found.")
		}
	}
}

// Main execution
async function main() {
	const args = process.argv.slice(2)
	const verbose = args.includes("--verbose") || args.includes("-v")
	const skipApproval = args.includes("--skip-approval") || args.includes("-sa")

	const command = args.find((arg) => !arg.startsWith("-"))

	const runner = new TestRunner(verbose, skipApproval)

	try {
		if (command === "clean") {
			await runner.cleanApprovals()
		} else if (command) {
			await runner.runSingleTest(command)
		} else {
			await runner.runAllTests()
		}
	} catch (error) {
		console.error("\n❌ Fatal Error:", error)
		process.exit(1)
	}
}

// Check for required environment variables
function checkEnvironment() {
	const provider = process.env.LLM_PROVIDER || "kilocode"

	if (provider !== "kilocode") {
		console.error(`\n❌ Error: Only kilocode provider is supported. Got: ${provider}`)
		process.exit(1)
	}

	if (!process.env.KILOCODE_API_KEY) {
		console.error(`\n❌ Error: KILOCODE_API_KEY is not set`)
		console.log("\nPlease create a .env file with your API credentials.")
		console.log("Example: KILOCODE_API_KEY=your-api-key-here\n")
		process.exit(1)
	}
}

checkEnvironment()
main().catch(console.error)
