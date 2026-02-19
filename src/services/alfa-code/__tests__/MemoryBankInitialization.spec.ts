import * as fs from "fs/promises"
import * as os from "os"
import * as path from "path"

import { ensureMemoryBankInitialized } from "../MemoryBankService"

async function writeFile(filePath: string, content: string) {
	await fs.mkdir(path.dirname(filePath), { recursive: true })
	await fs.writeFile(filePath, content, "utf8")
}

async function pathExists(targetPath: string): Promise<boolean> {
	try {
		await fs.stat(targetPath)
		return true
	} catch {
		return false
	}
}

describe("ensureMemoryBankInitialized", () => {
	let tempRoot: string

	beforeEach(async () => {
		tempRoot = await fs.mkdtemp(path.join(os.tmpdir(), "alfa-mb-init-"))
	})

	afterEach(async () => {
		await fs.rm(tempRoot, { recursive: true, force: true })
	})

	it("initializes Memory Bank when missing by copying template files", async () => {
		const projectRoot = path.join(tempRoot, "project")
		const globalKiloDir = path.join(tempRoot, "global")
		const templateDir = path.join(globalKiloDir, "workflowai", "templates", "memory-bank")

		await writeFile(path.join(templateDir, "index.md"), "# Index")
		await writeFile(path.join(templateDir, "brief.md"), "# Brief")
		await writeFile(path.join(templateDir, "product.md"), "# Product")
		await writeFile(path.join(templateDir, "architecture.md"), "# Architecture")
		await writeFile(path.join(templateDir, "tech.md"), "# Tech")
		await writeFile(path.join(templateDir, "context.md"), "# Context")

		const result = await ensureMemoryBankInitialized({ projectRoot, globalKiloDir })

		expect(result.templateMissing).toBe(false)
		expect(result.didInitialize).toBe(true)
		expect(result.copiedFiles).toBe(6)

		const destDir = path.join(projectRoot, ".kilocode", "memory-bank")
		await expect(fs.readFile(path.join(destDir, "index.md"), "utf8")).resolves.toBe("# Index")
		await expect(fs.readFile(path.join(destDir, "context.md"), "utf8")).resolves.toBe("# Context")
	})

	it("does nothing when Memory Bank already exists (index.md present)", async () => {
		const projectRoot = path.join(tempRoot, "project")
		const globalKiloDir = path.join(tempRoot, "global")
		const templateDir = path.join(globalKiloDir, "workflowai", "templates", "memory-bank")

		await writeFile(path.join(templateDir, "index.md"), "# TEMPLATE Index")
		await writeFile(path.join(templateDir, "brief.md"), "# TEMPLATE Brief")

		const destDir = path.join(projectRoot, ".kilocode", "memory-bank")
		await writeFile(path.join(destDir, "index.md"), "# EXISTING Index")

		const result = await ensureMemoryBankInitialized({ projectRoot, globalKiloDir })

		expect(result.didInitialize).toBe(false)
		expect(result.copiedFiles).toBe(0)
		expect(result.skippedFiles).toBe(0)
		expect(result.templateMissing).toBe(false)

		await expect(fs.readFile(path.join(destDir, "index.md"), "utf8")).resolves.toBe("# EXISTING Index")
		await expect(pathExists(path.join(destDir, "brief.md"))).resolves.toBe(false)
	})

	it("silently skips when template directory is missing", async () => {
		const projectRoot = path.join(tempRoot, "project")
		const globalKiloDir = path.join(tempRoot, "global")
		const log = vi.fn()

		const result = await ensureMemoryBankInitialized({ projectRoot, globalKiloDir, log })

		expect(result.templateMissing).toBe(true)
		expect(result.didInitialize).toBe(false)
		expect(log).not.toHaveBeenCalled()

		const destDir = path.join(projectRoot, ".kilocode", "memory-bank")
		await expect(pathExists(destDir)).resolves.toBe(false)
	})
})
