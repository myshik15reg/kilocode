import {
	activityItemSchema,
	historyItemSchema,
	normalizeTaskControl,
	normalizeSubagentLaunchRequest,
	resolveSubagentLaunchTargetTaskId,
	taskControlSchema,
	taskControlValueSchema,
	taskResumeControlSchema,
	taskHistoryStatusSchema,
	taskStopReasonSchema,
	branchTaskOptionsSchema,
} from "../index.js"

describe("task control contracts", () => {
	it("accepts the supported history states", () => {
		expect(taskHistoryStatusSchema.parse("aborted")).toBe("aborted")
	})

	it("accepts the supported stop reasons", () => {
		expect(taskStopReasonSchema.parse("restart_limit_exceeded")).toBe("restart_limit_exceeded")
	})

	it("accepts canonical current task control semantics", () => {
		expect(taskControlSchema.parse("continue")).toBe("continue")
		expect(taskControlSchema.parse("branch")).toBe("branch")
		expect(taskResumeControlSchema.parse("continue")).toBe("continue")
	})

	it("reads legacy and current task control values and normalizes them to canonical semantics", () => {
		expect(taskControlValueSchema.parse("run")).toBe("run")
		expect(normalizeTaskControl("run")).toBe("continue")
		expect(normalizeTaskControl("resume")).toBe("resume")
		expect(normalizeTaskControl("branch")).toBe("branch")
	})

	it("validates branch task options", () => {
		expect(branchTaskOptionsSchema.parse({ branchStrategy: "summary", message: "Follow-up" })).toEqual({
			branchStrategy: "summary",
			message: "Follow-up",
		})
	})

	it("normalizes legacy task control activity items while preserving canonical current controls", () => {
		expect(
			activityItemSchema.parse({
				kind: "taskControl",
				id: "tc-legacy",
				taskId: "task-1",
				control: "run",
				summary: "Legacy continue",
				timestamp: 1,
			}),
		).toEqual({
			kind: "taskControl",
			id: "tc-legacy",
			taskId: "task-1",
			control: "continue",
			summary: "Legacy continue",
			timestamp: 1,
		})

		expect(
			activityItemSchema.parse({
				kind: "taskControl",
				id: "tc-branch",
				taskId: "task-1",
				control: "branch",
				summary: "Branched",
				timestamp: 2,
			}),
		).toMatchObject({ control: "branch" })
	})

	it("normalizes persisted history activity controls from legacy run to canonical continue", () => {
		const parsed = historyItemSchema.parse({
			id: "task-1",
			number: 1,
			ts: 1,
			task: "Task",
			tokensIn: 0,
			tokensOut: 0,
			totalCost: 0,
			activity: [
				{
					kind: "taskControl",
					id: "tc-legacy",
					taskId: "task-1",
					control: "run",
					summary: "Legacy continue",
					timestamp: 1,
				},
				{
					kind: "taskControl",
					id: "tc-branch",
					taskId: "task-1",
					control: "branch",
					summary: "Branched",
					timestamp: 2,
				},
			],
		})

		expect(parsed.activity).toEqual([
			{
				kind: "taskControl",
				id: "tc-legacy",
				taskId: "task-1",
				control: "continue",
				summary: "Legacy continue",
				timestamp: 1,
			},
			{
				kind: "taskControl",
				id: "tc-branch",
				taskId: "task-1",
				control: "branch",
				summary: "Branched",
				timestamp: 2,
			},
		])
	})

	it("normalizes legacy subagent launch requests with backward-compatible defaults", () => {
		expect(
			normalizeSubagentLaunchRequest({
				parentTaskId: "parent-1",
				rootTaskId: "root-1",
				mode: "code",
				handoff: { summary: "Do work" },
			}),
		).toEqual({
			parentTaskId: "parent-1",
			rootTaskId: "root-1",
			mode: "code",
			handoff: { summary: "Do work" },
			execution: "foreground",
			isolation: "auto",
			relayPolicy: "parent_only",
		})
	})

	it("preserves explicit current subagent launch fields while keeping helper profile optional", () => {
		expect(
			normalizeSubagentLaunchRequest({
				parentTaskId: "parent-1",
				rootTaskId: "root-1",
				targetTaskId: "child-1",
				mode: "code",
				handoff: { summary: "Do work", context: ["ctx"] },
				execution: "background",
				isolation: "worktree",
				relayPolicy: "group",
				helperProfile: "helper-profile",
			}),
		).toEqual({
			parentTaskId: "parent-1",
			rootTaskId: "root-1",
			targetTaskId: "child-1",
			mode: "code",
			handoff: { summary: "Do work", context: ["ctx"] },
			execution: "background",
			isolation: "worktree",
			relayPolicy: "group",
			helperProfile: "helper-profile",
		})
	})

	it("resolves legacy subagent launch target task ids from the parent id", () => {
		expect(resolveSubagentLaunchTargetTaskId({ parentTaskId: "parent-1" })).toBe("parent-1")
		expect(resolveSubagentLaunchTargetTaskId({ parentTaskId: "parent-1", targetTaskId: "child-1" })).toBe("child-1")
	})
})
