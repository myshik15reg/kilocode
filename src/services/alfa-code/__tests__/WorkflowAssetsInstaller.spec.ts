import fs from "fs/promises"
import path from "path"
import os from "os"
import yaml from "yaml"

import { syncWorkflowAiAssets } from "../WorkflowAssetsInstaller"

let tempRoot: string

async function writeFile(filePath: string, content: string) {
	await fs.mkdir(path.dirname(filePath), { recursive: true })
	await fs.writeFile(filePath, content, "utf8")
}

beforeEach(async () => {
	tempRoot = await fs.mkdtemp(path.join(os.tmpdir(), "workflow-ai-"))
})

afterEach(async () => {
	await fs.rm(tempRoot, { recursive: true, force: true })
})

describe("syncWorkflowAiAssets", () => {
	it("copies missing assets into the global .kilocode directory", async () => {
		const assetsRoot = path.join(tempRoot, "assets")
		const globalKiloDir = path.join(tempRoot, "global")

		await writeFile(path.join(assetsRoot, ".kilocode", "rules", "quality.md"), "# Quality Rules")
		await writeFile(path.join(assetsRoot, ".kilocode", "workflows", "quickstart.md"), "# Quickstart Workflow")
		await writeFile(path.join(assetsRoot, ".kilocode", "QUICK.md"), "# QUICK")

		const result = await syncWorkflowAiAssets({ assetsRoot, globalKiloDir })

		expect(result.errors).toHaveLength(0)
		await expect(fs.readFile(path.join(globalKiloDir, "rules", "quality.md"), "utf8")).resolves.toContain(
			"Quality Rules",
		)
		await expect(
			fs.readFile(path.join(globalKiloDir, "workflows", "quickstart.md"), "utf8"),
		).resolves.toContain("Quickstart Workflow")
		await expect(fs.readFile(path.join(globalKiloDir, "QUICK.md"), "utf8")).resolves.toContain("QUICK")
	})

	it("does not overwrite existing destination files", async () => {
		const assetsRoot = path.join(tempRoot, "assets")
		const globalKiloDir = path.join(tempRoot, "global")

		await writeFile(path.join(assetsRoot, ".kilocode", "rules", "quality.md"), "NEW CONTENT")
		await writeFile(path.join(globalKiloDir, "rules", "quality.md"), "ORIGINAL CONTENT")

		const result = await syncWorkflowAiAssets({ assetsRoot, globalKiloDir })

		expect(result.errors).toHaveLength(0)
		expect(result.skippedFiles).toBeGreaterThan(0)
		await expect(fs.readFile(path.join(globalKiloDir, "rules", "quality.md"), "utf8")).resolves.toBe(
			"ORIGINAL CONTENT",
		)
	})

	it("merges custom modes without overwriting existing slugs", async () => {
		const assetsRoot = path.join(tempRoot, "assets")
		const globalKiloDir = path.join(tempRoot, "global")

		const packModes = {
			customModes: [
				{ slug: "alpha", name: "Alpha", roleDefinition: "Alpha role", groups: ["read"] },
				{ slug: "shared", name: "Shared", roleDefinition: "Pack role", groups: ["read"] },
			],
		}
		const existingModes = {
			customModes: [{ slug: "shared", name: "Existing", roleDefinition: "Existing role", groups: ["read"] }],
		}

		await fs.mkdir(path.join(assetsRoot, ".kilocode"), { recursive: true })
		await writeFile(path.join(assetsRoot, ".kilocodemodes"), yaml.stringify(packModes))
		await writeFile(path.join(globalKiloDir, "custom_modes.yaml"), yaml.stringify(existingModes))

		const result = await syncWorkflowAiAssets({ assetsRoot, globalKiloDir })

		expect(result.errors).toHaveLength(0)
		expect(result.mergedModes).toBe(1)

		const mergedRaw = await fs.readFile(path.join(globalKiloDir, "custom_modes.yaml"), "utf8")
		const merged = yaml.parse(mergedRaw) as { customModes: Array<{ slug: string }> }
		const slugs = merged.customModes.map((mode) => mode.slug)

		expect(slugs).toContain("alpha")
		expect(slugs).toContain("shared")
		expect(slugs.filter((slug) => slug === "shared")).toHaveLength(1)
	})
})
