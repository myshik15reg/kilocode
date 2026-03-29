import { render, screen, fireEvent } from "@/utils/test-utils"

import { NotificationSettings } from "../NotificationSettings"
import { vscode } from "@/utils/vscode"

vi.mock("@/utils/vscode", () => ({
	vscode: { postMessage: vi.fn() },
}))

vi.mock("@/i18n/TranslationContext", () => ({
	useAppTranslation: () => ({
		t: (key: string) => key,
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
	Button: ({ children, onClick, ...props }: any) => (
		<button onClick={onClick} {...props}>
			{children}
		</button>
	),
	Slider: ({ "data-testid": dataTestId }: any) => <div data-testid={dataTestId || "slider"} />,
}))

describe("NotificationSettings", () => {
	const setCachedStateField = vi.fn()

	beforeEach(() => {
		vi.clearAllMocks()
	})

	it("renders restored system notifications control", () => {
		render(
			<NotificationSettings
				ttsEnabled={false}
				soundEnabled={false}
				systemNotificationsEnabled={true}
				setCachedStateField={setCachedStateField}
			/>,
		)

		expect(screen.getByTestId("system-notifications-enabled-checkbox")).toBeInTheDocument()
		expect(screen.getByTestId("test-system-notification")).toBeInTheDocument()
	})

	it("sends a system notification test event", () => {
		render(
			<NotificationSettings
				ttsEnabled={false}
				soundEnabled={false}
				systemNotificationsEnabled={true}
				setCachedStateField={setCachedStateField}
			/>,
		)

		fireEvent.click(screen.getByTestId("test-system-notification"))

		expect(vscode.postMessage).toHaveBeenCalledWith(
			expect.objectContaining({
				type: "showSystemNotification",
				alwaysAllow: true,
			}),
		)
	})
})
