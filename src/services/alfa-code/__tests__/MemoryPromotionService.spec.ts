import * as fs from "fs/promises"
import * as os from "os"
import * as path from "path"

import { afterEach, beforeEach, describe, expect, it } from "vitest"

import { MemoryPromotionService } from "../MemoryPromotionService"

describe("MemoryPromotionService", () => {
	let workspacePath: string
	let service: MemoryPromotionService

	beforeEach(async () => {
		workspacePath = await fs.mkdtemp(path.join(os.tmpdir(), "memory-promotion-"))
		await fs.mkdir(path.join(workspacePath, ".kilocode", "memory-bank"), { recursive: true })
		await fs.writeFile(
			path.join(workspacePath, ".kilocode", "memory-bank", "context.md"),
			"# Context\n\n## What changed\n\n- Existing project context.\n",
			"utf8",
		)
		service = new MemoryPromotionService({ now: () => new Date("2026-04-09T10:00:00.000Z") })
	})

	afterEach(async () => {
		await fs.rm(workspacePath, { recursive: true, force: true })
	})

	it("promotes an evidence-backed structured summary into context and artifact storage", async () => {
		const result = await service.promoteFromStructuredDelegation({
			taskId: "child-1",
			parentTaskId: "parent-1",
			workspacePath,
			summary:
				"- Updated `src/core/orchestration/subagents/SubagentCoordinator.ts` to record evaluator verdicts.\n- Added regression coverage in `src/core/orchestration/subagents/SubagentCoordinator.spec.ts` with cited files.",
			evaluatorVerdict: "pass",
			acceptanceCriteria: ["record evaluator verdicts", "cite files"],
			inputs: [{ kind: "workflow", ref: ".kilocode/workflows/agent-orchestration.md" }],
			evidenceNeeded: true,
			taskIntent: "implementation",
			retrievalMode: "hybrid",
		})

		expect(result.status).toBe("promoted")
		expect(result.reason).toBe("promoted")
		expect(result.artifactPath).toContain(path.join(".kilocode", "evidence", "2026-04-09-memory-promotion"))

		const context = await fs.readFile(path.join(workspacePath, ".kilocode", "memory-bank", "context.md"), "utf8")
		expect(context).toContain("AUTO_PROMOTED_MEMORY_START")
		expect(context).toContain("Runtime-обновление для task `child-1` (2026-04-09)")
		expect(context).toContain("Источник: `.kilocode/evidence/2026-04-09-memory-promotion/task-child-1.md`")

		const artifact = await fs.readFile(result.artifactPath!, "utf8")
		expect(artifact).toContain("source_task_id: `child-1`")
		expect(artifact).toContain("`src/core/orchestration/subagents/SubagentCoordinator.ts`")
		expect(artifact).toContain(".kilocode/workflows/agent-orchestration.md")
	})

	it("rejects promotion when acceptance criteria are present but evaluator pass is missing", async () => {
		const result = await service.promoteFromStructuredDelegation({
			taskId: "child-2",
			workspacePath,
			summary: "Updated `src/app.ts` and added `src/app.spec.ts` with cited evidence.",
			acceptanceCriteria: ["cite files"],
		})

		expect(result).toEqual({
			status: "rejected",
			reason: "acceptance_unverified",
		})
	})

	it("rejects russian speculative summaries at the truth boundary", async () => {
		const result = await service.promoteFromStructuredDelegation({
			taskId: "child-ru",
			workspacePath,
			summary:
				"Возможно, проблема связана с `src/app.ts`, но нужна верификация через `src/app.spec.ts` перед durable memory write.",
			inputs: [{ kind: "file", ref: "src/app.ts" }],
		})

		expect(result).toEqual({
			status: "rejected",
			reason: "truth_boundary_failed",
		})
	})

	it("deduplicates repeated promotion for the same task", async () => {
		const request = {
			taskId: "child-3",
			workspacePath,
			summary: "Updated `src/server.ts` and `src/server.spec.ts` with a durable fix.",
			inputs: [{ kind: "artifact", ref: ".kilocode/evidence/fix-notes.md" }] as const,
		}

		const first = await service.promoteFromStructuredDelegation(request)
		const second = await service.promoteFromStructuredDelegation(request)

		expect(first.status).toBe("promoted")
		expect(second).toMatchObject({ status: "skipped", reason: "duplicate" })

		const context = await fs.readFile(path.join(workspacePath, ".kilocode", "memory-bank", "context.md"), "utf8")
		expect((context.match(/AUTO_PROMOTED_MEMORY:child-3/g) ?? []).length).toBe(1)
	})
})
