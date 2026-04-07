import React from "react"
import { render, screen } from "@src/utils/test-utils"

import { ChatRowContent } from "../ChatRow"

let mockExtensionState: any = {}

vi.mock("@src/context/ExtensionStateContext", () => ({
	useExtensionState: () => mockExtensionState,
}))

vi.mock("react-i18next", () => ({
	useTranslation: () => ({
		t: (key: string) => key,
		i18n: { language: "en" },
	}),
	Trans: ({ children }: { children?: React.ReactNode }) => <>{children}</>,
	initReactI18next: { type: "3rdParty", init: () => {} },
}))

vi.mock("@src/utils/vscode", () => ({
	vscode: {
		postMessage: vi.fn(),
	},
}))

vi.mock("@src/components/ui/hooks/useSelectedModel", () => ({
	useSelectedModel: () => ({ info: undefined }),
}))

function renderFollowup(message: any) {
	mockExtensionState = {
		apiConfiguration: {},
		mcpServers: [],
		alwaysAllowMcp: false,
		currentCheckpoint: undefined,
		mode: "code",
		clineMessages: [],
		showTimestamps: false,
		hideCostBelowThreshold: 0,
	}

	return render(
		<ChatRowContent
			message={message}
			isExpanded={false}
			isLast={false}
			isStreaming={false}
			onToggleExpand={() => {}}
			onSuggestionClick={() => {}}
			onBatchFileResponse={() => {}}
			onFollowUpUnmount={() => {}}
			isFollowUpAnswered={false}
		/>,
	)
}

describe("ChatRow followup fallback", () => {
	it("renders plain-text followup prompts when structured metadata is present", () => {
		renderFollowup({
			type: "ask",
			ask: "followup",
			ts: Date.now(),
			text: "Please answer the structured questions.",
			metadata: {
				requestUserInput: {
					questions: [
						{
							header: "Scope",
							question: "Which slice should I implement first?",
							options: [
								{ label: "Search", description: "Start with search." },
								{ label: "UI", description: "Start with UI." },
							],
						},
					],
				},
			},
		})

		expect(screen.getByText("Please answer the structured questions.")).toBeInTheDocument()
	})
})
