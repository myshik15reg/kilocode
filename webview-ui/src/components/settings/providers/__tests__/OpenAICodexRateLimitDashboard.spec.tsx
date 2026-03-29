import { render, screen, waitFor } from "@/utils/test-utils"

import { ClaudeCodeRateLimitDashboard } from "../ClaudeCodeRateLimitDashboard"
import { OpenAICodexRateLimitDashboard } from "../OpenAICodexRateLimitDashboard"

vi.mock("@src/i18n/TranslationContext", () => ({
	useAppTranslation: () => ({
		t: (key: string, options?: Record<string, any>) => {
			switch (key) {
				case "settings:providers.openAiCodexRateLimits.title":
					return `Usage Limits for Codex${options?.planLabel ?? ""}`
				case "settings:providers.openAiCodexRateLimits.plan.withType":
					return ` (${options?.planType ?? ""})`
				case "settings:providers.openAiCodexRateLimits.plan.default":
					return ""
				case "settings:providers.openAiCodexRateLimits.window.fiveHour":
					return "5h limit"
				case "settings:providers.openAiCodexRateLimits.window.weekly":
					return "Weekly limit"
				case "settings:providers.openAiCodexRateLimits.usedPercent":
					return `${options?.percent ?? ""}% used`
				case "settings:providers.claudeCodeRateLimits.title":
					return "Usage Limits"
				case "settings:providers.claudeCodeRateLimits.loading":
					return "Loading rate limits..."
				case "settings:providers.claudeCodeRateLimits.loadError":
					return "Failed to load rate limits"
				case "settings:providers.claudeCodeRateLimits.retry":
					return "Retry"
				case "settings:providers.claudeCodeRateLimits.usedPercent":
					return `${options?.percent ?? ""} used`
				case "settings:providers.claudeCodeRateLimits.resetsIn":
					return `resets in ${options?.time ?? ""}`
				case "settings:providers.claudeCodeRateLimits.time.now":
					return "Now"
				case "settings:providers.claudeCodeRateLimits.time.notAvailable":
					return "N/A"
				case "settings:providers.claudeCodeRateLimits.duration.daysHours":
					return `${options?.days ?? ""}d ${options?.hours ?? ""}h`
				case "settings:providers.claudeCodeRateLimits.duration.hoursMinutes":
					return `${options?.hours ?? ""}h ${options?.minutes ?? ""}m`
				case "settings:providers.claudeCodeRateLimits.duration.minutes":
					return `${options?.minutes ?? ""}m`
				case "settings:providers.claudeCodeRateLimits.window.fiveHour":
					return "5-hour"
				case "settings:providers.claudeCodeRateLimits.window.weekly":
					return "Weekly"
				case "settings:providers.claudeCodeRateLimits.limitLabel":
					return `Limit: ${options?.limit ?? ""}`
				default:
					return key
			}
		},
	}),
}))

const { postMessageMock } = vi.hoisted(() => ({
	postMessageMock: vi.fn(),
}))

vi.mock("@src/utils/vscode", () => ({
	vscode: {
		postMessage: postMessageMock,
	},
}))

describe("ClaudeCodeRateLimitDashboard", () => {
	beforeEach(() => {
		postMessageMock.mockClear()
	})

	it("hides when not authenticated", () => {
		const { container } = render(<ClaudeCodeRateLimitDashboard isAuthenticated={false} />)
		expect(container.firstChild).toBeNull()
	})

	it("sends request message when authenticated", () => {
		render(<ClaudeCodeRateLimitDashboard isAuthenticated={true} />)
		expect(postMessageMock).toHaveBeenCalledWith({ type: "requestClaudeCodeRateLimits" })
	})

	it("renders translated usage values from payload", () => {
		render(<ClaudeCodeRateLimitDashboard isAuthenticated={true} />)

		window.dispatchEvent(
			new MessageEvent("message", {
				data: {
					type: "claudeCodeRateLimits",
					values: {
						fiveHour: { utilization: 0.123, resetTime: Date.now() / 1000 + 60 },
						weeklyUnified: { utilization: 0.456, resetTime: Date.now() / 1000 + 120 },
						representativeClaim: "5-hour",
					},
				},
			}),
		)

		return waitFor(() => {
			expect(screen.getByText("Usage Limits")).toBeInTheDocument()
			expect(screen.getByText("Limit: 5-hour")).toBeInTheDocument()
			expect(screen.getByText("Weekly")).toBeInTheDocument()
			expect(screen.getByText(/12.3% used/)).toBeInTheDocument()
			expect(screen.getByText(/45.6% used/)).toBeInTheDocument()
		})
	})
})

describe("OpenAICodexRateLimitDashboard", () => {
	beforeEach(() => {
		postMessageMock.mockClear()
	})

	it("hides when not authenticated", () => {
		const { container } = render(<OpenAICodexRateLimitDashboard isAuthenticated={false} />)
		expect(container.firstChild).toBeNull()
	})

	it("sends request message when authenticated", () => {
		render(<OpenAICodexRateLimitDashboard isAuthenticated={true} />)
		expect(postMessageMock).toHaveBeenCalledWith({ type: "requestOpenAiCodexRateLimits" })
	})

	it("renders usage values from payload", () => {
		render(<OpenAICodexRateLimitDashboard isAuthenticated={true} />)

		window.dispatchEvent(
			new MessageEvent("message", {
				data: {
					type: "openAiCodexRateLimits",
					values: {
						primary: { usedPercent: 12.3, windowMinutes: 300, resetsAt: Date.now() + 60_000 },
						secondary: { usedPercent: 45.6, windowMinutes: 10080, resetsAt: Date.now() + 120_000 },
						credits: { hasCredits: true, unlimited: true },
						fetchedAt: Date.now(),
						planType: "pro",
					},
				},
			}),
		)

		return waitFor(() => {
			expect(screen.getByText(/Usage Limits for Codex \(pro\)/)).toBeInTheDocument()
			expect(screen.getByText(/5h limit/)).toBeInTheDocument()
			expect(screen.getByText(/Weekly limit/)).toBeInTheDocument()
			expect(screen.getByText(/12% used/)).toBeInTheDocument()
			expect(screen.getByText(/46% used/)).toBeInTheDocument()
		})
	})
})
