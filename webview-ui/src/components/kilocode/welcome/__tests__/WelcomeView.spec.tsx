// npx vitest src/components/kilocode/welcome/__tests__/WelcomeView.spec.tsx

import { render, screen } from "@/utils/test-utils"

import * as ExtensionStateContext from "@/context/ExtensionStateContext"
const { ExtensionStateContextProvider } = ExtensionStateContext

import WelcomeView from "../WelcomeView"

vi.mock("../../../common/Tab", () => ({
	Tab: ({ children }: any) => <div data-testid="tab">{children}</div>,
	TabContent: ({ children }: any) => <div data-testid="tab-content">{children}</div>,
}))

vi.mock("../../../settings/ApiOptions", () => ({
	default: ({ hideKiloCodeButton }: any) => (
		<div data-testid="api-options" data-hide-kilo-code-button={String(!!hideKiloCodeButton)}>
			API Options Component
		</div>
	),
}))

vi.mock("../../common/ButtonPrimary", () => ({
	ButtonPrimary: ({ children, onClick }: any) => (
		<button data-testid="button-primary" onClick={onClick}>
			{children}
		</button>
	),
}))

vi.mock("../../common/ButtonLink", () => ({
	ButtonLink: ({ children, href }: any) => (
		<a data-testid="button-link" href={href}>
			{children}
		</a>
	),
}))

vi.mock("../../common/KiloCodeAuth", () => ({
	default: () => <div data-testid="kilocode-auth">KiloCodeAuth</div>,
}))

vi.mock("../../helpers", () => ({
	getKiloCodeBackendSignInUrl: () => "https://example.com/signin",
}))

vi.mock("../../../i18n/TranslationContext", () => ({
	useAppTranslation: () => ({
		t: (key: string) => key,
	}),
}))

vi.mock("../../../utils/vscode", () => ({
	vscode: {
		postMessage: vi.fn(),
	},
}))

const renderWelcomeView = (extensionState: Partial<ReturnType<typeof ExtensionStateContext.useExtensionState>> = {}) => {
	const useExtensionStateMock = vi.spyOn(ExtensionStateContext, "useExtensionState")
	useExtensionStateMock.mockReturnValue({
		apiConfiguration: {},
		currentApiConfigName: "default",
		setApiConfiguration: vi.fn(),
		uriScheme: "vscode",
		uiKind: "sidebar",
		kiloCodeWrapperProperties: undefined,
		...extensionState,
	} as any)

	render(
		<ExtensionStateContextProvider>
			<WelcomeView />
		</ExtensionStateContextProvider>,
	)
}

describe("WelcomeView (KiloCode)", () => {
	beforeEach(() => {
		vi.clearAllMocks()
	})

	it("defaults to manual config view (BYOK) instead of the welcome screen", () => {
		renderWelcomeView()

		expect(screen.getByTestId("api-options")).toBeInTheDocument()
		expect(screen.getByTestId("api-options")).toHaveAttribute("data-hide-kilo-code-button", "true")

		expect(screen.getByTestId("button-primary")).toBeInTheDocument()
		expect(screen.getByText("welcome:start")).toBeInTheDocument()

		expect(screen.queryByTestId("kilocode-auth")).not.toBeInTheDocument()
		expect(screen.queryByTestId("button-link")).not.toBeInTheDocument()
	})

	it("shows sign-in link only when the KiloCode provider is selected but missing a token", () => {
		renderWelcomeView({
			apiConfiguration: { apiProvider: "kilocode" },
		} as any)

		expect(screen.getByTestId("api-options")).toBeInTheDocument()
		expect(screen.getByTestId("button-link")).toBeInTheDocument()
		expect(screen.getByTestId("button-link")).toHaveAttribute("href", "https://example.com/signin")

		expect(screen.queryByTestId("button-primary")).not.toBeInTheDocument()
	})
})

