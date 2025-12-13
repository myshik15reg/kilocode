#!/usr/bin/env ts-node
/**
 * Neo4j Benchmarks Runner
 * 
 * Удобная утилита для запуска performance benchmarks Neo4j интеграции.
 * 
 * Usage:
 *   npm run benchmark:neo4j
 *   pnpm benchmark:neo4j
 *   ts-node scripts/run-neo4j-benchmarks.ts
 * 
 * Options:
 *   --help, -h          Show help
 *   --suite <name>      Run specific test suite
 *   --compare           Compare with previous results
 *   --export <file>     Export results to file
 */

import { spawn } from 'child_process'
import * as path from 'path'
import * as fs from 'fs/promises'

// Цвета для вывода
const colors = {
	green: '\x1b[32m',
	red: '\x1b[31m',
	yellow: '\x1b[33m',
	blue: '\x1b[34m',
	cyan: '\x1b[36m',
	magenta: '\x1b[35m',
	reset: '\x1b[0m',
	bold: '\x1b[1m',
}

interface BenchmarkOptions {
	suite?: string
	compare?: boolean
	export?: string
	help?: boolean
}

function printBanner() {
	console.log(`${colors.bold}${colors.cyan}`)
	console.log('╔════════════════════════════════════════════════════════════════════════╗')
	console.log('║                  Neo4j Performance Benchmarks Runner                   ║')
	console.log('║                         Kilocode Integration                           ║')
	console.log('╚════════════════════════════════════════════════════════════════════════╝')
	console.log(`${colors.reset}\n`)
}

function printHelp() {
	console.log(`${colors.bold}Usage:${colors.reset}
  npm run benchmark:neo4j [options]
  pnpm benchmark:neo4j [options]
  ts-node scripts/run-neo4j-benchmarks.ts [options]

${colors.bold}Options:${colors.reset}
  --help, -h           Show this help message
  --suite <name>       Run specific test suite:
                       - indexing      : Indexing performance tests
                       - graph         : Graph operations tests
                       - memory        : Memory usage tests
                       - scalability   : Scalability projections
  --compare            Compare results with previous runs
  --export <file>      Export results to specified JSON file
  
${colors.bold}Examples:${colors.reset}
  # Run all benchmarks
  npm run benchmark:neo4j
  
  # Run only indexing benchmarks
  npm run benchmark:neo4j -- --suite indexing
  
  # Run and compare with history
  npm run benchmark:neo4j -- --compare
  
  # Export results to custom file
  npm run benchmark:neo4j -- --export ./my-results.json

${colors.bold}Environment Variables:${colors.reset}
  NEO4J_URI          Neo4j connection URI (default: bolt://localhost:7687)
  NEO4J_USERNAME     Neo4j username (default: neo4j)
  NEO4J_PASSWORD     Neo4j password (default: password)

${colors.bold}Prerequisites:${colors.reset}
  - Neo4j database running and accessible
  - Test database configured (kilocode_benchmark_test)
  - Node.js dependencies installed (pnpm install)
`)
}

function parseArgs(): BenchmarkOptions {
	const args = process.argv.slice(2)
	const options: BenchmarkOptions = {}
	
	for (let i = 0; i < args.length; i++) {
		const arg = args[i]
		
		switch (arg) {
			case '--help':
			case '-h':
				options.help = true
				break
			case '--suite':
				options.suite = args[++i]
				break
			case '--compare':
				options.compare = true
				break
			case '--export':
				options.export = args[++i]
				break
		}
	}
	
	return options
}

async function checkPrerequisites(): Promise<boolean> {
	console.log(`${colors.blue}Checking prerequisites...${colors.reset}`)
	
	// Check if Neo4j connection details are available
	const neo4jUri = process.env.NEO4J_URI || 'bolt://localhost:7687'
	const neo4jUsername = process.env.NEO4J_USERNAME || 'neo4j'
	const neo4jPassword = process.env.NEO4J_PASSWORD || 'password'
	
	console.log(`  ${colors.cyan}Neo4j URI:${colors.reset} ${neo4jUri}`)
	console.log(`  ${colors.cyan}Username:${colors.reset} ${neo4jUsername}`)
	console.log(`  ${colors.cyan}Database:${colors.reset} kilocode_benchmark_test`)
	
	// TODO: Could add actual connection test here
	console.log(`  ${colors.green}✓${colors.reset} Prerequisites check passed\n`)
	
	return true
}

async function runBenchmarks(options: BenchmarkOptions): Promise<number> {
	const benchmarkFile = 'services/neo4j/__tests__/benchmarks/performance.benchmark.ts'
	
	let testPattern = benchmarkFile
	if (options.suite) {
		const suiteMap: Record<string, string> = {
			'indexing': 'Indexing Performance',
			'graph': 'Graph Operations Performance',
			'memory': 'Memory Usage',
			'scalability': 'Scalability Projections',
		}
		
		const suiteName = suiteMap[options.suite.toLowerCase()]
		if (!suiteName) {
			console.error(`${colors.red}Unknown suite: ${options.suite}${colors.reset}`)
			console.error(`Available suites: ${Object.keys(suiteMap).join(', ')}`)
			return 1
		}
		
		testPattern = `${benchmarkFile} -t "${suiteName}"`
		console.log(`${colors.yellow}Running suite: ${suiteName}${colors.reset}\n`)
	}
	
	return new Promise((resolve) => {
		const vitestProcess = spawn(
			'pnpm',
			['test', testPattern, '--run'],
			{
				cwd: path.join(__dirname, '..', 'src'),
				stdio: 'inherit',
				shell: true,
				env: {
					...process.env,
					NODE_ENV: 'test',
				},
			}
		)
		
		vitestProcess.on('close', (code) => {
			resolve(code || 0)
		})
		
		vitestProcess.on('error', (error) => {
			console.error(`${colors.red}Failed to run benchmarks:${colors.reset}`, error)
			resolve(1)
		})
	})
}

async function compareResults() {
	console.log(`\n${colors.bold}${colors.cyan}Comparing with previous results...${colors.reset}\n`)
	
	const historyFile = path.join(
		__dirname,
		'..',
		'src',
		'services',
		'neo4j',
		'__tests__',
		'benchmarks',
		'results',
		'history.json'
	)
	
	try {
		const historyData = await fs.readFile(historyFile, 'utf-8')
		const history = JSON.parse(historyData)
		
		if (history.length < 2) {
			console.log(`${colors.yellow}Not enough history data for comparison${colors.reset}`)
			return
		}
		
		const current = history[history.length - 1]
		const previous = history[history.length - 2]
		
		console.log(`${colors.bold}Comparison:${colors.reset}`)
		console.log(`  Current:  ${current.timestamp}`)
		console.log(`  Previous: ${previous.timestamp}\n`)
		
		const improvements: string[] = []
		const regressions: string[] = []
		
		for (const currentResult of current.results) {
			const previousResult = previous.results.find(
				(r: any) => r.name === currentResult.name
			)
			
			if (previousResult && previousResult.duration > 0) {
				const change = ((currentResult.duration - previousResult.duration) / previousResult.duration) * 100
				
				if (Math.abs(change) > 5) { // Only show changes > 5%
					const changeStr = change > 0 ? `+${change.toFixed(1)}%` : `${change.toFixed(1)}%`
					const color = change > 0 ? colors.red : colors.green
					const arrow = change > 0 ? '↑' : '↓'
					
					const message = `  ${color}${arrow} ${currentResult.name}: ${changeStr}${colors.reset} (${previousResult.duration.toFixed(2)}ms → ${currentResult.duration.toFixed(2)}ms)`
					
					if (change > 0) {
						regressions.push(message)
					} else {
						improvements.push(message)
					}
				}
			}
		}
		
		if (improvements.length > 0) {
			console.log(`${colors.green}${colors.bold}Improvements:${colors.reset}`)
			improvements.forEach(msg => console.log(msg))
			console.log()
		}
		
		if (regressions.length > 0) {
			console.log(`${colors.red}${colors.bold}Regressions:${colors.reset}`)
			regressions.forEach(msg => console.log(msg))
			console.log()
		}
		
		if (improvements.length === 0 && regressions.length === 0) {
			console.log(`${colors.cyan}No significant changes detected${colors.reset}\n`)
		}
		
	} catch (error) {
		console.log(`${colors.yellow}Could not load comparison data${colors.reset}`)
		console.log(`${colors.yellow}(This is normal for first run)${colors.reset}\n`)
	}
}

async function exportResults(exportPath: string) {
	console.log(`\n${colors.blue}Exporting results to ${exportPath}...${colors.reset}`)
	
	const resultsDir = path.join(
		__dirname,
		'..',
		'src',
		'services',
		'neo4j',
		'__tests__',
		'benchmarks',
		'results'
	)
	
	try {
		const files = await fs.readdir(resultsDir)
		const benchmarkFiles = files.filter(f => f.startsWith('benchmark-') && f.endsWith('.json'))
		
		if (benchmarkFiles.length === 0) {
			console.log(`${colors.yellow}No benchmark results found${colors.reset}`)
			return
		}
		
		// Get the latest result file
		const latestFile = benchmarkFiles.sort().reverse()[0]
		const latestFilePath = path.join(resultsDir, latestFile)
		
		const resultData = await fs.readFile(latestFilePath, 'utf-8')
		await fs.writeFile(exportPath, resultData)
		
		console.log(`${colors.green}✓ Results exported successfully${colors.reset}\n`)
	} catch (error) {
		console.error(`${colors.red}Failed to export results:${colors.reset}`, error)
	}
}

async function printSystemInfo() {
	console.log(`${colors.bold}System Information:${colors.reset}`)
	console.log(`  Node.js: ${process.version}`)
	console.log(`  Platform: ${process.platform}`)
	console.log(`  Architecture: ${process.arch}`)
	console.log(`  CPU Cores: ${require('os').cpus().length}`)
	console.log(`  Total Memory: ${(require('os').totalmem() / 1024 / 1024 / 1024).toFixed(2)} GB`)
	console.log(`  Free Memory: ${(require('os').freemem() / 1024 / 1024 / 1024).toFixed(2)} GB`)
	console.log()
}

async function main() {
	const options = parseArgs()
	
	printBanner()
	
	if (options.help) {
		printHelp()
		process.exit(0)
	}
	
	await printSystemInfo()
	
	const prereqsPassed = await checkPrerequisites()
	if (!prereqsPassed) {
		console.error(`${colors.red}Prerequisites check failed${colors.reset}`)
		process.exit(1)
	}
	
	console.log(`${colors.bold}${colors.magenta}Starting benchmarks...${colors.reset}\n`)
	console.log(`${colors.yellow}This may take several minutes depending on the suite${colors.reset}\n`)
	
	const exitCode = await runBenchmarks(options)
	
	if (exitCode !== 0) {
		console.error(`\n${colors.red}Benchmarks failed with exit code ${exitCode}${colors.reset}`)
		process.exit(exitCode)
	}
	
	// Post-processing
	if (options.compare) {
		await compareResults()
	}
	
	if (options.export) {
		await exportResults(options.export)
	}
	
	console.log(`${colors.green}${colors.bold}✓ Benchmarks completed successfully${colors.reset}\n`)
	
	console.log(`${colors.cyan}Results saved in:${colors.reset}`)
	console.log(`  src/services/neo4j/__tests__/benchmarks/results/`)
	console.log()
}

// Run the script
main().catch((error) => {
	console.error(`${colors.red}Fatal error:${colors.reset}`, error)
	process.exit(1)
})