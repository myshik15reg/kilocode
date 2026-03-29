import { describe, it, expect, vi, beforeEach } from "vitest"
import { render, screen, fireEvent } from "@testing-library/react"
import { Provider, createStore } from "jotai"
import { SessionDetail } from "../SessionDetail"
import { vscode } from "../../utils/vscode"
import {
	sessionsMapAtom,
	sessionOrderAtom,
	selectedSessionIdAtom,
	pendingSessionAtom,
	sessionGroupMessagesAtom,
	schedulerStateAtom,
	sessionInputAtomFamily,
	sessionImagesAtomFamily,
	type AgentSession,
	type SchedulerState,
} from "../../state/atoms/sessions"
import { sessionMachineStateAtom, sessionMachineUiStateAtom } from "../../state/atoms/stateMachine"
import type { SessionUiState } from "../../state/sessionStateMachine"

// Mock react-i18next
vi.mock("react-i18next", () => ({
	useTranslation: () => ({
		t: (key: string, params?: Record<string, unknown>) => {
			if (params) {
				return `${key} ${JSON.stringify(params)}`
			}
			return key
		},
	}),
}))

// Mock vscode postMessage
vi.mock("../../utils/vscode", () => ({
	vscode: {
		postMessage: vi.fn(),
	},
}))

// Mock TooltipProvider for StandardTooltip
vi.mock("../../../../components/ui", () => ({
	StandardTooltip: ({ children }: { children: React.ReactNode }) => <>{children}</>,
}))

// Mock MessageList to simplify tests
vi.mock("../MessageList", () => ({
	MessageList: ({ sessionId }: { sessionId: string }) => <div data-testid="message-list">{sessionId}</div>,
}))

// Mock ChatInput to capture props
const mockChatInputProps = vi.fn()
vi.mock("../ChatInput", () => ({
	ChatInput: (props: {
		sessionId: string
		sessionLabel?: string
		isActive?: boolean
		autoMode?: boolean
		showFinishToBranch?: boolean
		worktreeBranchName?: string
	}) => {
		mockChatInputProps(props)
		return (
			<div data-testid="chat-input">
				{props.showFinishToBranch && <span data-testid="finish-to-branch-enabled">finish enabled</span>}
			</div>
		)
	},
}))

describe("SessionDetail", () => {
	beforeEach(() => {
		vi.clearAllMocks()
	})

	const createSession = (overrides: Partial<AgentSession> = {}): AgentSession => ({
		sessionId: "test-session-123",
		label: "Test Session",
		prompt: "Test prompt",
		status: "running",
		startTime: Date.now(),
		source: "local",
		autoMode: false,
		...overrides,
	})

	const createUiState = (overrides: Partial<SessionUiState> = {}): SessionUiState => ({
		showSpinner: false,
		showCancelButton: false,
		isActive: false,
		...overrides,
	})

	const renderWithStore = (
		session: AgentSession | null,
		machineState?: Record<string, SessionUiState>,
		allSessions?: AgentSession[],
		sessionGroupMessages?: Record<
			string,
			{
				messageId: string
				groupId: string
				sourceSessionId: string
				sourceLabel?: string
				content: string
				timestamp: number
			}
		>,
		schedulerState?: SchedulerState | null,
		machineStates?: Record<
			string,
			| "idle"
			| "creating"
			| "streaming"
			| "waiting_approval"
			| "waiting_input"
			| "completed"
			| "paused"
			| "error"
			| "stopped"
		>,
		draft?: { message?: string; images?: string[] },
	) => {
		const store = createStore()

		if (session) {
			const sessionList = allSessions && allSessions.length > 0 ? allSessions : [session]
			store.set(sessionsMapAtom, Object.fromEntries(sessionList.map((entry) => [entry.sessionId, entry])))
			store.set(
				sessionOrderAtom,
				sessionList.map((entry) => entry.sessionId),
			)
			store.set(selectedSessionIdAtom, session.sessionId)
		} else {
			store.set(sessionsMapAtom, {})
			store.set(sessionOrderAtom, [])
			store.set(selectedSessionIdAtom, null)
		}

		store.set(pendingSessionAtom, null)
		store.set(sessionGroupMessagesAtom, sessionGroupMessages ?? {})
		store.set(schedulerStateAtom, schedulerState ?? null)

		if (machineState) {
			store.set(sessionMachineUiStateAtom, machineState)
		}
		if (machineStates) {
			store.set(sessionMachineStateAtom, machineStates)
		}
		if (session) {
			store.set(sessionInputAtomFamily(session.sessionId), draft?.message ?? "")
			store.set(sessionImagesAtomFamily(session.sessionId), draft?.images ?? [])
		}

		return render(
			<Provider store={store}>
				<SessionDetail />
			</Provider>,
		)
	}

	it("shows root-scoped rollup badges in detail header", () => {
		const session = createSession({
			status: "error",
			taskId: "root-detail",
			rootTaskId: "root-detail",
			sessionGroup: {
				groupId: "group-root-detail",
				rootSessionId: "test-session-123",
				label: "Root detail swarm",
				sessionIndex: 0,
				sessionCount: 1,
			},
		})

		renderWithStore(
			session,
			undefined,
			[session],
			{
				"group-root-detail": {
					messageId: "msg-1",
					groupId: "group-root-detail",
					sourceSessionId: "test-session-123",
					sourceLabel: "Planner",
					content: "Return only root summary.",
					timestamp: 2,
				},
			},
			{
				maxConcurrentStarts: 4,
				activeSessionLoad: 1,
				queuedLaunchCount: 1,
				maxConcurrentPerQueueKey: 1,
				queueKeyPressure: { "group-root-detail": 2 },
				backpressure: true,
			},
		)

		expect(screen.getByTestId("session-detail-root-summary")).toHaveTextContent("Branches 1")
		expect(screen.getByTestId("session-detail-root-pressure")).toHaveTextContent("root pressure 2")
		expect(screen.getByTestId("session-detail-root-relay")).toHaveTextContent("root Planner -> Return only root s")
	})

	it("shows task linkage badge for subtasks", () => {
		const session = createSession({
			status: "running",
			taskId: "child-task",
			rootTaskId: "root-task",
			parentTaskId: "parent-task",
		})

		renderWithStore(session)

		expect(screen.getByTestId("session-detail-task-linkage")).toHaveTextContent("subtask of parent-task")
	})

	describe("canFinishWorktree logic", () => {
		describe("showFinishToBranch should be TRUE when", () => {
			it("session has parallelMode.enabled=true AND status=running AND not showing spinner", () => {
				const session = createSession({
					status: "running",
					parallelMode: { enabled: true, branch: "feature/test" },
				})

				renderWithStore(session, {
					[session.sessionId]: createUiState({ isActive: true, showSpinner: false }),
				})

				expect(mockChatInputProps).toHaveBeenCalledWith(
					expect.objectContaining({
						showFinishToBranch: true,
						worktreeBranchName: "feature/test",
					}),
				)
			})

			it("session has parallelMode.enabled=true AND status=running AND spinner showing (waiting states)", () => {
				// When spinner is showing but session is running, we still allow finish
				// because the user might want to finish during a pause
				const session = createSession({
					status: "running",
					parallelMode: { enabled: true, branch: "feature/test" },
				})

				renderWithStore(session, {
					[session.sessionId]: createUiState({ isActive: true, showSpinner: true }),
				})

				// Based on simplified logic: isWorktree && isSessionRunning
				// User can finish a worktree session at any time while it's running
				expect(mockChatInputProps).toHaveBeenCalledWith(
					expect.objectContaining({
						showFinishToBranch: true,
					}),
				)
			})

			it("session has parallelMode.enabled=true AND status=running with branch name", () => {
				const session = createSession({
					status: "running",
					parallelMode: { enabled: true, branch: "kilocode/my-feature" },
				})

				renderWithStore(session, {
					[session.sessionId]: createUiState({ isActive: true, showSpinner: false }),
				})

				expect(mockChatInputProps).toHaveBeenCalledWith(
					expect.objectContaining({
						showFinishToBranch: true,
						worktreeBranchName: "kilocode/my-feature",
					}),
				)
			})
		})

		describe("showFinishToBranch should be FALSE when", () => {
			it("session has parallelMode.enabled=false (local mode)", () => {
				const session = createSession({
					status: "running",
					parallelMode: undefined,
				})

				renderWithStore(session, {
					[session.sessionId]: createUiState({ isActive: true, showSpinner: false }),
				})

				expect(mockChatInputProps).toHaveBeenCalledWith(
					expect.objectContaining({
						showFinishToBranch: false,
					}),
				)
			})

			it("session has parallelMode.enabled=false explicitly", () => {
				const session = createSession({
					status: "running",
					parallelMode: { enabled: false },
				})

				renderWithStore(session, {
					[session.sessionId]: createUiState({ isActive: true, showSpinner: false }),
				})

				expect(mockChatInputProps).toHaveBeenCalledWith(
					expect.objectContaining({
						showFinishToBranch: false,
					}),
				)
			})

			it("session status is not running (done)", () => {
				const session = createSession({
					status: "done",
					parallelMode: { enabled: true, branch: "feature/test" },
				})

				renderWithStore(session, {
					[session.sessionId]: createUiState({ isActive: false, showSpinner: false }),
				})

				expect(mockChatInputProps).toHaveBeenCalledWith(
					expect.objectContaining({
						showFinishToBranch: false,
					}),
				)
			})

			it("session status is not running (stopped)", () => {
				const session = createSession({
					status: "stopped",
					parallelMode: { enabled: true, branch: "feature/test" },
				})

				renderWithStore(session, {
					[session.sessionId]: createUiState({ isActive: false, showSpinner: false }),
				})

				expect(mockChatInputProps).toHaveBeenCalledWith(
					expect.objectContaining({
						showFinishToBranch: false,
					}),
				)
			})

			it("session status is not running (error)", () => {
				const session = createSession({
					status: "error",
					parallelMode: { enabled: true, branch: "feature/test" },
				})

				renderWithStore(session, {
					[session.sessionId]: createUiState({ isActive: false, showSpinner: false }),
				})

				expect(mockChatInputProps).toHaveBeenCalledWith(
					expect.objectContaining({
						showFinishToBranch: false,
					}),
				)
			})
		})

		describe("worktreeBranchName prop", () => {
			it("passes branch name when available", () => {
				const session = createSession({
					status: "running",
					parallelMode: { enabled: true, branch: "kilocode/feature-123" },
				})

				renderWithStore(session, {
					[session.sessionId]: createUiState({ isActive: true, showSpinner: false }),
				})

				expect(mockChatInputProps).toHaveBeenCalledWith(
					expect.objectContaining({
						worktreeBranchName: "kilocode/feature-123",
					}),
				)
			})

			it("passes undefined when branch name not available", () => {
				const session = createSession({
					status: "running",
					parallelMode: { enabled: true },
				})

				renderWithStore(session, {
					[session.sessionId]: createUiState({ isActive: true, showSpinner: false }),
				})

				expect(mockChatInputProps).toHaveBeenCalledWith(
					expect.objectContaining({
						worktreeBranchName: undefined,
					}),
				)
			})
		})
	})

	describe("worktree badge display", () => {
		it("shows worktree badge with branch name when parallelMode.enabled", () => {
			const session = createSession({
				status: "running",
				parallelMode: { enabled: true, branch: "feature/test-branch" },
			})

			renderWithStore(session, {
				[session.sessionId]: createUiState({ isActive: true, showSpinner: false }),
			})

			// Check for GitBranch icon and branch name in the header
			expect(screen.getByText("feature/test-branch")).toBeInTheDocument()
		})

		it("shows local badge when parallelMode not enabled", () => {
			const session = createSession({
				status: "running",
				parallelMode: undefined,
			})

			renderWithStore(session, {
				[session.sessionId]: createUiState({ isActive: true, showSpinner: false }),
			})

			// Check for local mode indicator
			expect(screen.getByText("sessionDetail.runModeLocal")).toBeInTheDocument()
		})
	})

	describe("restart handoff context", () => {
		it("shows stop reason and summary for problematic sessions", () => {
			const session = createSession({
				status: "error",
				lastStopReason: "loop_detected",
				lastStopSummary: "Branch kept retrying the same broken patch.",
				restartHandoff:
					"Stop reason: loop_detected. Previous summary: Branch kept retrying the same broken patch.",
				restartCount: 2,
				restartLimit: 4,
				autoRestartEnabled: true,
			})

			renderWithStore(session, {
				[session.sessionId]: createUiState({ isActive: false, showSpinner: false }),
			})

			expect(screen.getByTestId("restart-handoff-card")).toBeInTheDocument()
			expect(screen.getByTestId("restart-handoff-reason")).toHaveTextContent("loop detected")
			expect(screen.getByTestId("restart-handoff-summary")).toHaveTextContent(
				"Branch kept retrying the same broken patch.",
			)
			expect(screen.getByTestId("restart-handoff-text")).toHaveTextContent("Previous summary")
			expect(screen.getByTestId("restart-handoff-policy")).toHaveTextContent("restarts 2/4")
			expect(screen.getByTestId("restart-handoff-auto")).toHaveTextContent("auto-restart on")
			fireEvent.click(screen.getByTestId("restart-branch-button"))
			expect(vscode.postMessage).toHaveBeenCalledWith({
				type: "agentManager.restartSession",
				sessionId: "test-session-123",
			})
			fireEvent.click(screen.getByTestId("restart-compact-button"))
			expect(vscode.postMessage).toHaveBeenCalledWith({
				type: "agentManager.restartSessionCompact",
				sessionId: "test-session-123",
			})
			fireEvent.click(screen.getByTestId("toggle-auto-restart-button"))
			expect(vscode.postMessage).toHaveBeenCalledWith({
				type: "agentManager.setSessionAutoRestart",
				sessionId: "test-session-123",
				enabled: false,
			})
		})

		it("can re-enable auto restart for a problematic session", () => {
			const session = createSession({
				status: "error",
				lastStopReason: "loop_detected",
				lastStopSummary: "Branch stopped after repeated retries.",
				autoRestartEnabled: false,
			})

			renderWithStore(session, {
				[session.sessionId]: createUiState({ isActive: false, showSpinner: false }),
			})

			fireEvent.click(screen.getByTestId("toggle-auto-restart-button"))
			expect(vscode.postMessage).toHaveBeenCalledWith({
				type: "agentManager.setSessionAutoRestart",
				sessionId: "test-session-123",
				enabled: true,
			})
		})

		it("can broadcast full and compact handoff to root task", () => {
			const session = createSession({
				status: "error",
				taskId: "branch-task",
				rootTaskId: "root-task-1",
				lastStopReason: "loop_detected",
				lastStopSummary: "Branch kept retrying the same broken patch.",
				restartHandoff:
					"Stop reason: loop_detected. Previous summary: Branch kept retrying the same broken patch.",
				sessionGroup: {
					groupId: "detail-group-1",
					rootSessionId: "test-session-123",
					label: "Detail swarm",
					sessionIndex: 0,
					sessionCount: 2,
				},
			})

			renderWithStore(session, {
				[session.sessionId]: createUiState({ isActive: false, showSpinner: false }),
			})

			fireEvent.click(screen.getByTestId("broadcast-group-handoff-button"))
			expect(vscode.postMessage).toHaveBeenCalledWith({
				type: "agentManager.broadcastToGroup",
				sessionId: "test-session-123",
				content: "Branch handoff from Test Session: Branch kept retrying the same broken patch.",
				includeSender: false,
			})
			fireEvent.click(screen.getByTestId("broadcast-group-compact-button"))
			expect(vscode.postMessage).toHaveBeenCalledWith({
				type: "agentManager.broadcastToGroup",
				sessionId: "test-session-123",
				content: "Branch handoff from Test Session: Branch kept retrying the same broken patch.",
				includeSender: false,
			})
			fireEvent.click(screen.getByTestId("broadcast-root-handoff-button"))
			expect(vscode.postMessage).toHaveBeenCalledWith({
				type: "agentManager.broadcastToRootTask",
				sessionId: "test-session-123",
				content: "Branch handoff from Test Session: Branch kept retrying the same broken patch.",
				includeSender: false,
				compact: false,
			})
			fireEvent.click(screen.getByTestId("broadcast-root-compact-button"))
			expect(vscode.postMessage).toHaveBeenCalledWith({
				type: "agentManager.broadcastToRootTask",
				sessionId: "test-session-123",
				content: "Branch handoff from Test Session: Branch kept retrying the same broken patch.",
				includeSender: false,
				compact: true,
			})
		})

		it("shows auto-compact hint on full root handoff button under pressure", () => {
			const session = createSession({
				status: "error",
				taskId: "branch-task",
				rootTaskId: "root-task-1",
				lastStopSummary: "Branch kept retrying the same broken patch.",
				sessionGroup: {
					groupId: "group-detail-pressure",
					rootSessionId: "test-session-123",
					label: "Pressure swarm",
					sessionIndex: 0,
					sessionCount: 1,
				},
			})

			renderWithStore(
				session,
				{ [session.sessionId]: createUiState({ isActive: false, showSpinner: false }) },
				[session],
				undefined,
				{
					maxConcurrentStarts: 1,
					activeSessionLoad: 1,
					queuedLaunchCount: 1,
					maxConcurrentPerQueueKey: 1,
					queueKeyPressure: { "group-detail-pressure": 2 },
					backpressure: true,
				},
			)

			expect(screen.getByTestId("broadcast-root-handoff-button")).toHaveAttribute(
				"title",
				expect.stringContaining("auto-compact under pressure"),
			)
			expect(screen.getByTestId("session-detail-relay-policy")).toHaveTextContent("relay compact")
		})
	})

	it("shows throttled pressure and relay context for grouped swarm sessions", () => {
		const rootSession = createSession({
			sessionId: "group-root-pressure",
			label: "Group Root Pressure",
			status: "running",
			sessionGroup: {
				groupId: "group-detail-pressure",
				rootSessionId: "group-root-pressure",
				label: "Detail swarm",
				sessionIndex: 0,
				sessionCount: 2,
			},
		})
		const siblingSession = createSession({
			sessionId: "group-sibling-pressure",
			label: "Group Sibling Pressure",
			status: "running",
			sessionGroup: {
				groupId: "group-detail-pressure",
				rootSessionId: "group-root-pressure",
				label: "Detail swarm",
				sessionIndex: 1,
				sessionCount: 2,
			},
		})

		renderWithStore(
			rootSession,
			{ [rootSession.sessionId]: createUiState({ isActive: false, showSpinner: false }) },
			[rootSession, siblingSession],
			{
				"group-detail-pressure": {
					messageId: "relay-1",
					groupId: "group-detail-pressure",
					sourceSessionId: "group-root-pressure",
					sourceLabel: "Planner",
					content: "Take parser branch and return only summary deltas.",
					timestamp: 1,
				},
			},
			{
				maxConcurrentStarts: 2,
				activeSessionLoad: 2,
				queuedLaunchCount: 1,
				maxConcurrentPerQueueKey: 1,
				queueKeyPressure: { "group-detail-pressure": 2 },
				backpressure: true,
			},
		)

		expect(screen.getByTestId("session-detail-group-pressure")).toHaveTextContent("pressure 2 · throttled")
		expect(screen.getByTestId("session-detail-group-relay")).toHaveTextContent("Planner -> Take parser branch")
	})

	it("shows grouped branch summary for swarm sessions", () => {
		const rootSession = createSession({
			sessionId: "group-root",
			label: "Group Root",
			status: "creating",
			sessionGroup: {
				groupId: "group-detail",
				rootSessionId: "group-root",
				label: "Detail swarm",
				sessionIndex: 0,
				sessionCount: 3,
			},
		})
		const runningSession = createSession({
			sessionId: "group-running",
			label: "Group Running",
			status: "running",
			sessionGroup: {
				groupId: "group-detail",
				rootSessionId: "group-root",
				label: "Detail swarm",
				sessionIndex: 1,
				sessionCount: 3,
			},
		})
		const errorSession = createSession({
			sessionId: "group-error",
			label: "Group Error",
			status: "error",
			sessionGroup: {
				groupId: "group-detail",
				rootSessionId: "group-root",
				label: "Detail swarm",
				sessionIndex: 2,
				sessionCount: 3,
			},
		})

		renderWithStore(
			rootSession,
			{
				[rootSession.sessionId]: createUiState({ isActive: false, showSpinner: false }),
			},
			[rootSession, runningSession, errorSession],
		)

		expect(screen.getByTestId("session-detail-group-summary")).toHaveTextContent("Branches 3 · C1 · A1 · Err 1")
	})

	describe("terminal button visibility", () => {
		it("hides terminal button for provisional sessions", () => {
			const session = createSession({
				sessionId: "provisional-123",
				status: "running",
				parallelMode: { enabled: true, branch: "feature/test" },
			})

			renderWithStore(session, {
				[session.sessionId]: createUiState({ isActive: true, showSpinner: false }),
			})

			expect(screen.queryByLabelText("sessionDetail.openTerminal")).not.toBeInTheDocument()
		})

		it("shows terminal button for non-provisional sessions", () => {
			const session = createSession({
				sessionId: "real-session-123",
				status: "running",
				parallelMode: { enabled: true, branch: "feature/test" },
			})

			renderWithStore(session, {
				[session.sessionId]: createUiState({ isActive: true, showSpinner: false }),
			})

			expect(screen.getByLabelText("sessionDetail.openTerminal")).toBeInTheDocument()
		})
	})

	describe("explicit lifecycle controls", () => {
		it("shows resume button for paused sessions and dispatches resume action", () => {
			const session = createSession({ status: "stopped" })

			renderWithStore(
				session,
				{ [session.sessionId]: createUiState({ isActive: false, showSpinner: false }) },
				undefined,
				undefined,
				undefined,
				{ [session.sessionId]: "paused" },
				{ message: "Continue from breakpoint" },
			)

			const resumeButton = screen.getByTestId("resume-session-button")
			expect(resumeButton).toHaveAttribute("aria-label", "chatInput.resumeTitle")
			fireEvent.click(resumeButton)
			expect(vscode.postMessage).toHaveBeenCalledWith({
				type: "agentManager.resumeSession",
				sessionId: "test-session-123",
				sessionLabel: "Test Session",
				content: "Continue from breakpoint",
				images: undefined,
			})
		})

		it("shows resume button for stopped sessions and reuses draft images without conflicting with send semantics", () => {
			const session = createSession({ status: "stopped" })

			renderWithStore(
				session,
				{ [session.sessionId]: createUiState({ isActive: false, showSpinner: false }) },
				undefined,
				undefined,
				undefined,
				{ [session.sessionId]: "stopped" },
				{ images: ["image-1"] },
			)

			fireEvent.click(screen.getByTestId("resume-session-button"))
			expect(vscode.postMessage).toHaveBeenCalledWith({
				type: "agentManager.resumeSession",
				sessionId: "test-session-123",
				sessionLabel: "Test Session",
				content: "Test prompt",
				images: ["image-1"],
			})
		})

		it("keeps resume hidden for running sessions while cancel remains available via chat controls", () => {
			const session = createSession({ status: "running" })

			renderWithStore(
				session,
				{ [session.sessionId]: createUiState({ isActive: true, showSpinner: false, showCancelButton: true }) },
				undefined,
				undefined,
				undefined,
				{ [session.sessionId]: "streaming" },
			)

			expect(screen.queryByTestId("resume-session-button")).not.toBeInTheDocument()
			expect(mockChatInputProps).toHaveBeenCalledWith(
				expect.objectContaining({
					showCancel: true,
					isActive: true,
					sessionStatus: "running",
				}),
			)
		})

		// kilocode_change start
		it("keeps resume hidden for done sessions even when machine state is completed", () => {
			const session = createSession({ status: "done" })

			renderWithStore(
				session,
				{ [session.sessionId]: createUiState({ isActive: false, showSpinner: false }) },
				undefined,
				undefined,
				undefined,
				{ [session.sessionId]: "completed" },
			)

			expect(screen.queryByTestId("resume-session-button")).not.toBeInTheDocument()
			expect(mockChatInputProps).toHaveBeenCalledWith(
				expect.objectContaining({
					sessionStatus: "done",
				}),
			)
		})
		// kilocode_change end
	})
})
