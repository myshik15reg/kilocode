import {
	getActivityGroups,
	getActivityStatusSummary,
	getBackgroundChildTasks,
	getChildTasksWithoutDetailedActivity,
	getExplainabilityEntries,
	getHistoryOrchestrationSummary,
	getTaskOrchestrationSummary,
	normalizeActivityStatus,
} from "../orchestration"

describe("orchestration selectors", () => {
	it("groups activity items by presentation section", () => {
		const groups = getActivityGroups([
			{
				kind: "toolBatch",
				id: "tb-1",
				requestId: "r1",
				taskId: "root",
				status: "started",
				summary: "Batch start",
				timestamp: 1,
			},
			{ kind: "subagent", id: "sa-1", taskId: "child", status: "running", summary: "Child run", timestamp: 2 },
			{ kind: "taskControl", id: "tc-1", taskId: "root", control: "pause", summary: "Paused", timestamp: 3 },
		])

		expect(groups.map((group) => group.label)).toEqual(["backgroundActions", "subagents", "timeline"])
	})

	it("computes aggregate status with failure precedence", () => {
		const summary = getActivityStatusSummary([
			{
				kind: "toolBatch",
				id: "tb-1",
				requestId: "r1",
				taskId: "root",
				status: "completed",
				summary: "Done",
				timestamp: 1,
			},
			{ kind: "subagent", id: "sa-1", taskId: "child", status: "failed", summary: "Failed", timestamp: 2 },
		])

		expect(summary.status).toBe("failed")
		expect(summary.counts.completed).toBe(1)
		expect(summary.counts.failed).toBe(1)
	})

	it("derives summary from latest status per entity instead of stale history", () => {
		const summary = getTaskOrchestrationSummary({
			activity: [
				{
					kind: "subagent",
					id: "sa-1",
					taskId: "child",
					sessionId: "session-1",
					status: "queued",
					summary: "Queued",
					timestamp: 1,
				},
				{
					kind: "subagent",
					id: "sa-2",
					taskId: "child",
					sessionId: "session-1",
					status: "running",
					summary: "Running",
					timestamp: 2,
				},
				{
					kind: "subagent",
					id: "sa-3",
					taskId: "child",
					sessionId: "session-1",
					status: "completed",
					summary: "Done",
					timestamp: 3,
				},
			],
		})

		expect(summary.status).toBe("completed")
		expect(summary.counts.queued).toBe(0)
		expect(summary.counts.running).toBe(0)
		expect(summary.counts.completed).toBe(1)
	})

	it("keeps relay-only activity out of orchestration status badges", () => {
		const summary = getTaskOrchestrationSummary({
			activity: [
				{
					kind: "relay",
					id: "relay-1",
					taskId: "parent",
					rootTaskId: "root",
					status: "delivered",
					envelope: {
						kind: "parent",
						fromTaskId: "child",
						toTaskId: "parent",
						rootTaskId: "root",
						content: "Need review",
						requiresParentVisibility: true,
						timestamp: 10,
					},
					summary: "Relay delivered",
					timestamp: 10,
				},
			],
		})

		expect(summary.hasSignals).toBe(true)
		expect(summary.hasStatusSignals).toBe(false)
		expect(summary.counts.completed).toBe(0)
	})

	it("links parent to background child tasks using state only", () => {
		const childTasks = getBackgroundChildTasks({
			currentTaskItem: {
				id: "parent",
				childIds: ["child"],
				task: "Parent",
				number: 1,
				ts: 1,
				tokensIn: 0,
				tokensOut: 0,
				totalCost: 0,
			},
			taskHistory: [
				{
					id: "parent",
					task: "Parent",
					number: 1,
					ts: 1,
					tokensIn: 0,
					tokensOut: 0,
					totalCost: 0,
					childIds: ["child"],
				},
				{
					id: "child",
					task: "Background child",
					number: 2,
					ts: 2,
					tokensIn: 0,
					tokensOut: 0,
					totalCost: 0,
					parentTaskId: "parent",
					execution: "background",
				},
			],
			currentTaskActivity: [
				{
					kind: "subagent",
					id: "sa-1",
					taskId: "child",
					sessionId: "session-1",
					status: "running",
					summary: "Running",
					timestamp: 1,
				},
			],
		})

		expect(childTasks).toHaveLength(1)
		expect(childTasks[0]).toMatchObject({
			id: "child",
			status: "running",
			isBackground: true,
			sessionId: "session-1",
		})
	})

	it("hides child summary rows already represented by detailed subagent activity", () => {
		const childTasks = getBackgroundChildTasks({
			currentTaskItem: {
				id: "parent",
				childIds: ["child"],
				task: "Parent",
				number: 1,
				ts: 1,
				tokensIn: 0,
				tokensOut: 0,
				totalCost: 0,
			},
			taskHistory: [
				{
					id: "parent",
					task: "Parent",
					number: 1,
					ts: 1,
					tokensIn: 0,
					tokensOut: 0,
					totalCost: 0,
					childIds: ["child"],
				},
				{
					id: "child",
					task: "Background child",
					number: 2,
					ts: 2,
					tokensIn: 0,
					tokensOut: 0,
					totalCost: 0,
					parentTaskId: "parent",
					execution: "background",
				},
			] as any,
			currentTaskActivity: [
				{
					kind: "subagent",
					id: "sa-1",
					taskId: "child",
					sessionId: "session-1",
					status: "running",
					summary: "Running",
					timestamp: 1,
				},
			],
		})

		expect(
			getChildTasksWithoutDetailedActivity({
				childTasks,
				activity: [
					{
						kind: "subagent",
						id: "sa-1",
						taskId: "child",
						sessionId: "session-1",
						status: "running",
						summary: "Running",
						timestamp: 1,
					},
				] as any,
			}),
		).toEqual([])
	})

	it("derives cancelled child status from history-only reload state", () => {
		const childTasks = getBackgroundChildTasks({
			currentTaskItem: {
				id: "parent",
				childIds: ["child"],
				task: "Parent",
				number: 1,
				ts: 1,
				tokensIn: 0,
				tokensOut: 0,
				totalCost: 0,
			} as any,
			taskHistory: [
				{
					id: "parent",
					task: "Parent",
					number: 1,
					ts: 1,
					tokensIn: 0,
					tokensOut: 0,
					totalCost: 0,
					childIds: ["child"],
				},
				{
					id: "child",
					task: "Background child",
					number: 2,
					ts: 2,
					tokensIn: 0,
					tokensOut: 0,
					totalCost: 0,
					parentTaskId: "parent",
					execution: "background",
					lifecycleState: "cancelled",
					status: "aborted",
				},
			] as any,
		})

		expect(childTasks[0]).toMatchObject({ id: "child", status: "cancelled", isBackground: true })
	})

	it("derives recoverable child status from paused streaming failure reload state", () => {
		const childTasks = getBackgroundChildTasks({
			currentTaskItem: {
				id: "parent",
				childIds: ["child"],
				task: "Parent",
				number: 1,
				ts: 1,
				tokensIn: 0,
				tokensOut: 0,
				totalCost: 0,
			} as any,
			taskHistory: [
				{
					id: "parent",
					task: "Parent",
					number: 1,
					ts: 1,
					tokensIn: 0,
					tokensOut: 0,
					totalCost: 0,
					childIds: ["child"],
				},
				{
					id: "child",
					task: "Recoverable child",
					number: 2,
					ts: 2,
					tokensIn: 0,
					tokensOut: 0,
					totalCost: 0,
					parentTaskId: "parent",
					execution: "background",
					lifecycleState: "paused",
					lastStopReason: "streaming_failed",
					status: "active",
				},
			] as any,
		})

		expect(childTasks[0]).toMatchObject({ id: "child", status: "recoverable", isBackground: true })
	})

	it("derives queued child status from history-only reload state", () => {
		const childTasks = getBackgroundChildTasks({
			currentTaskItem: {
				id: "parent",
				childIds: ["child"],
				task: "Parent",
				number: 1,
				ts: 1,
				tokensIn: 0,
				tokensOut: 0,
				totalCost: 0,
			} as any,
			taskHistory: [
				{
					id: "parent",
					task: "Parent",
					number: 1,
					ts: 1,
					tokensIn: 0,
					tokensOut: 0,
					totalCost: 0,
					childIds: ["child"],
				},
				{
					id: "child",
					task: "Queued child",
					number: 2,
					ts: 2,
					tokensIn: 0,
					tokensOut: 0,
					totalCost: 0,
					parentTaskId: "parent",
					execution: "background",
				},
			] as any,
		})

		expect(childTasks[0]).toMatchObject({ id: "child", status: "queued", isBackground: true })
	})

	it("includes history-only completed child status in orchestration summary", () => {
		const summary = getTaskOrchestrationSummary({
			currentTaskItem: {
				id: "parent",
				childIds: ["child"],
				task: "Parent",
				number: 1,
				ts: 1,
				tokensIn: 0,
				tokensOut: 0,
				totalCost: 0,
			} as any,
			taskHistory: [
				{
					id: "parent",
					task: "Parent",
					number: 1,
					ts: 1,
					tokensIn: 0,
					tokensOut: 0,
					totalCost: 0,
					childIds: ["child"],
				},
				{
					id: "child",
					task: "Background child",
					number: 2,
					ts: 2,
					tokensIn: 0,
					tokensOut: 0,
					totalCost: 0,
					parentTaskId: "parent",
					execution: "background",
					lifecycleState: "completed",
					status: "completed",
				},
			] as any,
		})

		expect(summary.hasStatusSignals).toBe(true)
		expect(summary.status).toBe("completed")
		expect(summary.counts.completed).toBe(1)
	})

	it("includes history-only cancelled child status in orchestration summary", () => {
		const summary = getTaskOrchestrationSummary({
			currentTaskItem: {
				id: "parent",
				childIds: ["child"],
				task: "Parent",
				number: 1,
				ts: 1,
				tokensIn: 0,
				tokensOut: 0,
				totalCost: 0,
			} as any,
			taskHistory: [
				{
					id: "parent",
					task: "Parent",
					number: 1,
					ts: 1,
					tokensIn: 0,
					tokensOut: 0,
					totalCost: 0,
					childIds: ["child"],
				},
				{
					id: "child",
					task: "Background child",
					number: 2,
					ts: 2,
					tokensIn: 0,
					tokensOut: 0,
					totalCost: 0,
					parentTaskId: "parent",
					execution: "background",
					lifecycleState: "cancelled",
					status: "aborted",
				},
			] as any,
		})

		expect(summary.hasStatusSignals).toBe(true)
		expect(summary.status).toBe("cancelled")
		expect(summary.counts.cancelled).toBe(1)
	})

	it("includes history-only recoverable child status in orchestration summary", () => {
		const summary = getTaskOrchestrationSummary({
			currentTaskItem: {
				id: "parent",
				childIds: ["child"],
				task: "Parent",
				number: 1,
				ts: 1,
				tokensIn: 0,
				tokensOut: 0,
				totalCost: 0,
			} as any,
			taskHistory: [
				{
					id: "parent",
					task: "Parent",
					number: 1,
					ts: 1,
					tokensIn: 0,
					tokensOut: 0,
					totalCost: 0,
					childIds: ["child"],
				},
				{
					id: "child",
					task: "Recoverable child",
					number: 2,
					ts: 2,
					tokensIn: 0,
					tokensOut: 0,
					totalCost: 0,
					parentTaskId: "parent",
					execution: "background",
					lifecycleState: "paused",
					lastStopReason: "streaming_failed",
					status: "active",
				},
			] as any,
		})

		expect(summary.hasStatusSignals).toBe(true)
		expect(summary.status).toBe("recoverable")
		expect(summary.counts.recoverable).toBe(1)
	})

	it("includes history-only queued child status in orchestration summary", () => {
		const summary = getTaskOrchestrationSummary({
			currentTaskItem: {
				id: "parent",
				childIds: ["child"],
				task: "Parent",
				number: 1,
				ts: 1,
				tokensIn: 0,
				tokensOut: 0,
				totalCost: 0,
			} as any,
			taskHistory: [
				{
					id: "parent",
					task: "Parent",
					number: 1,
					ts: 1,
					tokensIn: 0,
					tokensOut: 0,
					totalCost: 0,
					childIds: ["child"],
				},
				{
					id: "child",
					task: "Queued child",
					number: 2,
					ts: 2,
					tokensIn: 0,
					tokensOut: 0,
					totalCost: 0,
					parentTaskId: "parent",
					execution: "background",
				},
			] as any,
		})

		expect(summary.hasStatusSignals).toBe(true)
		expect(summary.status).toBe("queued")
		expect(summary.counts.queued).toBe(1)
	})

	it("prefers running over cancelled in mixed orchestration summaries", () => {
		const summary = getTaskOrchestrationSummary({
			activity: [
				{
					kind: "subagent",
					id: "sa-1",
					taskId: "child-running",
					sessionId: "session-1",
					status: "running",
					summary: "Running",
					timestamp: 2,
				},
			],
			currentTaskItem: {
				id: "parent",
				childIds: ["child-running", "child-cancelled"],
				task: "Parent",
				number: 1,
				ts: 1,
				tokensIn: 0,
				tokensOut: 0,
				totalCost: 0,
			} as any,
			taskHistory: [
				{
					id: "parent",
					task: "Parent",
					number: 1,
					ts: 1,
					tokensIn: 0,
					tokensOut: 0,
					totalCost: 0,
					childIds: ["child-running", "child-cancelled"],
				},
				{
					id: "child-running",
					task: "Running child",
					number: 2,
					ts: 2,
					tokensIn: 0,
					tokensOut: 0,
					totalCost: 0,
					parentTaskId: "parent",
					execution: "background",
					status: "active",
				},
				{
					id: "child-cancelled",
					task: "Cancelled child",
					number: 3,
					ts: 3,
					tokensIn: 0,
					tokensOut: 0,
					totalCost: 0,
					parentTaskId: "parent",
					execution: "background",
					lifecycleState: "cancelled",
					status: "aborted",
				},
			] as any,
		})

		expect(summary.status).toBe("running")
		expect(summary.counts.running).toBe(1)
		expect(summary.counts.cancelled).toBe(1)
	})

	it("does not double-count background tasks already represented by task-control activity", () => {
		const summary = getTaskOrchestrationSummary({
			activity: [
				{
					kind: "taskControl",
					id: "tc-1",
					taskId: "child-1",
					control: "pause",
					summary: "Paused child",
					timestamp: 5,
				},
			],
			currentTaskItem: {
				id: "parent",
				childIds: ["child-1"],
				task: "Parent",
				number: 1,
				ts: 1,
				tokensIn: 0,
				tokensOut: 0,
				totalCost: 0,
			} as any,
			taskHistory: [
				{
					id: "parent",
					task: "Parent",
					number: 1,
					ts: 1,
					tokensIn: 0,
					tokensOut: 0,
					totalCost: 0,
					childIds: ["child-1"],
				},
				{
					id: "child-1",
					task: "Paused child",
					number: 2,
					ts: 2,
					tokensIn: 0,
					tokensOut: 0,
					totalCost: 0,
					parentTaskId: "parent",
					execution: "background",
					lifecycleState: "paused",
					status: "active",
				},
			] as any,
		})

		expect(summary.counts.paused).toBe(1)
	})

	it("ignores self task-control activity for root task summary", () => {
		const summary = getTaskOrchestrationSummary({
			activity: [
				{
					kind: "taskControl",
					id: "tc-root",
					taskId: "root",
					control: "pause",
					summary: "Paused root",
					timestamp: 5,
				},
			],
			currentTaskItem: {
				id: "root",
				task: "Root",
				number: 1,
				ts: 1,
				tokensIn: 0,
				tokensOut: 0,
				totalCost: 0,
				status: "completed",
			} as any,
		})

		expect(summary.hasStatusSignals).toBe(false)
		expect(summary.counts.paused).toBe(0)
		expect(summary.status).toBe("completed")
	})
	it("collapses consecutive duplicate pause events in the timeline group", () => {
		const groups = getActivityGroups([
			{
				kind: "taskControl",
				id: "tc-1",
				taskId: "root",
				control: "pause",
				summary: "Task cancelled by user",
				timestamp: 1,
			},
			{
				kind: "taskControl",
				id: "tc-2",
				taskId: "root",
				control: "pause",
				summary: "Task cancelled by user",
				timestamp: 2,
			},
			{
				kind: "taskControl",
				id: "tc-3",
				taskId: "root",
				control: "resume",
				summary: "Task resumed",
				timestamp: 3,
			},
			{
				kind: "taskControl",
				id: "tc-4",
				taskId: "root",
				control: "pause",
				summary: "Task cancelled by user",
				timestamp: 4,
			},
		] as any)

		const timeline = groups.find((group) => group.label === "timeline")
		expect(timeline?.items.map((item) => item.id)).toEqual(["tc-2", "tc-3", "tc-4"])
	})

	it("maps continue controls to running and branch controls to completed timeline semantics", () => {
		const summary = getTaskOrchestrationSummary({
			activity: [
				{
					kind: "taskControl",
					id: "tc-continue",
					taskId: "child-1",
					control: "continue",
					summary: "Continued child",
					timestamp: 5,
				},
				{
					kind: "taskControl",
					id: "tc-branch",
					taskId: "child-2",
					control: "branch",
					summary: "Branched child",
					timestamp: 6,
				},
			],
		})

		expect(summary.counts.running).toBe(1)
		expect(summary.counts.completed).toBe(1)
	})

	it("maps structured delegation explainability into compact UI entries", () => {
		expect(
			getExplainabilityEntries({
				kind: "subagent",
				id: "sa-explain",
				taskId: "child-1",
				sessionId: "session-1",
				status: "queued",
				summary: "Background subagent queued",
				explainability: {
					stage: "delegation",
					reasonCode: "historical_background_win",
					source: "recommended",
					mode: "code",
					execution: "background",
					profileClass: "cheap",
					helperProfile: "Fast helper",
					recommendationReasonCode: "historical_background_win",
				},
				timestamp: 7,
			} as any),
		).toEqual([
			{ title: "Route", detail: "background · code" },
			{ title: "Helper", detail: "cheap · Fast helper" },
			{ title: "Why", detail: "historical_background_win" },
		])
	})

	it("keeps explainability empty when structured data is absent", () => {
		expect(
			getExplainabilityEntries({
				kind: "subagent",
				id: "sa-no-explain",
				taskId: "child-1",
				status: "running",
				summary: "Running helper",
				timestamp: 8,
			} as any),
		).toEqual([])
	})

	it("exposes evaluator verdicts in outcome explainability entries", () => {
		expect(
			getExplainabilityEntries({
				kind: "subagent",
				id: "sa-outcome",
				taskId: "child-1",
				status: "completed",
				summary: "Completed helper",
				explainability: {
					stage: "outcome",
					reasonCode: "subagent_completed",
					outcomeSummary: "Background subagent completed",
					lastSubagentOutcome: "retry",
				},
				timestamp: 9,
			} as any),
		).toEqual([
			{ title: "Outcome", detail: "Background subagent completed" },
			{ title: "Reason", detail: "evaluator retry" },
		])
	})

	it("maps abstained activity to an abstained orchestration status", () => {
		expect(
			normalizeActivityStatus({
				kind: "subagent",
				id: "sa-abstain",
				taskId: "child-1",
				status: "abstained",
				summary: "Need clarification",
				timestamp: 10,
			} as any),
		).toBe("abstained")
	})

	it("includes history-only queued background tasks in history summary", () => {
		const summary = getHistoryOrchestrationSummary([
			{
				id: "root",
				task: "Root",
				number: 1,
				ts: 1,
				tokensIn: 0,
				tokensOut: 0,
				totalCost: 0,
				childIds: ["child"],
			},
			{
				id: "child",
				task: "Queued child",
				number: 2,
				ts: 2,
				tokensIn: 0,
				tokensOut: 0,
				totalCost: 0,
				parentTaskId: "root",
				rootTaskId: "root",
				execution: "background",
			},
		] as any)

		expect(summary.hasStatusSignals).toBe(true)
		expect(summary.status).toBe("queued")
		expect(summary.counts.queued).toBe(1)
	})
})
