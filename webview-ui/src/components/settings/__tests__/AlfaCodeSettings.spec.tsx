import type { ComponentProps } from "react"
import { fireEvent, render, screen } from "@/utils/test-utils"

import { AlfaCodeSettings } from "../AlfaCodeSettings"

const mockPostMessage = vi.fn()

vi.mock("@/i18n/TranslationContext", () => ({
	useAppTranslation: () => ({
		t: (key: string) => key,
	}),
}))

vi.mock("@/utils/vscode", () => ({
	vscode: {
		postMessage: (...args: any[]) => mockPostMessage(...args),
	},
}))

vi.mock("@vscode/webview-ui-toolkit/react", () => ({
	VSCodeCheckbox: ({ children, onChange, checked, "data-testid": dataTestId }: any) => (
		<label>
			<input
				type="checkbox"
				checked={checked}
				onChange={(e) => onChange({ target: { checked: e.target.checked } })}
				data-testid={dataTestId}
			/>
			{children}
		</label>
	),
	VSCodeTextField: ({ value, onInput, "data-testid": dataTestId }: any) => (
		<input
			type="text"
			value={value || ""}
			onChange={(e) => onInput?.({ target: { value: e.target.value } })}
			data-testid={dataTestId}
		/>
	),
}))

vi.mock("../Section", () => ({ Section: ({ children }: any) => <div>{children}</div> }))
vi.mock("../SectionHeader", () => ({ SectionHeader: ({ children }: any) => <div>{children}</div> }))
vi.mock("../SearchableSetting", () => ({ SearchableSetting: ({ children }: any) => <div>{children}</div> }))

vi.mock("@/components/ui", () => ({
	Badge: ({ children, ...props }: any) => <span {...props}>{children}</span>,
	Button: ({ children, onClick, ...props }: any) => (
		<button onClick={onClick} {...props}>
			{children}
		</button>
	),
	Slider: ({ value, onValueChange, "data-testid": dataTestId, min, max, step }: any) => (
		<input
			type="range"
			value={value?.[0] ?? 0}
			min={min}
			max={max}
			step={step}
			onChange={(e) => onValueChange?.([parseFloat(e.target.value)])}
			data-testid={dataTestId || "slider"}
		/>
	),
	Select: ({ children, "data-testid": dataTestId, onValueChange }: any) => (
		<button
			type="button"
			data-testid={dataTestId}
			onClick={() => {
				if (dataTestId === "alfacode-retrieval-policy-select") {
					onValueChange?.("hybrid")
					return
				}
				if (dataTestId === "alfacode-helper-locality-select") {
					onValueChange?.("require")
					return
				}
				if (dataTestId === "alfacode-escalation-sensitivity-select") {
					onValueChange?.("aggressive")
					return
				}
				if (dataTestId === "alfacode-terminal-command-api-config-select") {
					onValueChange?.("cfg-1")
					return
				}
			}}>
			{children}
		</button>
	),
	SelectContent: ({ children }: any) => <div>{children}</div>,
	SelectItem: ({ children }: any) => <div>{children}</div>,
	SelectTrigger: ({ children }: any) => <div>{children}</div>,
	SelectValue: ({ placeholder }: any) => <div>{placeholder}</div>,
}))

describe("AlfaCodeSettings", () => {
	const setCachedStateField = vi.fn()
	const defaultProps: ComponentProps<typeof AlfaCodeSettings> = {
		listApiConfigMeta: [{ id: "cfg-1", name: "Cheap model", apiProvider: "openai" as const }],
		currentApiConfigName: "Primary GPT-5",
		enhancementApiConfigId: "",
		condensingApiConfigId: "",
		autoRestartProblematicProcesses: false,
		problematicProcessRestartLimit: 1,
		parallelAgentsEnabled: false,
		parallelAgentCount: 2,
		contextRoutingEnabled: true,
		contextRoutingFastThresholdPercent: 35,
		contextRoutingDeepThresholdPercent: 65,
		orchestrationTelemetryEnabled: true,
		helperLocalityPreference: "prefer",
		orchestrationEscalationSensitivity: "balanced",
		structuredDelegationEnabled: false,
		evaluatorPassEnabled: false,
		memoryPromotionEnabled: false,
		retrievalPolicy: "adaptive",
		queryClassifierDebug: false,
		terminalCommandApiConfigId: "",
		setCachedStateField,
	}

	beforeEach(() => {
		vi.clearAllMocks()
	})

	it("renders AlfaCode routing, task strategy, and AlfaCode-specific controls", () => {
		render(<AlfaCodeSettings {...defaultProps} />)

		expect(screen.getByText("Primary GPT-5")).toBeInTheDocument()
		expect(screen.getByTestId("alfacode-strategy-local-card")).toBeInTheDocument()
		expect(screen.getByTestId("alfacode-strategy-compact-card")).toBeInTheDocument()
		expect(screen.getByTestId("alfacode-strategy-new-task-card")).toBeInTheDocument()
		expect(screen.getByTestId("alfacode-terminal-command-api-config-select")).toBeInTheDocument()
	})

	it("applies token saver preset", () => {
		render(<AlfaCodeSettings {...defaultProps} />)

		fireEvent.click(screen.getByTestId("alfacode-preset-token-saver"))

		expect(setCachedStateField).toHaveBeenCalledWith("autoCondenseContext", true)
		expect(setCachedStateField).toHaveBeenCalledWith("autoCondenseContextPercent", 70)
		expect(setCachedStateField).toHaveBeenCalledWith("contextRoutingEnabled", true)
		expect(setCachedStateField).toHaveBeenCalledWith("contextRoutingFastThresholdPercent", 25)
		expect(setCachedStateField).toHaveBeenCalledWith("contextRoutingDeepThresholdPercent", 50)
	})

	it("applies routing preset for cheap helpers", () => {
		render(<AlfaCodeSettings {...defaultProps} />)

		fireEvent.click(screen.getByTestId("alfacode-routing-preset-strong-main-cheap-helpers"))

		expect(setCachedStateField).toHaveBeenCalledWith("enhancementApiConfigId", "cfg-1")
		expect(setCachedStateField).toHaveBeenCalledWith("condensingApiConfigId", "cfg-1")
		expect(setCachedStateField).toHaveBeenCalledWith("terminalCommandApiConfigId", "cfg-1")
	})

	it("applies Cloud Main + Local Helpers only when a local profile is available", () => {
		render(
			<AlfaCodeSettings
				{...defaultProps}
				listApiConfigMeta={[
					{ id: "cfg-1", name: "Primary", apiProvider: "openai" },
					{ id: "cfg-local", name: "Ollama helper", apiProvider: "ollama" },
				]}
			/>,
		)

		fireEvent.click(screen.getByTestId("alfacode-routing-preset-cloud-main-local-helpers"))

		expect(setCachedStateField).toHaveBeenCalledWith("enhancementApiConfigId", "cfg-local")
		expect(setCachedStateField).toHaveBeenCalledWith("condensingApiConfigId", "cfg-local")
		expect(setCachedStateField).toHaveBeenCalledWith("terminalCommandApiConfigId", "cfg-local")
	})

	it("does not retarget helpers in cloud-only mode", () => {
		render(<AlfaCodeSettings {...defaultProps} />)

		expect(screen.getByTestId("alfacode-routing-preset-cloud-main-local-helpers")).toBeDisabled()
	})

	it("updates AlfaCode-specific controls", () => {
		render(<AlfaCodeSettings {...defaultProps} />)

		fireEvent.click(screen.getByTestId("alfacode-terminal-command-api-config-select"))

		expect(setCachedStateField).toHaveBeenCalledWith("terminalCommandApiConfigId", "cfg-1")
	})

	it("updates platform controls and expert controls", () => {
		render(<AlfaCodeSettings {...defaultProps} />)

		fireEvent.click(screen.getByTestId("alfacode-helper-locality-select"))
		fireEvent.click(screen.getByTestId("alfacode-escalation-sensitivity-select"))
		fireEvent.click(screen.getByTestId("alfacode-orchestration-telemetry-checkbox"))
		fireEvent.click(screen.getByTestId("alfacode-memory-promotion-checkbox"))
		fireEvent.click(screen.getByTestId("alfacode-retrieval-policy-select"))

		expect(setCachedStateField).toHaveBeenCalledWith("helperLocalityPreference", "require")
		expect(setCachedStateField).toHaveBeenCalledWith("orchestrationEscalationSensitivity", "aggressive")
		expect(setCachedStateField).toHaveBeenCalledWith("orchestrationTelemetryEnabled", false)
		expect(setCachedStateField).toHaveBeenCalledWith("memoryPromotionEnabled", true)
		expect(setCachedStateField).toHaveBeenCalledWith("retrievalPolicy", "hybrid")
	})

	it("runs local AI diagnostics from settings", () => {
		render(<AlfaCodeSettings {...defaultProps} />)

		fireEvent.click(screen.getByTestId("alfacode-run-local-ai-diagnostics"))

		expect(mockPostMessage).toHaveBeenCalledWith({ type: "runLocalAiDiagnostics" })
	})

	it("renders diagnostics results pushed from the extension", async () => {
		render(<AlfaCodeSettings {...defaultProps} />)

		window.dispatchEvent(
			new MessageEvent("message", {
				data: {
					type: "localAiDiagnosticsResult",
					localAiDiagnostics: {
						ranAt: "2026-04-03T19:30:00.000Z",
						checks: [
							{
								checkId: "ollama_service",
								status: "ok",
								title: "Ollama availability",
								message: "Ollama responded with 2 models.",
							},
						],
					},
				},
			}),
		)

		expect(await screen.findByTestId("alfacode-diagnostics-check-ollama_service")).toBeInTheDocument()
		expect(screen.getByText("Ollama responded with 2 models.")).toBeInTheDocument()
	})

	it("renders and updates parallel agent and recovery controls", () => {
		render(
			<AlfaCodeSettings
				{...defaultProps}
				parallelAgentsEnabled={true}
				parallelAgentCount={4}
				autoRestartProblematicProcesses={true}
				problematicProcessRestartLimit={3}
			/>,
		)

		fireEvent.change(screen.getByTestId("alfacode-parallel-agent-count-slider"), { target: { value: "10" } })
		fireEvent.change(screen.getByTestId("alfacode-problematic-process-restart-limit-slider"), {
			target: { value: "5" },
		})

		expect(setCachedStateField).toHaveBeenCalledWith("parallelAgentCount", 10)
		expect(setCachedStateField).toHaveBeenCalledWith("problematicProcessRestartLimit", 5)
	})
})
