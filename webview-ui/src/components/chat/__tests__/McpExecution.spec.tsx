import { fireEvent, render, screen, waitFor } from "@/utils/test-utils"

import { McpExecution } from "../McpExecution"

vi.mock("react-i18next", async (importOriginal) => {
	const actual = await importOriginal<typeof import("react-i18next")>()
	return {
		...actual,
		useTranslation: () => ({
			t: (key: string) => key,
		}),
	}
})

describe("McpExecution", () => {
	it("does not append duplicate output chunks twice", async () => {
		render(
			<McpExecution
				executionId="exec-1"
				serverName="test-server"
				toolName="test-tool"
				initiallyExpanded={true}
			/>,
		)

		fireEvent(
			window,
			new MessageEvent("message", {
				data: {
					type: "mcpExecutionStatus",
					text: JSON.stringify({
						executionId: "exec-1",
						status: "started",
						serverName: "test-server",
						toolName: "test-tool",
					}),
				},
			}),
		)

		fireEvent(
			window,
			new MessageEvent("message", {
				data: {
					type: "mcpExecutionStatus",
					text: JSON.stringify({ executionId: "exec-1", status: "output", response: "hello" }),
				},
			}),
		)

		fireEvent(
			window,
			new MessageEvent("message", {
				data: {
					type: "mcpExecutionStatus",
					text: JSON.stringify({ executionId: "exec-1", status: "output", response: "hello" }),
				},
			}),
		)

		fireEvent(
			window,
			new MessageEvent("message", {
				data: {
					type: "mcpExecutionStatus",
					text: JSON.stringify({ executionId: "exec-1", status: "completed" }),
				},
			}),
		)

		await waitFor(() => {
			expect(screen.getByText("hello")).toBeInTheDocument()
		})
		expect(screen.queryByText("hellohello")).not.toBeInTheDocument()
	})
})
