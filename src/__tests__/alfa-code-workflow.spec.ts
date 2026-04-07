// kilocode_change - new file
import * as fs from "fs/promises"
import * as os from "os"
import * as path from "path"

import { getAlfaCodeWorkflowSection } from "../core/prompts/sections/alfa-code-workflow"
import { MemoryBankService } from "../services/alfa-code/MemoryBankService"

describe("AlfaCode workflow section", () => {
	it("includes the expected headers", () => {
		const section = getAlfaCodeWorkflowSection()

		expect(section).toContain("ALFACODE WORKFLOW SYSTEM")
		expect(section).toContain("Core Rules")
		expect(section).toContain("Quality Gates")
		expect(section).toContain("Verification Gate")
		expect(section).toContain("Runtime Guardrails")
		expect(section).toContain("Shadow mode must not auto-approve mutations")
		expect(section).toContain("degraded-mode summary with warnings")
		expect(section).toContain("say what is unknown instead of filling gaps with guesses")
		expect(section).toContain("Token Discipline")
	})
})

describe("MemoryBankService", () => {
	let tempDir: string

	beforeEach(async () => {
		tempDir = await fs.mkdtemp(path.join(os.tmpdir(), "alfa-mb-"))
	})

	afterEach(async () => {
		await fs.rm(tempDir, { recursive: true, force: true })
	})

	it("returns a NEW PROJECT marker when the memory bank does not exist", async () => {
		const service = new MemoryBankService(tempDir)

		expect(await service.exists()).toBe(false)
		const quickContext = await service.getQuickContext()
		expect(quickContext).toContain("[MB: NEW PROJECT]")
	})

	it("truncates quick context when content exceeds max length", async () => {
		const memoryBankPath = path.join(tempDir, ".kilocode", "memory-bank")
		await fs.mkdir(memoryBankPath, { recursive: true })

		const content = "a".repeat(50)
		await fs.writeFile(path.join(memoryBankPath, "context.md"), content)

		const service = new MemoryBankService(tempDir)
		const quickContext = await service.getQuickContext(10)

		expect(quickContext).toContain("## Project Context")
		expect(quickContext).toContain("a".repeat(10))
		expect(quickContext).toContain("[MB: OK]")
		expect(quickContext).toContain("...[truncated")
	})

	it("combines brief and context for standard context", async () => {
		const memoryBankPath = path.join(tempDir, ".kilocode", "memory-bank")
		await fs.mkdir(memoryBankPath, { recursive: true })

		await fs.writeFile(path.join(memoryBankPath, "brief.md"), "Brief content")
		await fs.writeFile(path.join(memoryBankPath, "context.md"), "Context content")

		const service = new MemoryBankService(tempDir)
		const standardContext = await service.getStandardContext(1000)

		expect(standardContext).toContain("Project Memory Bank")
		expect(standardContext).toContain("Project Brief (brief.md)")
		expect(standardContext).toContain("Brief content")
		expect(standardContext).toContain("Current Context (context.md)")
		expect(standardContext).toContain("Context content")
	})
})
