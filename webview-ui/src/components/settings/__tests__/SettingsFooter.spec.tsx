import { render, screen } from "@/utils/test-utils"

import { SettingsFooter } from "../SettingsFooter"

vi.mock("@/utils/vscode", () => ({
	vscode: { postMessage: vi.fn() },
}))

vi.mock("@vscode/webview-ui-toolkit/react", () => ({
	VSCodeButton: ({ children, ...props }: any) => <button {...props}>{children}</button>,
	VSCodeLink: ({ children, href, ...props }: any) => (
		<a href={href} {...props}>
			{children}
		</a>
	),
}))

describe("SettingsFooter", () => {
	it("renders AlfaCode assistant support and community links", () => {
		render(<SettingsFooter version="1.2.3" />)

		expect(screen.getByText("reddit.com/r/AlfaCodeAssistant")).toBeInTheDocument()
		expect(screen.getByText("alfacode.ai/support")).toBeInTheDocument()
		expect(screen.getByText(/AlfaCode assistant support/i)).toBeInTheDocument()
		expect(screen.getByText("AlfaCode assistant v1.2.3")).toBeInTheDocument()
	})
})
