import { render, screen, fireEvent } from "@/utils/test-utils"
import { DisplaySettings } from "../DisplaySettings"

vi.mock("../../../i18n/TranslationContext", () => ({
	useAppTranslation: () => ({
		t: (key: string) => {
			const translations: Record<string, string> = {
				"settings:sections.display": "Display",
				"settings:ui.collapseThinking.label": "Collapse thinking blocks",
				"settings:ui.collapseThinking.description": "Keep long reasoning collapsed by default",
				"settings:display.sendMessageOnEnter.label": "Send on Enter",
				"settings:display.sendMessageOnEnter.description": "Press Enter to send a message",
				"kilocode:settings.alfaCode.timeline.label": "Show task timeline",
				"kilocode:settings.alfaCode.timeline.description": "Show grouped task progress in chat",
				"settings:display.showTimestamps.label": "Show timestamps",
				"settings:display.showTimestamps.description": "Display message timestamps",
				"settings:display.showDiffStats.label": "Show diff stats",
				"settings:display.showDiffStats.description": "Display diff counters",
				"settings:display.costThreshold.label": "Hide cost below threshold",
				"settings:display.costThreshold.description": "Hide tiny cost values",
			}
			return translations[key] || key
		},
	}),
}))

vi.mock("@vscode/webview-ui-toolkit/react", () => ({
	VSCodeCheckbox: ({ checked, onChange, children, "data-testid": dataTestId }: any) => (
		<label>
			<input
				type="checkbox"
				checked={checked}
				onChange={(e) => onChange({ target: { checked: e.target.checked } })}
				data-testid={dataTestId || "vscode-checkbox"}
			/>
			{children}
		</label>
	),
}))

vi.mock("../ui", () => ({
	Slider: ({ "data-testid": dataTestId }: any) => <div data-testid={dataTestId || "slider"} />,
}))

vi.mock("../../chat/TaskTimeline", () => ({
	TaskTimeline: ({ groupedMessages, isTaskActive }: any) => (
		<div data-testid="task-timeline-preview">
			TaskTimeline Preview ({groupedMessages?.length || 0} messages, active: {isTaskActive ? "yes" : "no"})
		</div>
	),
}))

vi.mock("../../../utils/timeline/mockData", () => ({
	generateSampleTimelineData: () => [
		{ ts: 1000, type: "ask", ask: "command" },
		{ ts: 2000, type: "say", say: "text" },
	],
}))

describe("DisplaySettings", () => {
	const mockSetCachedStateField = vi.fn()

	beforeEach(() => {
		vi.clearAllMocks()
	})

	it("renders restored display settings and preview", () => {
		render(
			<DisplaySettings
				showTaskTimeline={true}
				sendMessageOnEnter={true}
				showTimestamps={true}
				showDiffStats={true}
				hideCostBelowThreshold={0.1}
				reasoningBlockCollapsed={false}
				setCachedStateField={mockSetCachedStateField}
			/>,
		)

		expect(screen.getByText("Display")).toBeInTheDocument()
		expect(screen.getByText("Show task timeline")).toBeInTheDocument()
		expect(screen.getByText("Show timestamps")).toBeInTheDocument()
		expect(screen.getByText("Show diff stats")).toBeInTheDocument()
		expect(screen.getByTestId("display-cost-threshold-slider")).toBeInTheDocument()
		expect(screen.getByTestId("task-timeline-preview")).toBeInTheDocument()
	})

	it("updates restored timeline toggle", () => {
		render(
			<DisplaySettings
				showTaskTimeline={false}
				sendMessageOnEnter={true}
				showTimestamps={true}
				showDiffStats={true}
				hideCostBelowThreshold={0.1}
				reasoningBlockCollapsed={false}
				setCachedStateField={mockSetCachedStateField}
			/>,
		)

		fireEvent.click(screen.getByTestId("display-show-task-timeline-checkbox"))

		expect(mockSetCachedStateField).toHaveBeenCalledWith("showTaskTimeline", true)
	})
})
