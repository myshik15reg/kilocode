import { render, screen } from "@/utils/test-utils"

import { TranslationProvider } from "@/i18n/__mocks__/TranslationContext"

import { About } from "../About"

vi.mock("@/utils/vscode", () => ({
	vscode: { postMessage: vi.fn() },
}))

vi.mock("@/i18n/TranslationContext", () => {
	const actual = vi.importActual("@/i18n/TranslationContext")
	return {
		...actual,
		useAppTranslation: () => ({
			t: (key: string, options?: Record<string, string>) => {
				if (key === "settings:about.versionWithSha") {
					return `Version: ${options?.version} (${options?.sha})`
				}
				if (key === "settings:about.version") {
					return `Version: ${options?.version}`
				}
				return key
			},
		}),
	}
})

vi.mock("react-i18next", () => ({
	Trans: ({ components = {} }: any) => (
		<>
			{components.githubLink}
			{components.redditLink}
			{components.discordLink}
			{components.supportLink}
		</>
	),
}))

vi.mock("@vscode/webview-ui-toolkit/react", () => ({
	VSCodeCheckbox: ({ children, ...props }: any) => <label {...props}>{children}</label>,
	VSCodeLink: ({ children, href, ...props }: any) => (
		<a href={href} {...props}>
			{children}
		</a>
	),
}))

vi.mock("@roo/package", () => ({
	Package: {
		version: "1.0.0",
		sha: "abc12345",
	},
}))

describe("About", () => {
	const defaultProps = {
		telemetrySetting: "enabled" as const,
		setTelemetrySetting: vi.fn(),
		isVsCode: true,
	}

	beforeEach(() => {
		vi.clearAllMocks()
	})

	it("renders the About section header", () => {
		render(
			<TranslationProvider>
				<About {...defaultProps} />
			</TranslationProvider>,
		)
		expect(screen.getByText("settings:sections.about")).toBeInTheDocument()
	})

	it("displays version information", () => {
		render(
			<TranslationProvider>
				<About {...defaultProps} />
			</TranslationProvider>,
		)
		expect(screen.getByText(/Version: 1\.0\.0/)).toBeInTheDocument()
	})

	it("renders AlfaCode assistant footer links", () => {
		const { container } = render(
			<TranslationProvider>
				<About {...defaultProps} />
			</TranslationProvider>,
		)
		expect(container.querySelectorAll('a[href="https://github.com/Alfa-Org/alfacode"]').length).toBe(1)
		expect(container.querySelectorAll('a[href="https://reddit.com/r/AlfaCodeAssistant"]').length).toBe(1)
		expect(container.querySelectorAll('a[href="https://alfacode.ai/support"]').length).toBe(1)
	})

	it("renders export, import, and reset buttons", () => {
		render(
			<TranslationProvider>
				<About {...defaultProps} />
			</TranslationProvider>,
		)
		expect(screen.getByText("settings:footer.settings.export")).toBeInTheDocument()
		expect(screen.getByText("settings:footer.settings.import")).toBeInTheDocument()
		expect(screen.getByText("settings:footer.settings.reset")).toBeInTheDocument()
	})
})
