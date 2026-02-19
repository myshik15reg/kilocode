import { render, screen, within, fireEvent, act } from "@/utils/test-utils"
import React from "react"
import type { IndexingStatus } from "@roo/ExtensionMessage"
import { CodeIndexPopover } from "../CodeIndexPopover"
import { vscode } from "@src/utils/vscode"

// Mock external dependencies
vi.mock("@src/utils/vscode", () => ({
	vscode: {
		postMessage: vi.fn(),
	},
}))

const t = (key: string) => {
	const translations: Record<string, string> = {
		"settings:codeIndex.title": "Codebase Indexing",
		"settings:codeIndex.cancelIndexingButton": "Cancel Indexing",
		"settings:codeIndex.cancelling": "Cancelling...",
		"settings:codeIndex.indexingStatuses.indexing": "Indexing",
		"settings:codeIndex.indexingStatuses.standby": "Standby",
		"settings:codeIndex.description": "settings:codeIndex.description",
		"settings:codeIndex.enableLabel": "Enable",
		"settings:codeIndex.statusTitle": "Status",
		"settings:codeIndex.setupConfigLabel": "Setup",
		"settings:codeIndex.advancedConfigLabel": "Advanced",
		"settings:codeIndex.saveSettings": "Save",
		"settings:codeIndex.saving": "Saving...",
	}
	return translations[key] || key
}

const mockUseAppTranslation = { t }
vi.mock("@src/i18n/TranslationContext", () => ({
	useAppTranslation: () => mockUseAppTranslation,
}))

vi.mock("react-i18next", () => ({
	Trans: ({ i18nKey, children }: { i18nKey?: string; children?: React.ReactNode }) => (
		<>{i18nKey ? <span>{i18nKey}</span> : children}</>
	),
}))

const mockExtensionState = {
	codebaseIndexConfig: {
		codebaseIndexEnabled: true,
		codebaseIndexQdrantUrl: "http://localhost:6333",
		codebaseIndexEmbedderProvider: "openai",
		codebaseIndexEmbedderModelId: "text-embedding-3-small",
		codebaseIndexEmbedderModelDimension: 1536,
		codebaseIndexSearchMaxResults: 5,
		codebaseIndexSearchMinScore: 0.5,
		// FIX: ts2353-codebaseIndexVectorStoreName (TestAnalyzer)
		// Root cause: TS infers a narrow literal type for this mock; later tests extend the config shape.
		codebaseIndexVectorStoreName: "",
		codebaseIndexNeo4jEnabled: false,
		codebaseIndexNeo4jDatabase: "",
	},
	codebaseIndexModels: {
		openai: {
			"text-embedding-3-small": { dimension: 1536 },
			"text-embedding-ada-002": { dimension: 1536 },
		},
	},
	cwd: "/test/workspace",
}
vi.mock("@src/context/ExtensionStateContext", () => ({
	useExtensionState: () => mockExtensionState,
}))

// Mock UI components
vi.mock("@vscode/webview-ui-toolkit/react", () => ({
	VSCodeButton: ({
		children,
		onClick,
		...props
	}: {
		children: React.ReactNode
		onClick?: () => void
		[key: string]: any
	}) => (
		<button onClick={onClick} {...props}>
			{children}
		</button>
	),
	VSCodeTextField: ({
		onInput,
		value,
		...props
	}: {
		onInput?: (e: any) => void
		value?: string
		[key: string]: any
	}) => (
		// FIX: ux-neo4j-password-save-enabled (TestAnalyzer)
		// Root cause: real `VSCodeTextField` updates via `onInput`, but our test mock only forwarded `onChange`.
		// Forward both so tests can use either `fireEvent.input` or `fireEvent.change`.
		<input value={value || ""} onInput={onInput} onChange={onInput} {...props} />
	),
	VSCodeDropdown: ({ children, ...props }: { children: React.ReactNode; [key: string]: any }) => (
		<select {...props}>{children}</select>
	),
	VSCodeOption: ({ children, value, ...props }: { children: React.ReactNode; value: string; [key: string]: any }) => (
		<option value={value} {...props}>
			{children}
		</option>
	),
	VSCodeLink: ({ children, href, ...props }: { children: React.ReactNode; href?: string; [key: string]: any }) => (
		<a href={href} {...props}>
			{children}
		</a>
	),
	VSCodeCheckbox: ({
		children,
		checked,
		onChange,
		...props
	}: {
		children: React.ReactNode
		checked?: boolean
		onChange?: (e: any) => void
		[key: string]: any
	}) => (
		<label {...props}>
			<input type="checkbox" checked={checked || false} onChange={onChange} />
			{children}
		</label>
	),
}))

vi.mock("@src/components/ui", () => ({
	Button: ({
		children,
		onClick,
		disabled,
		...props
	}: {
		children: React.ReactNode
		onClick?: () => void
		disabled?: boolean
		[key: string]: any
	}) => (
		<button onClick={onClick} disabled={disabled} {...props}>
			{children}
		</button>
	),
	Popover: ({ children }: { children: React.ReactNode }) => <div>{children}</div>,
	PopoverTrigger: ({ children }: { children: React.ReactNode }) => <div>{children}</div>,
	PopoverContent: ({ children }: { children: React.ReactNode }) => <div>{children}</div>,
	Select: ({ children }: { children: React.ReactNode }) => <div>{children}</div>,
	SelectContent: ({ children }: { children: React.ReactNode }) => <div>{children}</div>,
	SelectItem: ({ children }: { children: React.ReactNode }) => <div>{children}</div>,
	SelectTrigger: ({ children }: { children: React.ReactNode }) => <div>{children}</div>,
	SelectValue: ({ children }: { children: React.ReactNode }) => <div>{children}</div>,
	AlertDialog: ({ children }: { children: React.ReactNode }) => <div>{children}</div>,
	AlertDialogTrigger: ({ children }: { children: React.ReactNode }) => <div>{children}</div>,
	AlertDialogContent: ({ children }: { children: React.ReactNode }) => <div>{children}</div>,
	AlertDialogAction: ({ children, onClick }: { children: React.ReactNode; onClick?: () => void }) => (
		<button onClick={onClick}>{children}</button>
	),
	AlertDialogCancel: ({ children, onClick }: { children: React.ReactNode; onClick?: () => void }) => (
		<button onClick={onClick}>{children}</button>
	),
	AlertDialogDescription: ({ children }: { children: React.ReactNode }) => <p>{children}</p>,
	AlertDialogFooter: ({ children }: { children: React.ReactNode }) => <footer>{children}</footer>,
	AlertDialogHeader: ({ children }: { children: React.ReactNode }) => <header>{children}</header>,
	AlertDialogTitle: ({ children }: { children: React.ReactNode }) => <h4>{children}</h4>,
	Slider: () => <div>Slider</div>,
	StandardTooltip: ({ children, content }: { children: React.ReactNode; content: string }) => (
		<div title={content}>{children}</div>
	),
}))

vi.mock("@radix-ui/react-progress", () => ({
	Root: ({ children, ...props }: { children: React.ReactNode; [key: string]: any }) => (
		<div {...props}>{children}</div>
	),
	Indicator: (props: any) => <div {...props} />,
}))

vi.mock("lucide-react", () => ({
	AlertTriangle: (props: any) => <span {...props}>Alert</span>,
}))

vi.mock("@src/components/ui/hooks/useRooPortal", () => ({
	useRooPortal: () => document.body,
}))

vi.mock("@src/hooks/useEscapeKey", () => ({
	useEscapeKey: vi.fn(),
}))

vi.mock("@src/utils/docLinks", () => ({
	buildDocLink: (path: string) => `https://docs.example.com/${path}`,
}))

describe("CodeIndexPopover", () => {
	const initialIndexingStatus: IndexingStatus = {
		systemStatus: "Standby",
		message: "",
		processedItems: 0,
		totalItems: 0,
		currentItemUnit: "items",
	}

	afterEach(() => {
		vi.useRealTimers()
		vi.clearAllMocks()
	})

	it("should render rerank block in Setup right after model dimension field and not in Advanced", () => {
		const previousProvider = mockExtensionState.codebaseIndexConfig.codebaseIndexEmbedderProvider
		const previousModelDimension = mockExtensionState.codebaseIndexConfig.codebaseIndexEmbedderModelDimension

		mockExtensionState.codebaseIndexConfig.codebaseIndexEmbedderProvider = "openai-compatible"
		mockExtensionState.codebaseIndexConfig.codebaseIndexEmbedderModelDimension = 768

		try {
			render(
				<CodeIndexPopover indexingStatus={initialIndexingStatus}>
					<button>Open Popover</button>
				</CodeIndexPopover>,
			)

			const setupButton = screen.getByRole("button", { name: "Setup" })
			fireEvent.click(setupButton)

			const setupContainer = setupButton.parentElement
			if (!setupContainer) {
				throw new Error("Setup button parent element was not found")
			}

			const modelDimensionLabel = within(setupContainer).getByText("settings:codeIndex.modelDimensionLabel")
			const rerankSectionLabel = within(setupContainer).getByText("settings:codeIndex.rerankSectionLabel")
			const vectorStoreProviderLabel = within(setupContainer).getByText(
				"settings:codeIndex.vectorStoreProviderLabel",
			)

			const isBefore = (a: Node, b: Node) =>
				Boolean(a.compareDocumentPosition(b) & Node.DOCUMENT_POSITION_FOLLOWING)

			expect(isBefore(modelDimensionLabel, rerankSectionLabel)).toBe(true)
			expect(isBefore(rerankSectionLabel, vectorStoreProviderLabel)).toBe(true)

			// “Immediately after” in terms of label ordering inside Setup
			const setupLabels = Array.from(setupContainer.querySelectorAll("label"))
				.map((el) => el.textContent?.trim())
				.filter(Boolean)
			const modelDimensionIndex = setupLabels.indexOf("settings:codeIndex.modelDimensionLabel")
			const rerankIndex = setupLabels.indexOf("settings:codeIndex.rerankSectionLabel")
			expect(modelDimensionIndex).toBeGreaterThanOrEqual(0)
			expect(rerankIndex).toBe(modelDimensionIndex + 1)

			const advancedButton = screen.getByRole("button", { name: "Advanced" })
			fireEvent.click(advancedButton)

			const advancedContainer = advancedButton.parentElement
			if (!advancedContainer) {
				throw new Error("Advanced button parent element was not found")
			}

			expect(
				within(advancedContainer).queryByText("settings:codeIndex.rerankSectionLabel"),
			).not.toBeInTheDocument()
		} finally {
			mockExtensionState.codebaseIndexConfig.codebaseIndexEmbedderProvider = previousProvider
			mockExtensionState.codebaseIndexConfig.codebaseIndexEmbedderModelDimension = previousModelDimension
		}
	})

	it("should render the popover window content", () => {
		render(
			<CodeIndexPopover indexingStatus={initialIndexingStatus}>
				<button>Open Popover</button>
			</CodeIndexPopover>,
		)

		// With the simplified mock, the content is always rendered.
		expect(screen.getByText("Codebase Indexing")).toBeInTheDocument()
		expect(screen.getByText("settings:codeIndex.description")).toBeInTheDocument()
		expect(screen.getByText("Enable")).toBeInTheDocument()
		expect(screen.getByText("Status")).toBeInTheDocument()
		expect(screen.getByText("Setup")).toBeInTheDocument()
		expect(screen.getByText("Advanced")).toBeInTheDocument()
	})

	it("should send cancelIndexing message when cancel button is clicked", async () => {
		const indexingStatus: IndexingStatus = {
			systemStatus: "Indexing",
			message: "Processing...",
			processedItems: 50,
			totalItems: 100,
			currentItemUnit: "items",
		}

		render(
			<CodeIndexPopover indexingStatus={indexingStatus}>
				<button>Open Popover</button>
			</CodeIndexPopover>,
		)

		const cancelButton = screen.getByText("Cancel Indexing")
		fireEvent.click(cancelButton)

		expect(vscode.postMessage).toHaveBeenCalledWith({ type: "cancelIndexing" })

		// Check for optimistic UI update for the message
		const statusMessage = await screen.findByText(/Cancelling.../i)
		expect(statusMessage).toBeInTheDocument()
	})

	it("should keep save error visible for a few seconds and not clear in the same tick", () => {
		vi.useFakeTimers()

		render(
			<CodeIndexPopover indexingStatus={initialIndexingStatus}>
				<button>Open Popover</button>
			</CodeIndexPopover>,
		)

		act(() => {
			window.dispatchEvent(
				new MessageEvent("message", {
					data: {
						type: "codeIndexSettingsSaved",
						success: false,
						error: "Save failed",
					},
				}),
			)
		})

		// The error should be visible immediately (no blink)
		expect(screen.getByText("Save failed")).toBeInTheDocument()

		// Still visible before the timeout expires
		act(() => {
			vi.advanceTimersByTime(4900)
		})
		expect(screen.getByText("Save failed")).toBeInTheDocument()

		// Cleared after the timeout
		act(() => {
			vi.advanceTimersByTime(200)
		})
		expect(screen.queryByText("Save failed")).not.toBeInTheDocument()
	})

	it("should not overwrite local input from codebaseIndexConfig updates when there are unsaved changes", () => {
		const { rerender } = render(
			<CodeIndexPopover indexingStatus={initialIndexingStatus}>
				<button>Open Popover</button>
			</CodeIndexPopover>,
		)

		const setupButton = screen.getByRole("button", { name: "Setup" })
		fireEvent.click(setupButton)

		const qdrantUrlInput = screen.getByPlaceholderText("settings:codeIndex.qdrantUrlPlaceholder")
		fireEvent.change(qdrantUrlInput, { target: { value: "http://user-input:6333" } })
		expect(screen.getByDisplayValue("http://user-input:6333")).toBeInTheDocument()

		// Simulate an external refresh of codebaseIndexConfig while user has unsaved changes
		mockExtensionState.codebaseIndexConfig = {
			...mockExtensionState.codebaseIndexConfig,
			codebaseIndexQdrantUrl: "http://external-update:6333",
		}

		// Re-render to apply the updated mock state
		rerender(
			<CodeIndexPopover indexingStatus={initialIndexingStatus}>
				<button>Open Popover</button>
			</CodeIndexPopover>,
		)

		// Local input should remain intact
		expect(screen.getByDisplayValue("http://user-input:6333")).toBeInTheDocument()
	})

	it("should not blink/clear secret inputs after successful save (normalize to placeholder)", () => {
		const previousConfig = mockExtensionState.codebaseIndexConfig
		mockExtensionState.codebaseIndexConfig = {
			...previousConfig,
			codebaseIndexVectorStoreName: "my-vector-store",
		}

		try {
			render(
				<CodeIndexPopover indexingStatus={initialIndexingStatus}>
					<button>Open Popover</button>
				</CodeIndexPopover>,
			)

			fireEvent.click(screen.getByRole("button", { name: "Setup" }))

			const openAiKeyInput = screen.getByPlaceholderText("settings:codeIndex.openAiKeyPlaceholder")
			fireEvent.change(openAiKeyInput, { target: { value: "sk-test-very-long-key" } })
			expect(screen.getByDisplayValue("sk-test-very-long-key")).toBeInTheDocument()

			const saveButton = screen.getByRole("button", { name: "Save" })
			fireEvent.click(saveButton)

			act(() => {
				window.dispatchEvent(
					new MessageEvent("message", {
						data: {
							type: "codeIndexSettingsSaved",
							success: true,
						},
					}),
				)
			})

			// FIX: code-index-popover-save-blink (TestAnalyzer)
			// After successful save, secret fields must immediately normalize to placeholder to avoid UI rollback.
			expect(screen.getByDisplayValue("••••••••••••••••")).toBeInTheDocument()
		} finally {
			mockExtensionState.codebaseIndexConfig = previousConfig
		}
	})

	it("should include Neo4j password in atomic save payload and keep neo4j database name", () => {
		const previousConfig = mockExtensionState.codebaseIndexConfig
		mockExtensionState.codebaseIndexConfig = {
			...previousConfig,
			codebaseIndexVectorStoreName: "my-vector-store",
			codebaseIndexNeo4jEnabled: true,
			codebaseIndexNeo4jDatabase: "neo4j",
		}

		try {
			render(
				<CodeIndexPopover indexingStatus={initialIndexingStatus}>
					<button>Open Popover</button>
				</CodeIndexPopover>,
			)

			// Make sure Setup fields are visible
			fireEvent.click(screen.getByRole("button", { name: "Setup" }))

			// Simulate secret presence so validation passes for OpenAI provider
			act(() => {
				window.dispatchEvent(
					new MessageEvent("message", {
						data: {
							type: "codeIndexSecretStatus",
							values: {
								hasOpenAiKey: true,
								hasQdrantApiKey: false,
								hasOpenAiCompatibleApiKey: false,
								hasGeminiApiKey: false,
								hasMistralApiKey: false,
								hasVercelAiGatewayApiKey: false,
								hasOpenRouterApiKey: false,
								hasRerankApiKey: false,
							},
						},
					}),
				)
			})

			// Update Neo4j database name
			const neo4jDatabaseInput = screen.getByPlaceholderText("settings:codeIndex.neo4j.databasePlaceholder")

			const saveButton = screen.getByRole("button", { name: "Save" })

			// Type password (draft) and verify it enables Save
			const neo4jPasswordInput = screen.getByTestId("neo4j-password")
			// FIX: ux-neo4j-password-save-enabled (TestAnalyzer)
			// Root cause: `VSCodeTextField` listens to `onInput`, so tests must use `fireEvent.input` (not `change`).
			fireEvent.input(neo4jPasswordInput, { target: { value: "" } })
			expect(saveButton).not.toBeDisabled()

			fireEvent.input(neo4jPasswordInput, { target: { value: "super-secret" } })
			expect(saveButton).not.toBeDisabled()

			// Update Neo4j database name (should stay in save payload)
			fireEvent.change(neo4jDatabaseInput, { target: { value: "graphdb" } })

			fireEvent.click(saveButton)

			// FIX: code-index-neo4j-secret-atomic (TestAnalyzer)
			// Root cause: Neo4j password must be saved atomically with the rest of code index settings.
			// Ensure we do NOT send a separate setNeo4jPassword message.
			const sentSeparateNeo4jPasswordMessage = (vscode.postMessage as any).mock.calls.some(
				([arg]: any[]) => arg?.type === "setNeo4jPassword",
			)
			expect(sentSeparateNeo4jPasswordMessage).toBe(false)

			const saveCall = (vscode.postMessage as any).mock.calls.find(
				([arg]: any[]) => arg?.type === "saveCodeIndexSettingsAtomic",
			)
			expect(saveCall).toBeTruthy()

			const [{ codeIndexSettings }] = saveCall
			expect(codeIndexSettings.codebaseIndexNeo4jDatabase).toBe("graphdb")
			expect(codeIndexSettings.codebaseIndexNeo4jPassword).toBe("super-secret")
			expect(codeIndexSettings.neo4jPassword).toBeUndefined()
		} finally {
			mockExtensionState.codebaseIndexConfig = previousConfig
		}
	})

	it("should show saved password placeholder when secret exists and draft is empty", () => {
		const SAVED_PASSWORD_PLACEHOLDER = "••••••••••••••••"
		const previousConfig = mockExtensionState.codebaseIndexConfig
		mockExtensionState.codebaseIndexConfig = {
			...previousConfig,
			codebaseIndexNeo4jEnabled: true,
		}

		try {
			render(
				<CodeIndexPopover indexingStatus={initialIndexingStatus}>
					<button>Open Popover</button>
				</CodeIndexPopover>,
			)

			// Make sure Setup fields are visible
			fireEvent.click(screen.getByRole("button", { name: "Setup" }))

			// Simulate that secret exists in SecretStorage
			act(() => {
				window.dispatchEvent(
					new MessageEvent("message", {
						data: {
							type: "neo4jPasswordStatus",
							hasNeo4jPassword: true,
						},
					}),
				)
			})

			const neo4jPasswordInput = screen.getByTestId("neo4j-password")
			expect(neo4jPasswordInput).toHaveAttribute("placeholder", SAVED_PASSWORD_PLACEHOLDER)

			// Placeholder should disappear on focus (so user can replace password)
			act(() => {
				fireEvent.focus(neo4jPasswordInput)
			})
			expect(neo4jPasswordInput).toHaveAttribute("placeholder", "settings:codeIndex.neo4j.passwordPlaceholder")

			// And return on blur if user didn't type anything
			act(() => {
				fireEvent.blur(neo4jPasswordInput)
			})
			expect(neo4jPasswordInput).toHaveAttribute("placeholder", SAVED_PASSWORD_PLACEHOLDER)
		} finally {
			mockExtensionState.codebaseIndexConfig = previousConfig
		}
	})
})
