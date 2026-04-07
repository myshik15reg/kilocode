import { fireEvent, render, screen } from "@/utils/test-utils"

import PromptsSettings from "../PromptsSettings"

const setIncludeTaskHistoryInEnhance = vi.fn()
const setEnhancementApiConfigId = vi.fn()
const setCondensingApiConfigId = vi.fn()
const setCustomCondensingPrompt = vi.fn()

vi.mock("@/context/ExtensionStateContext", () => ({
	useExtensionState: () => ({
		listApiConfigMeta: [],
		enhancementApiConfigId: "",
		setEnhancementApiConfigId,
		condensingApiConfigId: "",
		setCondensingApiConfigId,
		customCondensingPrompt: "",
		setCustomCondensingPrompt,
		includeTaskHistoryInEnhance: true,
		setIncludeTaskHistoryInEnhance,
	}),
}))

vi.mock("@/i18n/TranslationContext", () => ({
	useAppTranslation: () => ({
		t: (key: string) => key,
	}),
}))

vi.mock("@/utils/vscode", () => ({
	vscode: { postMessage: vi.fn() },
}))

vi.mock("@roo/support-prompt", () => ({
	supportPrompt: {
		default: {
			ENHANCE: "enhance prompt",
			CONDENSE: "condense prompt",
			EXPLAIN: "explain prompt",
			FIX: "fix prompt",
			IMPROVE: "improve prompt",
			ADD_TO_CONTEXT: "add to context prompt",
			TERMINAL_ADD_TO_CONTEXT: "terminal add to context prompt",
			TERMINAL_FIX: "terminal fix prompt",
			TERMINAL_EXPLAIN: "terminal explain prompt",
			TERMINAL_GENERATE: "terminal generate prompt",
			NEW_TASK: "new task prompt",
			COMMIT_MESSAGE: "commit message prompt",
		},
		get: (_prompts: any, type: string) => type,
	},
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
	VSCodeTextArea: ({ value, onInput, onChange, "data-testid": dataTestId }: any) => (
		<textarea
			value={value || ""}
			onChange={(e) => {
				onInput?.({ target: { value: e.target.value } })
				onChange?.({ target: { value: e.target.value } })
			}}
			data-testid={dataTestId || "textarea"}
		/>
	),
	VSCodeTextField: ({ value, onInput, "data-testid": dataTestId }: any) => (
		<input
			value={value || ""}
			onChange={(e) => onInput?.({ target: { value: e.target.value } })}
			data-testid={dataTestId || "input"}
		/>
	),
}))

vi.mock("@/components/ui", () => ({
	Button: ({ children, onClick, ...props }: any) => (
		<button onClick={onClick} {...props}>
			{children}
		</button>
	),
	Select: ({ children }: any) => <div>{children}</div>,
	SelectContent: ({ children }: any) => <div>{children}</div>,
	SelectItem: ({ children }: any) => <div>{children}</div>,
	SelectTrigger: ({ children, ...props }: any) => <div {...props}>{children}</div>,
	SelectValue: ({ placeholder }: any) => <div>{placeholder}</div>,
	StandardTooltip: ({ children }: any) => <div>{children}</div>,
}))

vi.mock("../Section", () => ({ Section: ({ children }: any) => <div>{children}</div> }))
vi.mock("../SectionHeader", () => ({ SectionHeader: ({ children }: any) => <div>{children}</div> }))
vi.mock("../CommitMessagePromptSettings", () => ({ default: () => <div>commit</div> }))

describe("PromptsSettings", () => {
	beforeEach(() => {
		vi.clearAllMocks()
	})

	it("renders moved AlfaCode controls by default", () => {
		render(
			<PromptsSettings
				customSupportPrompts={{}}
				setCustomSupportPrompts={vi.fn()}
				alfaCodeChangeAuthor=""
				setAlfaCodeChangeAuthor={vi.fn()}
			/>,
		)

		expect(screen.getByTestId("alfa-code-change-author-input")).toBeInTheDocument()
		expect(screen.getByRole("checkbox")).toBeInTheDocument()
		expect(screen.getByTestId("support-prompt-select-trigger")).toBeInTheDocument()
	})

	it("updates include task history and 1C author when visible", () => {
		const setAlfaCodeChangeAuthor = vi.fn()

		render(
			<PromptsSettings
				customSupportPrompts={{}}
				setCustomSupportPrompts={vi.fn()}
				alfaCodeChangeAuthor=""
				setAlfaCodeChangeAuthor={setAlfaCodeChangeAuthor}
			/>,
		)

		fireEvent.click(screen.getByRole("checkbox"))
		fireEvent.change(screen.getByTestId("alfa-code-change-author-input"), { target: { value: "Ivanov I.I." } })

		expect(setIncludeTaskHistoryInEnhance).toHaveBeenCalledWith(false)
		expect(setAlfaCodeChangeAuthor).toHaveBeenCalledWith("Ivanov I.I.")
	})

	it("hides moved AlfaCode controls when Prompts tab is in legacy mode", () => {
		render(
			<PromptsSettings
				customSupportPrompts={{}}
				setCustomSupportPrompts={vi.fn()}
				alfaCodeChangeAuthor=""
				setAlfaCodeChangeAuthor={vi.fn()}
				hideAlfaCodeFields={true}
			/>,
		)

		expect(screen.queryByTestId("alfa-code-change-author-input")).not.toBeInTheDocument()
		expect(screen.queryByRole("checkbox")).not.toBeInTheDocument()
		expect(screen.getByTestId("test-prompt-textarea")).toBeInTheDocument()
	})
})
