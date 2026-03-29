import fs from "fs/promises"
import path from "path"
import os from "os"
import yaml from "yaml"

import { __testOnly, ensureWorkflowAiAssetsInstalled, syncWorkflowAiAssets } from "../WorkflowAssetsInstaller"

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
		await writeFile(path.join(assetsRoot, ".kilocode", "sources", "reference.md"), "# Stable Source")
		await writeFile(path.join(assetsRoot, ".kilocode", "QUICK.md"), "# QUICK")

		const result = await syncWorkflowAiAssets({ assetsRoot, globalKiloDir })

		expect(result.errors).toHaveLength(0)
		await expect(fs.readFile(path.join(globalKiloDir, "rules", "quality.md"), "utf8")).resolves.toContain(
			"Quality Rules",
		)
		await expect(fs.readFile(path.join(globalKiloDir, "workflows", "quickstart.md"), "utf8")).resolves.toContain(
			"Quickstart Workflow",
		)
		await expect(fs.readFile(path.join(globalKiloDir, "sources", "reference.md"), "utf8")).resolves.toContain(
			"Stable Source",
		)
		await expect(fs.readFile(path.join(globalKiloDir, "QUICK.md"), "utf8")).resolves.toContain("QUICK")
	})

	it("installs commands into global .kilocode/commands without deleting existing user commands", async () => {
		const assetsRoot = path.join(tempRoot, "assets")
		const globalKiloDir = path.join(tempRoot, "global")

		await writeFile(path.join(assetsRoot, ".kilocode", "rules", "quality.md"), "# Quality Rules")
		await writeFile(
			path.join(assetsRoot, ".kilocode", "commands", "init-protocol.md"),
			"---\ndescription: init\n---\n\nHello",
		)

		await writeFile(path.join(globalKiloDir, "commands", "user-custom.md"), "USER")

		const result = await syncWorkflowAiAssets({ assetsRoot, globalKiloDir })

		expect(result.errors).toHaveLength(0)
		await expect(fs.readFile(path.join(globalKiloDir, "commands", "init-protocol.md"), "utf8")).resolves.toContain(
			"Hello",
		)
		await expect(fs.readFile(path.join(globalKiloDir, "commands", "user-custom.md"), "utf8")).resolves.toBe("USER")
	})
	it("updates existing pack-managed commands while preserving user custom commands", async () => {
		const assetsRoot = path.join(tempRoot, "assets")
		const globalKiloDir = path.join(tempRoot, "global")
		const backupRoot = path.join(tempRoot, "backup")

		await writeFile(path.join(assetsRoot, ".kilocode", "rules", "quality.md"), "# Quality Rules")
		await writeFile(
			path.join(assetsRoot, ".kilocode", "commands", "init-protocol.md"),
			"---\ndescription: init\n---\n\nNEW PACK CONTENT",
		)

		await writeFile(path.join(globalKiloDir, "commands", "init-protocol.md"), "OLD PACK CONTENT")
		await writeFile(path.join(globalKiloDir, "commands", "user-custom.md"), "USER")

		const result = await syncWorkflowAiAssets({ assetsRoot, globalKiloDir, backupRoot })

		expect(result.errors).toHaveLength(0)
		expect(result.overwrittenFiles).toBeGreaterThan(0)
		await expect(fs.readFile(path.join(globalKiloDir, "commands", "init-protocol.md"), "utf8")).resolves.toContain(
			"NEW PACK CONTENT",
		)
		await expect(fs.readFile(path.join(globalKiloDir, "commands", "user-custom.md"), "utf8")).resolves.toBe("USER")
		await expect(fs.readFile(path.join(backupRoot, "commands", "init-protocol.md"), "utf8")).resolves.toBe(
			"OLD PACK CONTENT",
		)
	})

	// kilocode_change start
	it("installs init-memory-bank command with valid frontmatter and body links", async () => {
		const assetsRoot = path.join(tempRoot, "assets")
		const globalKiloDir = path.join(tempRoot, "global")

		const command = `---
description: "Workflow: initialize or repair workspace Memory Bank and continue into the artifact flow"
---

Source of Truth (workflow): [\`.kilocode/workflows/init-memory-bank.md\`](.kilocode/workflows/init-memory-bank.md:1)

Use this entrypoint when the workspace Memory Bank is missing, incomplete, or needs repair.

Recommended flow:
1. Initialize or repair workspace Memory Bank by [\`.kilocode/workflows/init-memory-bank.md\`](.kilocode/workflows/init-memory-bank.md:1)
2. Read [\`.kilocode/memory-bank/index.md\`](.kilocode/memory-bank/index.md:1) and confirm \`[MB: OK]\`
3. Prime context by [\`.kilocode/workflows/context-priming.md\`](.kilocode/workflows/context-priming.md:1)
4. Clean the task contract by [\`.kilocode/workflows/brief-refinement.md\`](.kilocode/workflows/brief-refinement.md:1)
`

		await writeFile(path.join(assetsRoot, ".kilocode", "rules", "quality.md"), "# Quality Rules")
		await writeFile(path.join(assetsRoot, ".kilocode", "commands", "init-memory-bank.md"), command)

		const result = await syncWorkflowAiAssets({ assetsRoot, globalKiloDir })

		expect(result.errors).toHaveLength(0)
		await expect(
			fs.readFile(path.join(globalKiloDir, "commands", "init-memory-bank.md"), "utf8"),
		).resolves.toContain(
			'description: "Workflow: initialize or repair workspace Memory Bank and continue into the artifact flow"',
		)
		await expect(
			fs.readFile(path.join(globalKiloDir, "commands", "init-memory-bank.md"), "utf8"),
		).resolves.toContain(".kilocode/workflows/init-memory-bank.md")
		await expect(
			fs.readFile(path.join(globalKiloDir, "commands", "init-memory-bank.md"), "utf8"),
		).resolves.toContain(".kilocode/memory-bank/index.md")
		await expect(
			fs.readFile(path.join(globalKiloDir, "commands", "init-memory-bank.md"), "utf8"),
		).resolves.toContain(".kilocode/workflows/brief-refinement.md")
	})

	it("installs new artifact-flow commands with valid frontmatter and workflow links", async () => {
		const assetsRoot = path.join(tempRoot, "assets")
		const globalKiloDir = path.join(tempRoot, "global")

		await writeFile(path.join(assetsRoot, ".kilocode", "rules", "quality.md"), "# Quality Rules")
		await writeFile(
			path.join(assetsRoot, ".kilocode", "commands", "brief-refinement.md"),
			`---\ndescription: "Workflow: refine a raw request into a clean reusable brief"\n---\n\nSource of Truth (workflow): [\`.kilocode/workflows/brief-refinement.md\`](.kilocode/workflows/brief-refinement.md:1)`,
		)
		await writeFile(
			path.join(assetsRoot, ".kilocode", "commands", "spec-plans-generation.md"),
			`---\ndescription: "Workflow: shape target-state Spec and implementation Plans from an approved brief"\n---\n\nSource of Truth (workflow): [\`.kilocode/workflows/spec-plans-generation.md\`](.kilocode/workflows/spec-plans-generation.md:1)`,
		)

		const result = await syncWorkflowAiAssets({ assetsRoot, globalKiloDir })

		expect(result.errors).toHaveLength(0)
		await expect(
			fs.readFile(path.join(globalKiloDir, "commands", "brief-refinement.md"), "utf8"),
		).resolves.toContain(".kilocode/workflows/brief-refinement.md")
		await expect(
			fs.readFile(path.join(globalKiloDir, "commands", "spec-plans-generation.md"), "utf8"),
		).resolves.toContain(".kilocode/workflows/spec-plans-generation.md")
	})

	it("migrates legacy memory-bank.md command to init-memory-bank.md when it matches the known template", async () => {
		const assetsRoot = path.join(tempRoot, "assets")
		const globalKiloDir = path.join(tempRoot, "global")
		const backupRoot = path.join(tempRoot, "backup")

		// Minimal valid pack so sync proceeds.
		await writeFile(path.join(assetsRoot, ".kilocode", "rules", "quality.md"), "# Quality")

		const legacy = `---
description: "Memory Bank entrypoints: index + usage rules"
---

Start here:
1. Memory Bank index: [\`.kilocode/memory-bank/index.md\`](.kilocode/memory-bank/index.md:1)
2. Usage rules: [\`.kilocode/rules/memory-bank-instructions.md\`](.kilocode/rules/memory-bank-instructions.md:1)

Rule of thumb: read index first and confirm \`[MB: OK]\` before starting any non-trivial task.
`

		await writeFile(path.join(globalKiloDir, "commands", "memory-bank.md"), legacy)

		const result = await syncWorkflowAiAssets({ assetsRoot, globalKiloDir, backupRoot })
		expect(result.errors).toHaveLength(0)

		await expect(fs.stat(path.join(globalKiloDir, "commands", "memory-bank.md"))).rejects.toThrow()
		await expect(
			fs.readFile(path.join(globalKiloDir, "commands", "init-memory-bank.md"), "utf8"),
		).resolves.toContain("Memory Bank entrypoints")

		await expect(fs.readFile(path.join(backupRoot, "commands", "memory-bank.md"), "utf8")).resolves.toContain(
			"Memory Bank entrypoints",
		)
	})
	// kilocode_change end

	it("installs memory-bank as templates and does not copy it into live global root", async () => {
		const assetsRoot = path.join(tempRoot, "assets")
		const globalKiloDir = path.join(tempRoot, "global")

		await writeFile(path.join(assetsRoot, ".kilocode", "memory-bank", "index.md"), "# Template Memory Bank")
		await writeFile(path.join(assetsRoot, ".kilocode", "rules", "quality.md"), "# Quality")

		const result = await syncWorkflowAiAssets({ assetsRoot, globalKiloDir })

		expect(result.errors).toHaveLength(0)
		await expect(
			fs.readFile(path.join(globalKiloDir, "workflowai", "templates", "memory-bank", "index.md"), "utf8"),
		).resolves.toBe("# Template Memory Bank")
		await expect(fs.stat(path.join(globalKiloDir, "memory-bank", "index.md"))).rejects.toThrow()
	})

	it("installs only protocol template docs and never copies live protocol folders", async () => {
		const assetsRoot = path.join(tempRoot, "assets")
		const globalKiloDir = path.join(tempRoot, "global")

		await writeFile(path.join(assetsRoot, ".kilocode", "rules", "quality.md"), "# Quality")
		await writeFile(path.join(assetsRoot, ".protocols", "README.md"), "# Protocol Template Readme")
		await writeFile(path.join(assetsRoot, ".protocols", "index.md"), "# Protocol Template Index")
		await writeFile(path.join(assetsRoot, ".protocols", "2026-03-07-live-task", "brief.md"), "LIVE")

		const result = await syncWorkflowAiAssets({ assetsRoot, globalKiloDir })

		expect(result.errors).toHaveLength(0)
		await expect(
			fs.readFile(path.join(globalKiloDir, "workflowai", "templates", "protocols", "README.md"), "utf8"),
		).resolves.toBe("# Protocol Template Readme")
		await expect(
			fs.readFile(path.join(globalKiloDir, "workflowai", "templates", "protocols", "index.md"), "utf8"),
		).resolves.toBe("# Protocol Template Index")
		await expect(
			fs.stat(
				path.join(globalKiloDir, "workflowai", "templates", "protocols", "2026-03-07-live-task", "brief.md"),
			),
		).rejects.toThrow()
	})
	it("overwrites existing destination files and deletes stale ones", async () => {
		const assetsRoot = path.join(tempRoot, "assets")
		const globalKiloDir = path.join(tempRoot, "global")
		const backupRoot = path.join(tempRoot, "backup")

		await writeFile(path.join(assetsRoot, ".kilocode", "rules", "quality.md"), "NEW CONTENT")
		await writeFile(path.join(globalKiloDir, "rules", "quality.md"), "ORIGINAL CONTENT")
		await writeFile(path.join(globalKiloDir, "rules", "stale.md"), "STALE")

		const result = await syncWorkflowAiAssets({ assetsRoot, globalKiloDir, backupRoot })

		expect(result.errors).toHaveLength(0)
		expect(result.overwrittenFiles).toBeGreaterThan(0)
		expect(result.deletedPaths).toBeGreaterThan(0)
		await expect(fs.readFile(path.join(globalKiloDir, "rules", "quality.md"), "utf8")).resolves.toBe("NEW CONTENT")
		await expect(fs.readFile(path.join(globalKiloDir, "rules", "stale.md"), "utf8")).rejects.toThrow()

		// Backup should include the previous rules directory, including stale files.
		await expect(fs.readFile(path.join(backupRoot, "rules", "quality.md"), "utf8")).resolves.toBe(
			"ORIGINAL CONTENT",
		)
		await expect(fs.readFile(path.join(backupRoot, "rules", "stale.md"), "utf8")).resolves.toBe("STALE")
	})

	it("captures backup failures when fs.cp throws", async () => {
		const assetsRoot = path.join(tempRoot, "assets")
		const globalKiloDir = path.join(tempRoot, "global")
		const backupRoot = path.join(tempRoot, "backup")

		await writeFile(path.join(assetsRoot, ".kilocode", "rules", "quality.md"), "NEW")
		await writeFile(path.join(globalKiloDir, "rules", "quality.md"), "OLD")

		const rulesDir = path.join(globalKiloDir, "rules")
		const originalCp = fs.cp.bind(fs)
		const cpSpy = vi.spyOn(fs, "cp").mockImplementation(async (src: any, dest: any, options: any) => {
			// backupExistingPath backs up managed directories (e.g. <global>\/rules) as a whole.
			if (src === rulesDir) {
				throw new Error("EIO")
			}
			return originalCp(src, dest, options)
		})

		try {
			const result = await syncWorkflowAiAssets({ assetsRoot, globalKiloDir, backupRoot })
			expect(result.errors.join("\n")).toContain("Failed to backup")
		} finally {
			cpSpy.mockRestore()
		}
	})

	it("deletes a stale managed file when the source file is removed", async () => {
		const assetsRoot = path.join(tempRoot, "assets")
		const globalKiloDir = path.join(tempRoot, "global")

		await writeFile(path.join(assetsRoot, ".kilocode", "rules", "quality.md"), "# Quality")
		// Do NOT provide QUICK.md in the pack.
		await writeFile(path.join(globalKiloDir, "QUICK.md"), "stale")

		const result = await syncWorkflowAiAssets({ assetsRoot, globalKiloDir })
		expect(result.errors).toHaveLength(0)
		expect(result.deletedPaths).toBeGreaterThan(0)
		await expect(fs.stat(path.join(globalKiloDir, "QUICK.md"))).rejects.toThrow()
	})

	it("writes WorkFlowAI modes into the managed modes file (overwrite)", async () => {
		const assetsRoot = path.join(tempRoot, "assets")
		const globalKiloDir = path.join(tempRoot, "global")

		const packModes = {
			customModes: [{ slug: "alpha", name: "Alpha", roleDefinition: "Alpha role", groups: ["read"] }],
		}

		await fs.mkdir(path.join(assetsRoot, ".kilocode"), { recursive: true })
		await writeFile(path.join(assetsRoot, ".kilocodemodes"), yaml.stringify(packModes))
		await writeFile(
			path.join(globalKiloDir, "workflowai", "managed_custom_modes.yaml"),
			yaml.stringify({ customModes: [{ slug: "old", name: "Old", roleDefinition: "Old", groups: ["read"] }] }),
		)

		const result = await syncWorkflowAiAssets({ assetsRoot, globalKiloDir })

		expect(result.errors).toHaveLength(0)

		const managedRaw = await fs.readFile(
			path.join(globalKiloDir, "workflowai", "managed_custom_modes.yaml"),
			"utf8",
		)
		const managed = yaml.parse(managedRaw) as { customModes: Array<{ slug: string }> }
		expect(managed.customModes.map((mode) => mode.slug)).toEqual(["alpha"])
	})

	it("records an error when refusing to backup a path outside globalKiloDir (relative path starts with ..)", async () => {
		const assetsRoot = path.join(tempRoot, "assets")
		const globalKiloDir = path.join(tempRoot, "global")
		const backupRoot = path.join(tempRoot, "backup")

		await writeFile(path.join(assetsRoot, ".kilocode", "rules", "quality.md"), "NEW")
		await writeFile(path.join(globalKiloDir, "rules", "quality.md"), "OLD")

		const relativeSpy = vi.spyOn(path, "relative").mockReturnValue("../escaped")
		try {
			const result = await syncWorkflowAiAssets({ assetsRoot, globalKiloDir, backupRoot })
			expect(result.errors.join("\n")).toContain("Refusing to backup path outside globalKiloDir")
		} finally {
			relativeSpy.mockRestore()
		}
	})

	it("records an error when refusing to backup a path outside globalKiloDir (relative path empty)", async () => {
		const assetsRoot = path.join(tempRoot, "assets")
		const globalKiloDir = path.join(tempRoot, "global")
		const backupRoot = path.join(tempRoot, "backup")

		await writeFile(path.join(assetsRoot, ".kilocode", "rules", "quality.md"), "NEW")
		await writeFile(path.join(globalKiloDir, "rules", "quality.md"), "OLD")

		const relativeSpy = vi.spyOn(path, "relative").mockReturnValue("")
		try {
			const result = await syncWorkflowAiAssets({ assetsRoot, globalKiloDir, backupRoot })
			expect(result.errors.join("\n")).toContain("Refusing to backup path outside globalKiloDir")
		} finally {
			relativeSpy.mockRestore()
		}
	})

	it("records an error when refusing to backup a path outside globalKiloDir (relative path is absolute)", async () => {
		const assetsRoot = path.join(tempRoot, "assets")
		const globalKiloDir = path.join(tempRoot, "global")
		const backupRoot = path.join(tempRoot, "backup")

		await writeFile(path.join(assetsRoot, ".kilocode", "rules", "quality.md"), "NEW")
		await writeFile(path.join(globalKiloDir, "rules", "quality.md"), "OLD")

		const relativeSpy = vi.spyOn(path, "relative").mockReturnValue("/abs")
		try {
			const result = await syncWorkflowAiAssets({ assetsRoot, globalKiloDir, backupRoot })
			expect(result.errors.join("\n")).toContain("Refusing to backup path outside globalKiloDir")
		} finally {
			relativeSpy.mockRestore()
		}
	})

	it("records an error when deleting a stale managed file fails", async () => {
		const assetsRoot = path.join(tempRoot, "assets")
		const globalKiloDir = path.join(tempRoot, "global")

		await writeFile(path.join(assetsRoot, ".kilocode", "rules", "quality.md"), "# Quality")
		await writeFile(
			path.join(assetsRoot, ".kilocodemodes"),
			yaml.stringify({ customModes: [{ slug: "wf", name: "WF", roleDefinition: "wf", groups: ["read"] }] }),
		)

		// QUICK.md is part of managed mappings. If the pack doesn't have it but global does, reconcileFile will try to delete it.
		const quickPath = path.join(globalKiloDir, "QUICK.md")
		await writeFile(quickPath, "stale")

		const originalRm = fs.rm.bind(fs)
		const rmSpy = vi.spyOn(fs, "rm").mockImplementation(async (p: any, options: any) => {
			if (p === quickPath) {
				throw new Error("EACCES")
			}
			return originalRm(p, options)
		})

		try {
			const result = await syncWorkflowAiAssets({ assetsRoot, globalKiloDir })
			expect(result.errors.join("\n")).toContain("Failed to delete stale file")
		} finally {
			rmSpy.mockRestore()
		}
	})

	it("records an error when copying a managed file fails", async () => {
		const assetsRoot = path.join(tempRoot, "assets")
		const globalKiloDir = path.join(tempRoot, "global")

		await writeFile(path.join(assetsRoot, ".kilocode", "rules", "quality.md"), "# Quality")
		await writeFile(path.join(assetsRoot, ".kilocode", "QUICK.md"), "# QUICK")

		const originalCopyFile = fs.copyFile.bind(fs)
		const targetDestPath = path.join(globalKiloDir, "QUICK.md")
		const copySpy = vi.spyOn(fs, "copyFile").mockImplementation(async (src: any, dest: any, flags: any) => {
			if (dest === targetDestPath) {
				throw new Error("EIO")
			}
			return originalCopyFile(src, dest, flags)
		})

		try {
			const result = await syncWorkflowAiAssets({ assetsRoot, globalKiloDir })
			expect(result.errors.join("\n")).toContain("Failed to copy")
		} finally {
			copySpy.mockRestore()
		}
	})

	it("deletes stale destination directory when the source directory is removed", async () => {
		const assetsRoot = path.join(tempRoot, "assets")
		const globalKiloDir = path.join(tempRoot, "global")

		// Provide a minimal valid pack so sync proceeds.
		await writeFile(path.join(assetsRoot, ".kilocode", "rules", "quality.md"), "# Quality")

		// Create a destination managed directory that is not present in the pack (patterns).
		await writeFile(path.join(globalKiloDir, "patterns", "stale.md"), "stale")

		const result = await syncWorkflowAiAssets({ assetsRoot, globalKiloDir })
		expect(result.errors).toHaveLength(0)
		await expect(fs.stat(path.join(globalKiloDir, "patterns"))).rejects.toThrow()
	})

	it("records an error when deleting a stale destination directory fails", async () => {
		const assetsRoot = path.join(tempRoot, "assets")
		const globalKiloDir = path.join(tempRoot, "global")

		await writeFile(path.join(assetsRoot, ".kilocode", "rules", "quality.md"), "# Quality")
		await writeFile(path.join(globalKiloDir, "patterns", "stale.md"), "stale")

		const patternsPath = path.join(globalKiloDir, "patterns")
		const originalRm = fs.rm.bind(fs)
		const rmSpy = vi.spyOn(fs, "rm").mockImplementation(async (p: any, options: any) => {
			if (p === patternsPath) {
				throw new Error("EPERM")
			}
			return originalRm(p, options)
		})

		try {
			const result = await syncWorkflowAiAssets({ assetsRoot, globalKiloDir })
			expect(result.errors.join("\n")).toContain("Failed to delete stale directory")
		} finally {
			rmSpy.mockRestore()
		}
	})

	it("stringifies non-Error failures when deleting a stale destination directory", async () => {
		const assetsRoot = path.join(tempRoot, "assets")
		const globalKiloDir = path.join(tempRoot, "global")

		await writeFile(path.join(assetsRoot, ".kilocode", "rules", "quality.md"), "# Quality")
		await writeFile(path.join(globalKiloDir, "patterns", "stale.md"), "stale")

		const patternsPath = path.join(globalKiloDir, "patterns")
		const originalRm = fs.rm.bind(fs)
		const rmSpy = vi.spyOn(fs, "rm").mockImplementation(async (p: any, options: any) => {
			if (p === patternsPath) {
				throw "EPERM" // non-Error
			}
			return originalRm(p, options)
		})

		try {
			const result = await syncWorkflowAiAssets({ assetsRoot, globalKiloDir })
			expect(result.errors.join("\n")).toContain("Failed to delete stale directory")
			expect(result.errors.join("\n")).toContain("EPERM")
		} finally {
			rmSpy.mockRestore()
		}
	})

	it("creates nested destination directories when the pack contains nested folders", async () => {
		const assetsRoot = path.join(tempRoot, "assets")
		const globalKiloDir = path.join(tempRoot, "global")

		await writeFile(path.join(assetsRoot, ".kilocode", "rules", "nested", "a.md"), "a")

		const result = await syncWorkflowAiAssets({ assetsRoot, globalKiloDir })
		expect(result.errors).toHaveLength(0)
		await expect(fs.readFile(path.join(globalKiloDir, "rules", "nested", "a.md"), "utf8")).resolves.toBe("a")
	})

	it("records an error when creating a nested destination directory fails", async () => {
		const assetsRoot = path.join(tempRoot, "assets")
		const globalKiloDir = path.join(tempRoot, "global")

		// Ensure there is at least one nested directory under a managed dir.
		await writeFile(path.join(assetsRoot, ".kilocode", "rules", "nested", "a.md"), "a")

		const nestedDestDir = path.join(globalKiloDir, "rules", "nested")
		const originalMkdir = fs.mkdir.bind(fs)
		let didThrow = false
		const mkdirSpy = vi.spyOn(fs, "mkdir").mockImplementation(async (p: any, options: any) => {
			if (!didThrow && p === nestedDestDir) {
				didThrow = true
				throw new Error("EACCES")
			}
			return originalMkdir(p, options)
		})

		try {
			const result = await syncWorkflowAiAssets({ assetsRoot, globalKiloDir })
			expect(result.errors.join("\n")).toContain("Failed to create directory")
		} finally {
			mkdirSpy.mockRestore()
		}
	})

	it("records an error when deleting a stale entry fails", async () => {
		const assetsRoot = path.join(tempRoot, "assets")
		const globalKiloDir = path.join(tempRoot, "global")

		await writeFile(path.join(assetsRoot, ".kilocode", "rules", "quality.md"), "NEW")
		await writeFile(path.join(globalKiloDir, "rules", "stale.md"), "STALE")

		const stalePath = path.join(globalKiloDir, "rules", "stale.md")
		const originalRm = fs.rm.bind(fs)
		const rmSpy = vi.spyOn(fs, "rm").mockImplementation(async (p: any, options: any) => {
			if (p === stalePath) {
				throw new Error("EPERM")
			}
			return originalRm(p, options)
		})

		try {
			const result = await syncWorkflowAiAssets({ assetsRoot, globalKiloDir })
			expect(result.errors.join("\n")).toContain("Failed to delete stale path")
		} finally {
			rmSpy.mockRestore()
		}
	})

	it("logs when backup retention pruning fails", async () => {
		const assetsRoot = path.join(tempRoot, "assets")
		const globalKiloDir = path.join(tempRoot, "global")

		await writeFile(path.join(assetsRoot, ".kilocode", "rules", "quality.md"), "# Quality")

		const backupsRoot = path.join(globalKiloDir, "workflowai", "backups")
		await fs.mkdir(backupsRoot, { recursive: true })
		const logLines: string[] = []

		const originalReaddir = fs.readdir.bind(fs)
		const readdirSpy = vi.spyOn(fs, "readdir").mockImplementation((async (p: any, options: any) => {
			if (p === backupsRoot) {
				throw new Error("EIO")
			}
			return originalReaddir(p, options)
		}) as unknown as typeof fs.readdir)

		try {
			const result = await syncWorkflowAiAssets({ assetsRoot, globalKiloDir, log: (line) => logLines.push(line) })
			expect(result.errors).toHaveLength(0)
			expect(logLines.join("\n")).toContain("Failed to prune WorkFlowAI backups")
		} finally {
			readdirSpy.mockRestore()
		}
	})

	it("stringifies non-Error backup failures", async () => {
		const assetsRoot = path.join(tempRoot, "assets")
		const globalKiloDir = path.join(tempRoot, "global")
		const backupRoot = path.join(tempRoot, "backup")

		await writeFile(path.join(assetsRoot, ".kilocode", "rules", "quality.md"), "NEW")
		await writeFile(path.join(globalKiloDir, "rules", "quality.md"), "OLD")

		const rulesDir = path.join(globalKiloDir, "rules")
		const originalCp = fs.cp.bind(fs)
		const cpSpy = vi.spyOn(fs, "cp").mockImplementation(async (src: any, dest: any, options: any) => {
			if (src === rulesDir) {
				throw "EIO" // non-Error
			}
			return originalCp(src, dest, options)
		})

		try {
			const result = await syncWorkflowAiAssets({ assetsRoot, globalKiloDir, backupRoot })
			expect(result.errors.join("\n")).toContain("Failed to backup")
			expect(result.errors.join("\n")).toContain("EIO")
		} finally {
			cpSpy.mockRestore()
		}
	})

	it("stringifies non-Error delete-stale-file failures", async () => {
		const assetsRoot = path.join(tempRoot, "assets")
		const globalKiloDir = path.join(tempRoot, "global")

		await writeFile(path.join(assetsRoot, ".kilocode", "rules", "quality.md"), "# Quality")
		await writeFile(path.join(globalKiloDir, "QUICK.md"), "stale")

		const quickPath = path.join(globalKiloDir, "QUICK.md")
		const originalRm = fs.rm.bind(fs)
		const rmSpy = vi.spyOn(fs, "rm").mockImplementation(async (p: any, options: any) => {
			if (p === quickPath) {
				throw "EPERM" // non-Error
			}
			return originalRm(p, options)
		})

		try {
			const result = await syncWorkflowAiAssets({ assetsRoot, globalKiloDir })
			expect(result.errors.join("\n")).toContain("Failed to delete stale file")
			expect(result.errors.join("\n")).toContain("EPERM")
		} finally {
			rmSpy.mockRestore()
		}
	})

	it("stringifies non-Error copy failures", async () => {
		const assetsRoot = path.join(tempRoot, "assets")
		const globalKiloDir = path.join(tempRoot, "global")

		await writeFile(path.join(assetsRoot, ".kilocode", "rules", "quality.md"), "# Quality")
		await writeFile(path.join(assetsRoot, ".kilocode", "QUICK.md"), "# QUICK")

		const destQuick = path.join(globalKiloDir, "QUICK.md")
		const originalCopyFile = fs.copyFile.bind(fs)
		const copySpy = vi.spyOn(fs, "copyFile").mockImplementation(async (src: any, dest: any, flags: any) => {
			if (dest === destQuick) {
				throw "EIO" // non-Error
			}
			return originalCopyFile(src, dest, flags)
		})

		try {
			const result = await syncWorkflowAiAssets({ assetsRoot, globalKiloDir })
			expect(result.errors.join("\n")).toContain("Failed to copy")
			expect(result.errors.join("\n")).toContain("EIO")
		} finally {
			copySpy.mockRestore()
		}
	})

	it("stringifies non-Error mkdir failures when creating nested directories", async () => {
		const assetsRoot = path.join(tempRoot, "assets")
		const globalKiloDir = path.join(tempRoot, "global")

		await writeFile(path.join(assetsRoot, ".kilocode", "rules", "nested", "a.md"), "a")

		const nestedDestDir = path.join(globalKiloDir, "rules", "nested")
		const originalMkdir = fs.mkdir.bind(fs)
		let didThrow = false
		const mkdirSpy = vi.spyOn(fs, "mkdir").mockImplementation(async (p: any, options: any) => {
			if (!didThrow && p === nestedDestDir) {
				didThrow = true
				throw "EACCES" // non-Error
			}
			return originalMkdir(p, options)
		})

		try {
			const result = await syncWorkflowAiAssets({ assetsRoot, globalKiloDir })
			expect(result.errors.join("\n")).toContain("Failed to create directory")
			expect(result.errors.join("\n")).toContain("EACCES")
		} finally {
			mkdirSpy.mockRestore()
		}
	})

	it("stringifies non-Error delete-stale-path failures", async () => {
		const assetsRoot = path.join(tempRoot, "assets")
		const globalKiloDir = path.join(tempRoot, "global")

		await writeFile(path.join(assetsRoot, ".kilocode", "rules", "quality.md"), "NEW")
		await writeFile(path.join(globalKiloDir, "rules", "stale.md"), "STALE")

		const stalePath = path.join(globalKiloDir, "rules", "stale.md")
		const originalRm = fs.rm.bind(fs)
		const rmSpy = vi.spyOn(fs, "rm").mockImplementation(async (p: any, options: any) => {
			if (p === stalePath) {
				throw "EPERM" // non-Error
			}
			return originalRm(p, options)
		})

		try {
			const result = await syncWorkflowAiAssets({ assetsRoot, globalKiloDir })
			expect(result.errors.join("\n")).toContain("Failed to delete stale path")
			expect(result.errors.join("\n")).toContain("EPERM")
		} finally {
			rmSpy.mockRestore()
		}
	})

	it("stringifies non-Error backup retention pruning failures", async () => {
		const assetsRoot = path.join(tempRoot, "assets")
		const globalKiloDir = path.join(tempRoot, "global")

		await writeFile(path.join(assetsRoot, ".kilocode", "rules", "quality.md"), "# Quality")

		const backupsRoot = path.join(globalKiloDir, "workflowai", "backups")
		await fs.mkdir(backupsRoot, { recursive: true })
		const logLines: string[] = []

		const originalReaddir = fs.readdir.bind(fs)
		const readdirSpy = vi.spyOn(fs, "readdir").mockImplementation((async (p: any, options: any) => {
			if (p === backupsRoot) {
				throw "EIO" // non-Error
			}
			return originalReaddir(p, options)
		}) as unknown as typeof fs.readdir)

		try {
			const result = await syncWorkflowAiAssets({ assetsRoot, globalKiloDir, log: (line) => logLines.push(line) })
			expect(result.errors).toHaveLength(0)
			expect(logLines.join("\n")).toContain("Failed to prune WorkFlowAI backups")
			expect(logLines.join("\n")).toContain("EIO")
		} finally {
			readdirSpy.mockRestore()
		}
	})

	it("uses default globalKiloDir when not provided", async () => {
		const assetsRoot = path.join(tempRoot, "assets")

		await writeFile(path.join(assetsRoot, ".kilocode", "rules", "quality.md"), "# Quality")
		await writeFile(
			path.join(assetsRoot, ".kilocodemodes"),
			yaml.stringify({ customModes: [{ slug: "wf", name: "WF", roleDefinition: "wf", groups: ["read"] }] }),
		)

		const homeSpy = vi.spyOn(os, "homedir").mockReturnValue(tempRoot)
		try {
			const result = await syncWorkflowAiAssets({ assetsRoot })
			expect(result.errors).toHaveLength(0)
			await expect(
				fs.readFile(path.join(tempRoot, ".kilocode", "workflowai", "managed_custom_modes.yaml"), "utf8"),
			).resolves.toContain("wf")
		} finally {
			homeSpy.mockRestore()
		}
	})
})

describe("ensureWorkflowAiAssetsInstalled", () => {
	function createMockContext() {
		const store = new Map<string, unknown>()
		return {
			context: {
				globalState: {
					get: (key: string) => store.get(key),
					update: async (key: string, value: unknown) => {
						store.set(key, value)
					},
				},
			},
			store,
		}
	}

	async function findBackupDir(backupsRoot: string, previousId: string): Promise<string | null> {
		const timestamps = await fs.readdir(backupsRoot)
		for (const ts of timestamps) {
			const candidate = path.join(backupsRoot, ts, previousId)
			try {
				const stat = await fs.stat(candidate)
				if (stat.isDirectory()) {
					return candidate
				}
			} catch {
				// ignore
			}
		}
		return null
	}

	it("uses embedded assets root by default and writes managed modes file", async () => {
		const assetsRoot = path.join(tempRoot, "assets")
		const globalKiloDir = path.join(tempRoot, "global")

		await writeFile(path.join(assetsRoot, ".kilocode", "rules", "quality.md"), "# Quality")
		await writeFile(
			path.join(assetsRoot, ".kilocodemodes"),
			yaml.stringify({ customModes: [{ slug: "wf", name: "WF", roleDefinition: "wf", groups: ["read"] }] }),
		)

		const { context } = createMockContext()
		const logLines: string[] = []

		const result = await ensureWorkflowAiAssetsInstalled({
			context,
			embeddedAssetsRoot: assetsRoot,
			globalKiloDir,
			log: (line) => logLines.push(line),
		})

		expect(result.didInstall).toBe(true)
		expect(result.selectedSource).toBe("embedded")
		expect(result.selectedAssetsRoot).toBe(assetsRoot)
		expect(result.result?.errors).toHaveLength(0)
		expect(logLines.join("\n")).toContain("Using embedded assets root")
		await expect(
			fs.readFile(path.join(globalKiloDir, "workflowai", "managed_custom_modes.yaml"), "utf8"),
		).resolves.toContain("wf")
	})

	it("uses override assets root when it is valid", async () => {
		const embeddedRoot = path.join(tempRoot, "embedded")
		const overrideRoot = path.join(tempRoot, "override")
		const globalKiloDir = path.join(tempRoot, "global")

		await writeFile(path.join(embeddedRoot, ".kilocode", "rules", "quality.md"), "# Embedded")
		await writeFile(path.join(overrideRoot, ".kilocode", "rules", "quality.md"), "# Override")
		await writeFile(
			path.join(overrideRoot, ".kilocodemodes"),
			yaml.stringify({ customModes: [{ slug: "wf-ov", name: "WF OV", roleDefinition: "wf", groups: ["read"] }] }),
		)

		const { context } = createMockContext()

		const result = await ensureWorkflowAiAssetsInstalled({
			context,
			embeddedAssetsRoot: embeddedRoot,
			overrideAssetsRoot: overrideRoot,
			globalKiloDir,
		})

		expect(result.didInstall).toBe(true)
		expect(result.selectedSource).toBe("override")
		expect(result.selectedAssetsRoot).toBe(path.resolve(overrideRoot))

		await expect(
			fs.readFile(path.join(globalKiloDir, "workflowai", "managed_custom_modes.yaml"), "utf8"),
		).resolves.toContain("wf-ov")
	})

	it("falls back to embedded assets root when override is invalid", async () => {
		const embeddedRoot = path.join(tempRoot, "embedded")
		const globalKiloDir = path.join(tempRoot, "global")
		const invalidOverride = path.join(tempRoot, "does-not-exist")

		await writeFile(path.join(embeddedRoot, ".kilocode", "rules", "quality.md"), "# Embedded")
		await writeFile(
			path.join(embeddedRoot, ".kilocodemodes"),
			yaml.stringify({ customModes: [{ slug: "wf", name: "WF", roleDefinition: "wf", groups: ["read"] }] }),
		)

		const { context } = createMockContext()
		const logLines: string[] = []

		const result = await ensureWorkflowAiAssetsInstalled({
			context,
			embeddedAssetsRoot: embeddedRoot,
			overrideAssetsRoot: invalidOverride,
			globalKiloDir,
			log: (line) => logLines.push(line),
		})

		expect(result.selectedSource).toBe("embedded")
		expect(logLines.join("\n")).toContain("Override assets root rejected")
	})

	it("rejects relative override paths and falls back to embedded", async () => {
		const embeddedRoot = path.join(tempRoot, "embedded")
		const globalKiloDir = path.join(tempRoot, "global")

		await writeFile(path.join(embeddedRoot, ".kilocode", "rules", "quality.md"), "# Embedded")
		await writeFile(
			path.join(embeddedRoot, ".kilocodemodes"),
			yaml.stringify({ customModes: [{ slug: "wf", name: "WF", roleDefinition: "wf", groups: ["read"] }] }),
		)

		const { context } = createMockContext()
		const logLines: string[] = []

		const result = await ensureWorkflowAiAssetsInstalled({
			context,
			embeddedAssetsRoot: embeddedRoot,
			overrideAssetsRoot: "relative/path/to/workflow",
			globalKiloDir,
			log: (line) => logLines.push(line),
		})

		expect(result.selectedSource).toBe("embedded")
		expect(logLines.join("\n")).toContain("path must be absolute")
	})

	it("does not throw when embedded assets root is missing and does not update install state", async () => {
		const missingRoot = path.join(tempRoot, "missing")
		const globalKiloDir = path.join(tempRoot, "global")
		const { context, store } = createMockContext()

		const result = await ensureWorkflowAiAssetsInstalled({
			context,
			embeddedAssetsRoot: missingRoot,
			globalKiloDir,
		})

		expect(result.didInstall).toBe(true)
		expect(result.selectedSource).toBe("embedded")
		expect(result.result?.errors.length).toBeGreaterThan(0)
		expect(store.get("workflowAiAssetsVersion")).toBeUndefined()
	})

	it("skips install when fingerprint and selected source are unchanged", async () => {
		const assetsRoot = path.join(tempRoot, "assets")
		const globalKiloDir = path.join(tempRoot, "global")

		await writeFile(path.join(assetsRoot, ".kilocode", "rules", "quality.md"), "# Quality")
		await writeFile(
			path.join(assetsRoot, ".kilocodemodes"),
			yaml.stringify({ customModes: [{ slug: "wf", name: "WF", roleDefinition: "wf", groups: ["read"] }] }),
		)

		const { context } = createMockContext()

		const first = await ensureWorkflowAiAssetsInstalled({
			context,
			embeddedAssetsRoot: assetsRoot,
			globalKiloDir,
		})
		expect(first.didInstall).toBe(true)

		const second = await ensureWorkflowAiAssetsInstalled({
			context,
			embeddedAssetsRoot: assetsRoot,
			globalKiloDir,
		})
		expect(second.didInstall).toBe(false)
	})

	it("skips install when fingerprint and override path are unchanged", async () => {
		const embeddedRoot = path.join(tempRoot, "embedded")
		const overrideRoot = path.join(tempRoot, "override")
		const globalKiloDir = path.join(tempRoot, "global")

		await writeFile(path.join(embeddedRoot, ".kilocode", "rules", "quality.md"), "# Embedded")
		await writeFile(path.join(overrideRoot, ".kilocode", "rules", "quality.md"), "# Override")
		await writeFile(
			path.join(overrideRoot, ".kilocodemodes"),
			yaml.stringify({ customModes: [{ slug: "wf", name: "WF", roleDefinition: "wf", groups: ["read"] }] }),
		)

		const { context } = createMockContext()

		const first = await ensureWorkflowAiAssetsInstalled({
			context,
			embeddedAssetsRoot: embeddedRoot,
			overrideAssetsRoot: overrideRoot,
			globalKiloDir,
		})
		expect(first.didInstall).toBe(true)
		expect(first.selectedSource).toBe("override")

		const second = await ensureWorkflowAiAssetsInstalled({
			context,
			embeddedAssetsRoot: embeddedRoot,
			overrideAssetsRoot: overrideRoot,
			globalKiloDir,
		})
		expect(second.didInstall).toBe(false)
	})

	it("reconciles changes on fingerprint update and creates backup", async () => {
		const assetsRoot = path.join(tempRoot, "assets")
		const globalKiloDir = path.join(tempRoot, "global")

		await writeFile(path.join(assetsRoot, ".kilocode", "rules", "quality.md"), "v1")
		await writeFile(
			path.join(assetsRoot, ".kilocodemodes"),
			yaml.stringify({ customModes: [{ slug: "wf", name: "WF", roleDefinition: "wf", groups: ["read"] }] }),
		)

		const { context, store } = createMockContext()

		const first = await ensureWorkflowAiAssetsInstalled({
			context,
			embeddedAssetsRoot: assetsRoot,
			globalKiloDir,
		})
		expect(first.didInstall).toBe(true)
		await expect(fs.readFile(path.join(globalKiloDir, "rules", "quality.md"), "utf8")).resolves.toBe("v1")

		// Create a stale file in a managed directory.
		await writeFile(path.join(globalKiloDir, "rules", "stale.md"), "stale")

		// Update pack content so fingerprint changes.
		await writeFile(path.join(assetsRoot, ".kilocode", "rules", "quality.md"), "v2")

		const firstState = store.get("workflowAiAssetsVersion") as any
		const previousFingerprint = typeof firstState?.fingerprint === "string" ? firstState.fingerprint : ""
		expect(previousFingerprint).not.toBe("")

		const second = await ensureWorkflowAiAssetsInstalled({
			context,
			embeddedAssetsRoot: assetsRoot,
			globalKiloDir,
		})

		expect(second.didInstall).toBe(true)
		expect(second.result?.errors).toHaveLength(0)
		await expect(fs.readFile(path.join(globalKiloDir, "rules", "quality.md"), "utf8")).resolves.toBe("v2")
		await expect(fs.readFile(path.join(globalKiloDir, "rules", "stale.md"), "utf8")).rejects.toThrow()

		// Backup should contain the previous fingerprint snapshot.
		const backupsRoot = path.join(globalKiloDir, "workflowai", "backups")
		const backupDir = await findBackupDir(backupsRoot, previousFingerprint)
		expect(backupDir).not.toBeNull()
		await expect(fs.readFile(path.join(backupDir as string, "rules", "quality.md"), "utf8")).resolves.toBe("v1")
		await expect(fs.readFile(path.join(backupDir as string, "rules", "stale.md"), "utf8")).resolves.toBe("stale")
	})

	it("installs even when override root changes but fingerprint stays the same (selectionChanged)", async () => {
		const embeddedRoot = path.join(tempRoot, "embedded")
		const overrideA = path.join(tempRoot, "override-a")
		const overrideB = path.join(tempRoot, "override-b")
		const globalKiloDir = path.join(tempRoot, "global")

		await writeFile(path.join(embeddedRoot, ".kilocode", "rules", "quality.md"), "# Embedded")

		for (const overrideRoot of [overrideA, overrideB]) {
			await writeFile(path.join(overrideRoot, ".kilocode", "rules", "quality.md"), "# Same")
			await writeFile(
				path.join(overrideRoot, ".kilocodemodes"),
				yaml.stringify({ customModes: [{ slug: "wf", name: "WF", roleDefinition: "wf", groups: ["read"] }] }),
			)
		}

		const { context } = createMockContext()

		const first = await ensureWorkflowAiAssetsInstalled({
			context,
			embeddedAssetsRoot: embeddedRoot,
			overrideAssetsRoot: overrideA,
			globalKiloDir,
		})
		expect(first.didInstall).toBe(true)
		expect(first.selectedSource).toBe("override")

		const second = await ensureWorkflowAiAssetsInstalled({
			context,
			embeddedAssetsRoot: embeddedRoot,
			overrideAssetsRoot: overrideB,
			globalKiloDir,
		})
		expect(second.didInstall).toBe(true)
		expect(second.selectedSource).toBe("override")
	})

	it("uses version-based backup folder name when previous install state is a legacy string", async () => {
		const assetsRoot = path.join(tempRoot, "assets")
		const globalKiloDir = path.join(tempRoot, "global")
		const { context, store } = createMockContext()

		store.set("workflowAiAssetsVersion", "2026-02-09")

		await writeFile(path.join(assetsRoot, ".kilocode", "rules", "quality.md"), "# Quality")
		await writeFile(
			path.join(assetsRoot, ".kilocodemodes"),
			yaml.stringify({ customModes: [{ slug: "wf", name: "WF", roleDefinition: "wf", groups: ["read"] }] }),
		)

		const result = await ensureWorkflowAiAssetsInstalled({
			context,
			embeddedAssetsRoot: assetsRoot,
			globalKiloDir,
		})

		expect(result.didInstall).toBe(true)
		expect(result.result?.errors).toHaveLength(0)

		const backupsRoot = path.join(globalKiloDir, "workflowai", "backups")
		const backupDir = await findBackupDir(backupsRoot, "version-2026-02-09")
		expect(backupDir).not.toBeNull()
	})

	it("uses version-based backup folder name when previous install state is the legacy object shape", async () => {
		const assetsRoot = path.join(tempRoot, "assets")
		const globalKiloDir = path.join(tempRoot, "global")
		const { context, store } = createMockContext()

		store.set("workflowAiAssetsVersion", { version: "old", source: "embedded" })

		await writeFile(path.join(assetsRoot, ".kilocode", "rules", "quality.md"), "# Quality")
		await writeFile(
			path.join(assetsRoot, ".kilocodemodes"),
			yaml.stringify({ customModes: [{ slug: "wf", name: "WF", roleDefinition: "wf", groups: ["read"] }] }),
		)

		const result = await ensureWorkflowAiAssetsInstalled({
			context,
			embeddedAssetsRoot: assetsRoot,
			globalKiloDir,
		})

		expect(result.didInstall).toBe(true)
		expect(result.result?.errors).toHaveLength(0)

		const backupsRoot = path.join(globalKiloDir, "workflowai", "backups")
		const backupDir = await findBackupDir(backupsRoot, "version-old")
		expect(backupDir).not.toBeNull()
	})

	it("treats v2 state with wrong algorithm as legacy and uses untracked backup id", async () => {
		const assetsRoot = path.join(tempRoot, "assets")
		const globalKiloDir = path.join(tempRoot, "global")
		const { context, store } = createMockContext()

		store.set("workflowAiAssetsVersion", {
			fingerprint: "abc",
			algorithm: "md5",
			source: "embedded",
		})

		await writeFile(path.join(assetsRoot, ".kilocode", "rules", "quality.md"), "# Quality")
		await writeFile(
			path.join(assetsRoot, ".kilocodemodes"),
			yaml.stringify({ customModes: [{ slug: "wf", name: "WF", roleDefinition: "wf", groups: ["read"] }] }),
		)

		const result = await ensureWorkflowAiAssetsInstalled({
			context,
			embeddedAssetsRoot: assetsRoot,
			globalKiloDir,
		})
		expect(result.didInstall).toBe(true)
		expect(result.result?.errors).toHaveLength(0)

		const backupsRoot = path.join(globalKiloDir, "workflowai", "backups")
		const backupDir = await findBackupDir(backupsRoot, "untracked")
		expect(backupDir).not.toBeNull()
	})

	it("treats v2 state with non-string overridePath as legacy and uses untracked backup id", async () => {
		const assetsRoot = path.join(tempRoot, "assets")
		const globalKiloDir = path.join(tempRoot, "global")
		const { context, store } = createMockContext()

		store.set("workflowAiAssetsVersion", {
			fingerprint: "abc",
			algorithm: "sha256",
			source: "override",
			overridePath: 123,
		})

		// Ensure there is something to back up so the backup folder is created.
		await writeFile(path.join(globalKiloDir, "rules", "quality.md"), "previous")

		await writeFile(path.join(assetsRoot, ".kilocode", "rules", "quality.md"), "next")
		await writeFile(
			path.join(assetsRoot, ".kilocodemodes"),
			yaml.stringify({ customModes: [{ slug: "wf", name: "WF", roleDefinition: "wf", groups: ["read"] }] }),
		)

		const result = await ensureWorkflowAiAssetsInstalled({
			context,
			embeddedAssetsRoot: assetsRoot,
			globalKiloDir,
		})
		expect(result.didInstall).toBe(true)
		expect(result.result?.errors).toHaveLength(0)

		const backupsRoot = path.join(globalKiloDir, "workflowai", "backups")
		const backupDir = await findBackupDir(backupsRoot, "untracked")
		expect(backupDir).not.toBeNull()
	})

	it("treats non-object previous install state as none and still reconciles", async () => {
		const assetsRoot = path.join(tempRoot, "assets")
		const globalKiloDir = path.join(tempRoot, "global")
		const { context, store } = createMockContext()

		store.set("workflowAiAssetsVersion", 123)

		// Ensure there is something to back up under managed paths.
		await writeFile(path.join(globalKiloDir, "rules", "quality.md"), "previous")

		await writeFile(path.join(assetsRoot, ".kilocode", "rules", "quality.md"), "next")
		await writeFile(
			path.join(assetsRoot, ".kilocodemodes"),
			yaml.stringify({ customModes: [{ slug: "wf", name: "WF", roleDefinition: "wf", groups: ["read"] }] }),
		)

		const result = await ensureWorkflowAiAssetsInstalled({
			context,
			embeddedAssetsRoot: assetsRoot,
			globalKiloDir,
		})
		expect(result.didInstall).toBe(true)
		expect(result.result?.errors).toHaveLength(0)

		await expect(fs.readFile(path.join(globalKiloDir, "rules", "quality.md"), "utf8")).resolves.toBe("next")

		const backupsRoot = path.join(globalKiloDir, "workflowai", "backups")
		const backupDir = await findBackupDir(backupsRoot, "untracked")
		expect(backupDir).not.toBeNull()
		await expect(fs.readFile(path.join(backupDir as string, "rules", "quality.md"), "utf8")).resolves.toBe(
			"previous",
		)
	})

	it("treats unknown object previous install state as none and still reconciles", async () => {
		const assetsRoot = path.join(tempRoot, "assets")
		const globalKiloDir = path.join(tempRoot, "global")
		const { context, store } = createMockContext()

		store.set("workflowAiAssetsVersion", { foo: "bar" })

		await writeFile(path.join(globalKiloDir, "rules", "quality.md"), "previous")
		await writeFile(path.join(assetsRoot, ".kilocode", "rules", "quality.md"), "next")
		await writeFile(
			path.join(assetsRoot, ".kilocodemodes"),
			yaml.stringify({ customModes: [{ slug: "wf", name: "WF", roleDefinition: "wf", groups: ["read"] }] }),
		)

		const result = await ensureWorkflowAiAssetsInstalled({
			context,
			embeddedAssetsRoot: assetsRoot,
			globalKiloDir,
		})
		expect(result.didInstall).toBe(true)
		expect(result.result?.errors).toHaveLength(0)

		const backupsRoot = path.join(globalKiloDir, "workflowai", "backups")
		const backupDir = await findBackupDir(backupsRoot, "untracked")
		expect(backupDir).not.toBeNull()
	})

	it("uses embedded pack manifest fingerprint when present", async () => {
		const assetsRoot = path.join(tempRoot, "assets")
		const globalKiloDir = path.join(tempRoot, "global")

		await writeFile(path.join(assetsRoot, ".kilocode", "rules", "quality.md"), "# Quality")
		await writeFile(
			path.join(assetsRoot, ".kilocodemodes"),
			yaml.stringify({ customModes: [{ slug: "wf", name: "WF", roleDefinition: "wf", groups: ["read"] }] }),
		)
		await writeFile(
			path.join(assetsRoot, ".kilocode", "embedded-pack.manifest.json"),
			JSON.stringify({ fingerprint: "manifest-fp", algorithm: "sha256", fileCount: 123 }),
		)

		const { context, store } = createMockContext()
		const logLines: string[] = []

		const result = await ensureWorkflowAiAssetsInstalled({
			context,
			embeddedAssetsRoot: assetsRoot,
			globalKiloDir,
			log: (line) => logLines.push(line),
		})

		expect(result.didInstall).toBe(true)
		expect(result.result?.errors).toHaveLength(0)
		expect(logLines.join("\n")).toContain("Pack fingerprint")
		expect(logLines.join("\n")).toContain("manifest")

		const nextState = store.get("workflowAiAssetsVersion") as any
		expect(nextState?.fingerprint).toBe("manifest-fp")
	})

	it("logs non-Error manifest read failures and falls back to computed fingerprint", async () => {
		const assetsRoot = path.join(tempRoot, "assets")
		const globalKiloDir = path.join(tempRoot, "global")

		await writeFile(path.join(assetsRoot, ".kilocode", "rules", "quality.md"), "# Quality")
		await writeFile(
			path.join(assetsRoot, ".kilocodemodes"),
			yaml.stringify({ customModes: [{ slug: "wf", name: "WF", roleDefinition: "wf", groups: ["read"] }] }),
		)
		const manifestPath = path.join(assetsRoot, ".kilocode", "embedded-pack.manifest.json")
		await writeFile(manifestPath, "{}")

		const originalReadFile = fs.readFile.bind(fs)
		const readSpy = vi.spyOn(fs, "readFile").mockImplementation(async (p: any, options: any) => {
			if (p === manifestPath) {
				throw "EIO" // non-Error
			}
			return originalReadFile(p, options)
		})

		try {
			const { context } = createMockContext()
			const logLines: string[] = []
			const result = await ensureWorkflowAiAssetsInstalled({
				context,
				embeddedAssetsRoot: assetsRoot,
				globalKiloDir,
				log: (line) => logLines.push(line),
			})
			expect(result.result?.errors).toHaveLength(0)
			expect(logLines.join("\n")).toContain("Failed to read embedded pack manifest")
			expect(logLines.join("\n")).toContain("EIO")
			expect(logLines.join("\n")).toContain("computed")
		} finally {
			readSpy.mockRestore()
		}
	})

	it("uses manifest fingerprint even when fileCount is missing", async () => {
		const assetsRoot = path.join(tempRoot, "assets")
		const globalKiloDir = path.join(tempRoot, "global")

		await writeFile(path.join(assetsRoot, ".kilocode", "rules", "quality.md"), "# Quality")
		await writeFile(
			path.join(assetsRoot, ".kilocodemodes"),
			yaml.stringify({ customModes: [{ slug: "wf", name: "WF", roleDefinition: "wf", groups: ["read"] }] }),
		)
		await writeFile(
			path.join(assetsRoot, ".kilocode", "embedded-pack.manifest.json"),
			JSON.stringify({ fingerprint: "fp-no-count" }),
		)

		const { context, store } = createMockContext()
		const result = await ensureWorkflowAiAssetsInstalled({ context, embeddedAssetsRoot: assetsRoot, globalKiloDir })
		expect(result.result?.errors).toHaveLength(0)
		const nextState = store.get("workflowAiAssetsVersion") as any
		expect(nextState?.fingerprint).toBe("fp-no-count")
	})

	it("computes embeddedAssetsRoot default when omitted (even if override is selected)", async () => {
		const overrideRoot = path.join(tempRoot, "override")
		const globalKiloDir = path.join(tempRoot, "global")

		await writeFile(path.join(overrideRoot, ".kilocode", "rules", "quality.md"), "# Override")
		await writeFile(
			path.join(overrideRoot, ".kilocodemodes"),
			yaml.stringify({ customModes: [{ slug: "wf", name: "WF", roleDefinition: "wf", groups: ["read"] }] }),
		)

		const { context } = createMockContext()
		const result = await ensureWorkflowAiAssetsInstalled({
			context,
			overrideAssetsRoot: overrideRoot,
			globalKiloDir,
		})

		expect(result.selectedSource).toBe("override")
	})

	it("uses default globalKiloDir when not provided", async () => {
		const embeddedRoot = path.join(tempRoot, "embedded")
		await writeFile(path.join(embeddedRoot, ".kilocode", "rules", "quality.md"), "# Embedded")
		await writeFile(
			path.join(embeddedRoot, ".kilocodemodes"),
			yaml.stringify({ customModes: [{ slug: "wf", name: "WF", roleDefinition: "wf", groups: ["read"] }] }),
		)

		const { context } = createMockContext()
		const homeSpy = vi.spyOn(os, "homedir").mockReturnValue(tempRoot)
		try {
			const result = await ensureWorkflowAiAssetsInstalled({ context, embeddedAssetsRoot: embeddedRoot })
			expect(result.result?.errors).toHaveLength(0)
			await expect(
				fs.readFile(path.join(tempRoot, ".kilocode", "workflowai", "managed_custom_modes.yaml"), "utf8"),
			).resolves.toContain("wf")
		} finally {
			homeSpy.mockRestore()
		}
	})

	it("treats legacy previous state as selectionChanged when selecting override", async () => {
		const embeddedRoot = path.join(tempRoot, "embedded")
		const overrideRoot = path.join(tempRoot, "override")
		const globalKiloDir = path.join(tempRoot, "global")

		await writeFile(path.join(embeddedRoot, ".kilocode", "rules", "quality.md"), "# Embedded")
		await writeFile(path.join(overrideRoot, ".kilocode", "rules", "quality.md"), "# Override")
		await writeFile(
			path.join(overrideRoot, ".kilocodemodes"),
			yaml.stringify({ customModes: [{ slug: "wf", name: "WF", roleDefinition: "wf", groups: ["read"] }] }),
		)

		const { context, store } = createMockContext()
		store.set("workflowAiAssetsVersion", "2026-02-09")

		const result = await ensureWorkflowAiAssetsInstalled({
			context,
			embeddedAssetsRoot: embeddedRoot,
			overrideAssetsRoot: overrideRoot,
			globalKiloDir,
		})

		expect(result.didInstall).toBe(true)
		expect(result.selectedSource).toBe("override")
	})

	it("falls back to computed fingerprint when manifest is invalid JSON and logs the failure", async () => {
		const assetsRoot = path.join(tempRoot, "assets")
		const globalKiloDir = path.join(tempRoot, "global")

		await writeFile(path.join(assetsRoot, ".kilocode", "rules", "quality.md"), "# Quality")
		await writeFile(
			path.join(assetsRoot, ".kilocodemodes"),
			yaml.stringify({ customModes: [{ slug: "wf", name: "WF", roleDefinition: "wf", groups: ["read"] }] }),
		)
		await writeFile(path.join(assetsRoot, ".kilocode", "embedded-pack.manifest.json"), "{not-json")

		const { context } = createMockContext()
		const logLines: string[] = []

		const result = await ensureWorkflowAiAssetsInstalled({
			context,
			embeddedAssetsRoot: assetsRoot,
			globalKiloDir,
			log: (line) => logLines.push(line),
		})

		expect(result.didInstall).toBe(true)
		expect(result.result?.errors).toHaveLength(0)
		expect(logLines.join("\n")).toContain("Failed to read embedded pack manifest")
		expect(logLines.join("\n")).toContain("computed")
	})

	it("falls back to computed fingerprint when manifest has an empty fingerprint", async () => {
		const assetsRoot = path.join(tempRoot, "assets")
		const globalKiloDir = path.join(tempRoot, "global")

		await writeFile(path.join(assetsRoot, ".kilocode", "rules", "quality.md"), "# Quality")
		await writeFile(
			path.join(assetsRoot, ".kilocodemodes"),
			yaml.stringify({ customModes: [{ slug: "wf", name: "WF", roleDefinition: "wf", groups: ["read"] }] }),
		)
		await writeFile(
			path.join(assetsRoot, ".kilocode", "embedded-pack.manifest.json"),
			JSON.stringify({ fingerprint: "   " }),
		)

		const { context } = createMockContext()
		const logLines: string[] = []

		const result = await ensureWorkflowAiAssetsInstalled({
			context,
			embeddedAssetsRoot: assetsRoot,
			globalKiloDir,
			log: (line) => logLines.push(line),
		})

		expect(result.didInstall).toBe(true)
		expect(result.result?.errors).toHaveLength(0)
		expect(logLines.join("\n")).toContain("computed")
		// No JSON parse failure should be logged.
		expect(logLines.join("\n")).not.toContain("Failed to read embedded pack manifest")
	})

	it("rejects override with reason 'empty path' when normalizeOverridePath returns whitespace", async () => {
		const embeddedRoot = path.join(tempRoot, "embedded")
		const globalKiloDir = path.join(tempRoot, "global")

		await writeFile(path.join(embeddedRoot, ".kilocode", "rules", "quality.md"), "# Embedded")
		await writeFile(
			path.join(embeddedRoot, ".kilocodemodes"),
			yaml.stringify({ customModes: [{ slug: "wf", name: "WF", roleDefinition: "wf", groups: ["read"] }] }),
		)

		const homeSpy = vi.spyOn(os, "homedir").mockReturnValue(" ")
		try {
			const { context } = createMockContext()
			const logLines: string[] = []
			const result = await ensureWorkflowAiAssetsInstalled({
				context,
				embeddedAssetsRoot: embeddedRoot,
				overrideAssetsRoot: "~",
				globalKiloDir,
				log: (line) => logLines.push(line),
			})
			expect(result.selectedSource).toBe("embedded")
			expect(logLines.join("\n")).toContain("empty path")
		} finally {
			homeSpy.mockRestore()
		}
	})

	it("rejects override with reason 'path must be absolute' when HOME is relative", async () => {
		const embeddedRoot = path.join(tempRoot, "embedded")
		const globalKiloDir = path.join(tempRoot, "global")

		await writeFile(path.join(embeddedRoot, ".kilocode", "rules", "quality.md"), "# Embedded")
		await writeFile(
			path.join(embeddedRoot, ".kilocodemodes"),
			yaml.stringify({ customModes: [{ slug: "wf", name: "WF", roleDefinition: "wf", groups: ["read"] }] }),
		)

		const homeSpy = vi.spyOn(os, "homedir").mockReturnValue("relative-home")
		try {
			const { context } = createMockContext()
			const logLines: string[] = []
			const result = await ensureWorkflowAiAssetsInstalled({
				context,
				embeddedAssetsRoot: embeddedRoot,
				overrideAssetsRoot: "~",
				globalKiloDir,
				log: (line) => logLines.push(line),
			})
			expect(result.selectedSource).toBe("embedded")
			expect(logLines.join("\n")).toContain("path must be absolute")
		} finally {
			homeSpy.mockRestore()
		}
	})

	it("rejects override with reason 'missing .kilocode directory'", async () => {
		const embeddedRoot = path.join(tempRoot, "embedded")
		const overrideRoot = path.join(tempRoot, "override")
		const globalKiloDir = path.join(tempRoot, "global")

		await writeFile(path.join(embeddedRoot, ".kilocode", "rules", "quality.md"), "# Embedded")
		await writeFile(
			path.join(embeddedRoot, ".kilocodemodes"),
			yaml.stringify({ customModes: [{ slug: "wf", name: "WF", roleDefinition: "wf", groups: ["read"] }] }),
		)
		await fs.mkdir(overrideRoot, { recursive: true })

		const { context } = createMockContext()
		const logLines: string[] = []
		const result = await ensureWorkflowAiAssetsInstalled({
			context,
			embeddedAssetsRoot: embeddedRoot,
			overrideAssetsRoot: overrideRoot,
			globalKiloDir,
			log: (line) => logLines.push(line),
		})

		expect(result.selectedSource).toBe("embedded")
		expect(logLines.join("\n")).toContain("missing .kilocode directory")
	})

	it("covers pathExists handling for unknown stat errors", async () => {
		const assetsRoot = path.join(tempRoot, "assets")
		const globalKiloDir = path.join(tempRoot, "global")

		await writeFile(path.join(assetsRoot, ".kilocode", "rules", "quality.md"), "# Quality")
		await writeFile(
			path.join(assetsRoot, ".kilocodemodes"),
			yaml.stringify({ customModes: [{ slug: "wf", name: "WF", roleDefinition: "wf", groups: ["read"] }] }),
		)

		const originalStat = fs.stat.bind(fs)
		const statSpy = vi.spyOn(fs, "stat").mockImplementation(async (filePath: any) => {
			if (filePath === assetsRoot) {
				throw new Error("boom")
			}
			return originalStat(filePath)
		})

		try {
			const { context } = createMockContext()
			const result = await ensureWorkflowAiAssetsInstalled({
				context,
				embeddedAssetsRoot: assetsRoot,
				globalKiloDir,
			})
			expect(result.didInstall).toBe(true)
			expect(result.result?.errors).toHaveLength(0)
		} finally {
			statSpy.mockRestore()
		}
	})

	it("normalizes overrideAssetsRoot '~' to the HOME directory", async () => {
		const embeddedRoot = path.join(tempRoot, "embedded")
		const globalKiloDir = path.join(tempRoot, "global")
		const homeSpy = vi.spyOn(os, "homedir").mockReturnValue(tempRoot) // kilocode_change

		try {
			// Embedded exists but override should be selected.
			await writeFile(path.join(embeddedRoot, ".kilocode", "rules", "quality.md"), "# Embedded")

			// Override pack lives in HOME (tempRoot).
			await writeFile(path.join(tempRoot, ".kilocode", "rules", "quality.md"), "# Override")
			await writeFile(
				path.join(tempRoot, ".kilocodemodes"),
				yaml.stringify({ customModes: [{ slug: "wf", name: "WF", roleDefinition: "wf", groups: ["read"] }] }),
			)

			const { context } = createMockContext()
			const result = await ensureWorkflowAiAssetsInstalled({
				context,
				embeddedAssetsRoot: embeddedRoot,
				overrideAssetsRoot: "~",
				globalKiloDir,
			})

			expect(result.selectedSource).toBe("override")
			expect(path.normalize(result.selectedAssetsRoot)).toBe(path.normalize(tempRoot))
		} finally {
			homeSpy.mockRestore()
		}
	})

	it("normalizes overrideAssetsRoot '~/subdir' relative to HOME", async () => {
		const embeddedRoot = path.join(tempRoot, "embedded")
		const overrideRoot = path.join(tempRoot, "override")
		const globalKiloDir = path.join(tempRoot, "global")
		const homeSpy = vi.spyOn(os, "homedir").mockReturnValue(tempRoot) // kilocode_change

		try {
			await writeFile(path.join(embeddedRoot, ".kilocode", "rules", "quality.md"), "# Embedded")
			await writeFile(path.join(overrideRoot, ".kilocode", "rules", "quality.md"), "# Override")
			await writeFile(
				path.join(overrideRoot, ".kilocodemodes"),
				yaml.stringify({ customModes: [{ slug: "wf", name: "WF", roleDefinition: "wf", groups: ["read"] }] }),
			)

			const { context } = createMockContext()
			const result = await ensureWorkflowAiAssetsInstalled({
				context,
				embeddedAssetsRoot: embeddedRoot,
				overrideAssetsRoot: "~/override",
				globalKiloDir,
			})

			expect(result.selectedSource).toBe("override")
			expect(path.normalize(result.selectedAssetsRoot)).toBe(path.normalize(overrideRoot))
		} finally {
			homeSpy.mockRestore()
		}
	})

	describe("parsePreviousInstallState (test-only)", () => {
		it("returns null for empty raw values", () => {
			expect(__testOnly.parsePreviousInstallState(undefined)).toBeNull()
			expect(__testOnly.parsePreviousInstallState(null)).toBeNull()
		})

		it("maps legacy string to embedded v1 state", () => {
			expect(__testOnly.parsePreviousInstallState("2026-02-09")).toEqual({
				version: "2026-02-09",
				source: "embedded",
			})
		})

		it("returns null for non-object legacy values", () => {
			expect(__testOnly.parsePreviousInstallState(123)).toBeNull()
		})

		it("accepts override source with string overridePath", () => {
			expect(
				__testOnly.parsePreviousInstallState({ version: "v1", source: "override", overridePath: "/tmp" }),
			).toEqual({ version: "v1", source: "override", overridePath: "/tmp" })
		})
	})

	it("covers pathExists ENOTDIR handling during fingerprint scan", async () => {
		const assetsRoot = path.join(tempRoot, "assets")
		const globalKiloDir = path.join(tempRoot, "global")

		await writeFile(path.join(assetsRoot, ".kilocode", "rules", "quality.md"), "# Quality")
		await writeFile(
			path.join(assetsRoot, ".kilocodemodes"),
			yaml.stringify({ customModes: [{ slug: "wf", name: "WF", roleDefinition: "wf", groups: ["read"] }] }),
		)

		const originalStat = fs.stat.bind(fs)
		const statSpy = vi.spyOn(fs, "stat").mockImplementation(async (filePath: any) => {
			if (filePath === assetsRoot) {
				const err: any = new Error("ENOTDIR")
				err.code = "ENOTDIR"
				throw err
			}
			return originalStat(filePath)
		})

		try {
			const { context } = createMockContext()
			const result = await ensureWorkflowAiAssetsInstalled({
				context,
				embeddedAssetsRoot: assetsRoot,
				globalKiloDir,
			})
			expect(result.didInstall).toBe(true)
			expect(result.result?.errors).toHaveLength(0)
		} finally {
			statSpy.mockRestore()
		}
	})

	it("covers listTree guard when stack.pop() returns undefined", async () => {
		const assetsRoot = path.join(tempRoot, "assets")
		const globalKiloDir = path.join(tempRoot, "global")

		await writeFile(path.join(assetsRoot, ".kilocode", "rules", "quality.md"), "# Quality")
		await writeFile(
			path.join(assetsRoot, ".kilocodemodes"),
			yaml.stringify({ customModes: [{ slug: "wf", name: "WF", roleDefinition: "wf", groups: ["read"] }] }),
		)

		const originalPop = Array.prototype.pop
		let didReturnUndefined = false

		Array.prototype.pop = function (...args: any[]) {
			const value = originalPop.apply(this, args as any)
			if (
				!didReturnUndefined &&
				value &&
				typeof value === "object" &&
				"absolutePath" in value &&
				"relativePath" in value
			) {
				didReturnUndefined = true
				return undefined
			}
			return value
		}

		try {
			const { context } = createMockContext()
			const result = await ensureWorkflowAiAssetsInstalled({
				context,
				embeddedAssetsRoot: assetsRoot,
				globalKiloDir,
			})
			expect(result.didInstall).toBe(true)
			expect(result.result?.errors).toHaveLength(0)
			expect(didReturnUndefined).toBe(true)
		} finally {
			Array.prototype.pop = originalPop
		}
	})

	it("prunes backup retention to the last 5 timestamps", async () => {
		vi.useFakeTimers()
		vi.setSystemTime(new Date("2026-02-10T00:00:00.000Z"))
		try {
			const assetsRoot = path.join(tempRoot, "assets")
			const globalKiloDir = path.join(tempRoot, "global")

			await writeFile(path.join(assetsRoot, ".kilocode", "rules", "quality.md"), "# Quality")
			await writeFile(
				path.join(assetsRoot, ".kilocodemodes"),
				yaml.stringify({ customModes: [{ slug: "wf", name: "WF", roleDefinition: "wf", groups: ["read"] }] }),
			)

			const backupsRoot = path.join(globalKiloDir, "workflowai", "backups")
			// Pre-create 6 old timestamps; after install adds 1 more, prune should keep only 5.
			for (const ts of [
				"2026-02-01T00-00-00-000Z",
				"2026-02-02T00-00-00-000Z",
				"2026-02-03T00-00-00-000Z",
				"2026-02-04T00-00-00-000Z",
				"2026-02-05T00-00-00-000Z",
				"2026-02-06T00-00-00-000Z",
			]) {
				await fs.mkdir(path.join(backupsRoot, ts), { recursive: true })
			}

			const { context } = createMockContext()
			const result = await ensureWorkflowAiAssetsInstalled({
				context,
				embeddedAssetsRoot: assetsRoot,
				globalKiloDir,
			})
			expect(result.result?.errors).toHaveLength(0)

			const remaining = await fs.readdir(backupsRoot)
			expect(remaining).toHaveLength(5)
		} finally {
			vi.useRealTimers()
		}
	})
})
