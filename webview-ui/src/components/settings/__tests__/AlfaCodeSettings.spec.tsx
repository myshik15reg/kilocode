import { render, screen, fireEvent } from "@/utils/test-utils"

import { AlfaCodeSettings } from "../AlfaCodeSettings"

vi.mock("@/i18n/TranslationContext", () => ({
	useAppTranslation: () => ({
		t: (key: string) => key,
	}),
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
	Select: ({ children }: any) => <div>{children}</div>,
	SelectContent: ({ children }: any) => <div>{children}</div>,
	SelectItem: ({ children }: any) => <div>{children}</div>,
	SelectTrigger: ({ children }: any) => <div>{children}</div>,
	SelectValue: ({ placeholder }: any) => <div>{placeholder}</div>,
}))

describe("AlfaCodeSettings", () => {
	const setCachedStateField = vi.fn()
	const defaultProps = {
		listApiConfigMeta: [{ id: "cfg-1", name: "Cheap model" }],
		currentApiConfigName: "Primary GPT-5",
		enhancementApiConfigId: "",
		condensingApiConfigId: "",
		autoRestartProblematicProcesses: false,
		problematicProcessRestartLimit: 1,
		parallelAgentsEnabled: false,
		parallelAgentCount: 2,
		autoCondenseContext: true,
		autoCondenseContextPercent: 85,
		contextRoutingEnabled: true,
		contextRoutingFastThresholdPercent: 35,
		contextRoutingDeepThresholdPercent: 65,
		terminalCommandApiConfigId: "",
		setCachedStateField,
	}

	beforeEach(() => {
		vi.clearAllMocks()
	})

	it("shows AlfaCode routing and core agent controls", () => {
		render(<AlfaCodeSettings {...defaultProps} />)

		expect(screen.getByText("Primary GPT-5")).toBeInTheDocument()
		expect(screen.getByTestId("alfacode-strategy-local-card")).toBeInTheDocument()
		expect(screen.getByTestId("alfacode-strategy-compact-card")).toBeInTheDocument()
		expect(screen.getByTestId("alfacode-strategy-new-task-card")).toBeInTheDocument()
		expect(screen.getByText("kilocode:settings.alfaCode.routing.enhance.label")).toBeInTheDocument()
		expect(screen.getByTestId("alfacode-routing-primary-badge")).toBeInTheDocument()
		expect(screen.getByTestId("alfacode-routing-helper-badge")).toBeInTheDocument()
		expect(screen.getByTestId("context-routing-fast-threshold-slider")).toBeInTheDocument()
		expect(screen.getByTestId("context-routing-deep-threshold-slider")).toBeInTheDocument()
	})

	it("updates fast threshold in AlfaCode routing", () => {
		render(<AlfaCodeSettings {...defaultProps} />)

		fireEvent.change(screen.getByTestId("context-routing-fast-threshold-slider"), { target: { value: "60" } })

		expect(setCachedStateField).toHaveBeenCalledWith("contextRoutingFastThresholdPercent", 60)
	})

	it("updates deep threshold in AlfaCode routing", () => {
		render(<AlfaCodeSettings {...defaultProps} />)

		fireEvent.change(screen.getByTestId("context-routing-deep-threshold-slider"), { target: { value: "90" } })

		expect(setCachedStateField).toHaveBeenCalledWith("contextRoutingDeepThresholdPercent", 90)
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

	it("does not render moved notification controls in AlfaCode", () => {
		render(<AlfaCodeSettings {...defaultProps} />)

		expect(screen.queryByTestId("alfacode-system-notifications-enabled-checkbox")).not.toBeInTheDocument()
	})

	it("toggles parallel agents setting", () => {
		render(<AlfaCodeSettings {...defaultProps} />)

		fireEvent.click(screen.getByTestId("alfacode-parallel-agents-enabled-checkbox"))

		expect(setCachedStateField).toHaveBeenCalledWith("parallelAgentsEnabled", true)
	})

	it("renders parallel agent count slider", () => {
		render(<AlfaCodeSettings {...defaultProps} parallelAgentsEnabled={true} parallelAgentCount={4} />)

		expect(screen.getByTestId("alfacode-parallel-agent-count-slider")).toBeInTheDocument()
		expect(screen.getByText("4")).toBeInTheDocument()
	})

	it("hides parallel agent count slider when parallel agents are disabled", () => {
		render(<AlfaCodeSettings {...defaultProps} parallelAgentsEnabled={false} />)

		expect(screen.queryByTestId("alfacode-parallel-agent-count-slider")).not.toBeInTheDocument()
	})

	it("toggles auto restart problematic processes", () => {
		render(<AlfaCodeSettings {...defaultProps} />)

		fireEvent.click(screen.getByTestId("alfacode-auto-restart-problematic-processes-checkbox"))

		expect(setCachedStateField).toHaveBeenCalledWith("autoRestartProblematicProcesses", true)
	})

	it("renders problematic process restart limit slider", () => {
		render(
			<AlfaCodeSettings
				{...defaultProps}
				autoRestartProblematicProcesses={true}
				problematicProcessRestartLimit={3}
			/>,
		)

		expect(screen.getByTestId("alfacode-problematic-process-restart-limit-slider")).toBeInTheDocument()
		expect(screen.getByText("3")).toBeInTheDocument()
	})

	it("hides problematic process restart limit slider when auto restart is disabled", () => {
		render(<AlfaCodeSettings {...defaultProps} autoRestartProblematicProcesses={false} />)

		expect(screen.queryByTestId("alfacode-problematic-process-restart-limit-slider")).not.toBeInTheDocument()
	})

	it("supports up to 500 parallel agents", () => {
		render(<AlfaCodeSettings {...defaultProps} parallelAgentsEnabled={true} parallelAgentCount={500} />)

		const slider = screen.getByTestId("alfacode-parallel-agent-count-slider") as HTMLInputElement
		expect(slider).toHaveAttribute("max", "500")
		expect(screen.getByText("500")).toBeInTheDocument()
	})

	it("supports up to 10 restart attempts", () => {
		render(
			<AlfaCodeSettings
				{...defaultProps}
				autoRestartProblematicProcesses={true}
				problematicProcessRestartLimit={10}
			/>,
		)

		const slider = screen.getByTestId("alfacode-problematic-process-restart-limit-slider") as HTMLInputElement
		expect(slider).toHaveAttribute("max", "10")
		expect(screen.getByText("10")).toBeInTheDocument()
	})
})
