import { HTMLAttributes } from "react"

import { VSCodeButton, VSCodeLink } from "@vscode/webview-ui-toolkit/react"

import { vscode } from "@/utils/vscode"
import { cn } from "@/lib/utils"

type SettingsFooterProps = HTMLAttributes<HTMLDivElement> & {
	version: string
}

export const SettingsFooter = ({ version, className, ...props }: SettingsFooterProps) => (
	<div className={cn("text-vscode-descriptionForeground p-5", className)} {...props}>
		<p style={{ wordWrap: "break-word", margin: 0, padding: 0 }}>
			If you have any questions or feedback, feel free to open an issue at{" "}
			<VSCodeLink href="https://github.com/Alfa-Org/alfacode" style={{ display: "inline" }}>
				github.com/Alfa-Org/alfacode
			</VSCodeLink>{" "}
			or join{" "}
			<VSCodeLink href="https://www.reddit.com/r/AlfaCodeAssistant/" style={{ display: "inline" }}>
				reddit.com/r/AlfaCodeAssistant
			</VSCodeLink>
			.
		</p>
		<p style={{ wordWrap: "break-word", margin: 0, padding: 0 }}>
			Regarding financial questions, please contact AlfaCode assistant support at{" "}
			{/* kilocode_change start: rebrand visible support link */}
			<VSCodeLink href="https://alfacode.ai/support" style={{ display: "inline" }}>
				alfacode.ai/support
			</VSCodeLink>{" "}
			{/* kilocode_change end */}
		</p>
		<p className="italic">AlfaCode assistant v{version}</p>
		<div className="flex justify-between items-center gap-3">
			<p>Reset all global state and secret storage in the extension.</p>
			<VSCodeButton
				onClick={() => vscode.postMessage({ type: "resetState" })}
				appearance="secondary"
				className="shrink-0">
				<span className="codicon codicon-warning text-vscode-errorForeground mr-1" />
				Reset
			</VSCodeButton>
		</div>
	</div>
)
