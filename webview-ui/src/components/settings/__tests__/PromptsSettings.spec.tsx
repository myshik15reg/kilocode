import { render, screen, fireEvent } from "@/utils/test-utils"

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
vi.mock("../SearchableSetting", () => ({ SearchableSetting: ({ children }: any) => <div>{children}</div> }))
vi.mock("../CommitMessagePromptSettings", () => ({ default: () => <div>commit</div> }))

describe("PromptsSettings", () => {
	beforeEach(() => {
		vi.clearAllMocks()
	})

	it("renders include task history toggle in prompts tab", () => {
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
	})

	it("updates include task history from prompts tab", () => {
		render(
			<PromptsSettings
				customSupportPrompts={{}}
				setCustomSupportPrompts={vi.fn()}
				alfaCodeChangeAuthor=""
				setAlfaCodeChangeAuthor={vi.fn()}
			/>,
		)

		fireEvent.click(screen.getByRole("checkbox"))

		expect(setIncludeTaskHistoryInEnhance).toHaveBeenCalledWith(false)
	})

	it("updates 1C author from prompts tab", () => {
		const setAlfaCodeChangeAuthor = vi.fn()

		render(
			<PromptsSettings
				customSupportPrompts={{}}
				setCustomSupportPrompts={vi.fn()}
				alfaCodeChangeAuthor=""
				setAlfaCodeChangeAuthor={setAlfaCodeChangeAuthor}
			/>,
		)

		fireEvent.change(screen.getByTestId("alfa-code-change-author-input"), { target: { value: "Ivanov I.I." } })

		expect(setAlfaCodeChangeAuthor).toHaveBeenCalledWith("Ivanov I.I.")
	})
})
