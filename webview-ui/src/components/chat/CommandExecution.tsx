import { useCallback, useEffect, useMemo, useState, memo } from "react"
import { useEvent } from "react-use"
import { t } from "i18next"
import { ChevronDown, ChevronRight, Loader2, OctagonX } from "lucide-react"

import { type ExtensionMessage, type CommandExecutionStatus, commandExecutionStatusSchema } from "@roo-code/types"

import { safeJsonParse } from "@roo/core"
import { COMMAND_OUTPUT_STRING } from "@roo/combineCommandSequences"
import { parseCommand } from "@roo/parse-command"

import { vscode } from "@src/utils/vscode"
import { extractPatternsFromCommand } from "@src/utils/command-parser"
import { useExtensionState } from "@src/context/ExtensionStateContext"
import { cn } from "@src/lib/utils"

import { Button, StandardTooltip } from "@src/components/ui"
import CodeBlock from "../kilocode/common/CodeBlock" // kilocode_change
import { CommandPatternSelector } from "./CommandPatternSelector"

interface CommandPattern {
	pattern: string
	description?: string
}

interface CommandExecutionProps {
	executionId: string
	text?: string
	icon?: JSX.Element | null
	title?: JSX.Element | null
}

export const CommandExecution = ({ executionId, text, icon, title }: CommandExecutionProps) => {
	const {
		terminalShellIntegrationDisabled = true, // kilocode_change: default
		allowedCommands = [],
		deniedCommands = [],
		setAllowedCommands,
		setDeniedCommands,
	} = useExtensionState()

	const { command, output: parsedOutput } = useMemo(() => parseCommandAndOutput(text), [text])
	const [isExpanded, setIsExpanded] = useState(false)
	const [streamingOutput, setStreamingOutput] = useState("")
	const [status, setStatus] = useState<CommandExecutionStatus | null>(null)
	const output = streamingOutput || parsedOutput
	const hasOutput = output.trim().length > 0

	useEffect(() => {
		if (terminalShellIntegrationDisabled && hasOutput && status === null) {
			setIsExpanded(false)
		}
	}, [terminalShellIntegrationDisabled, hasOutput, status])

	useEffect(() => {
		if (status?.status === "started" || status?.status === "fallback") {
			setIsExpanded(true)
		}
		if (status?.status === "exited" || status?.status === "timeout") {
			setIsExpanded(false)
		}
	}, [status])

	const commandPatterns = useMemo<CommandPattern[]>(() => {
		const allCommands = parseCommand(command)
		const allPatterns = new Set<string>()

		allCommands.forEach((cmd) => {
			if (cmd.trim()) {
				allPatterns.add(cmd.trim())
			}
		})

		allCommands.forEach((cmd) => {
			const patterns = extractPatternsFromCommand(cmd)
			patterns.forEach((pattern) => allPatterns.add(pattern))
		})

		return Array.from(allPatterns).map((pattern) => ({ pattern }))
	}, [command])

	const handleAllowPatternChange = (pattern: string) => {
		const isAllowed = allowedCommands.includes(pattern)
		const newAllowed = isAllowed ? allowedCommands.filter((p) => p !== pattern) : [...allowedCommands, pattern]
		const newDenied = deniedCommands.filter((p) => p !== pattern)

		setAllowedCommands(newAllowed)
		setDeniedCommands(newDenied)

		vscode.postMessage({
			type: "updateSettings",
			updatedSettings: { allowedCommands: newAllowed, deniedCommands: newDenied },
		})
	}

	const handleDenyPatternChange = (pattern: string) => {
		const isDenied = deniedCommands.includes(pattern)
		const newDenied = isDenied ? deniedCommands.filter((p) => p !== pattern) : [...deniedCommands, pattern]
		const newAllowed = allowedCommands.filter((p) => p !== pattern)

		setAllowedCommands(newAllowed)
		setDeniedCommands(newDenied)

		vscode.postMessage({
			type: "updateSettings",
			updatedSettings: { allowedCommands: newAllowed, deniedCommands: newDenied },
		})
	}

	const onMessage = useCallback(
		(event: MessageEvent) => {
			const message: ExtensionMessage = event.data

			if (message.type !== "commandExecutionStatus") {
				return
			}

			const result = commandExecutionStatusSchema.safeParse(safeJsonParse(message.text, {}))
			if (!result.success || result.data.executionId !== executionId) {
				return
			}

			const data = result.data
			switch (data.status) {
				case "started":
					setStatus(data)
					break
				case "output":
					setStreamingOutput(data.output)
					break
				case "fallback":
					setStatus(data)
					setIsExpanded(true)
					break
				default:
					setStatus(data)
					break
			}
		},
		[executionId],
	)

	useEvent("message", onMessage)

	const isRunning = status?.status === "started"
	const isTimedOut = status?.status === "timeout"
	const exitCode = status?.status === "exited" ? status.exitCode : undefined
	const isSuccessful = exitCode === 0 || (status === null && hasOutput)
	const hasDetails = Boolean(command.trim() || hasOutput || commandPatterns.length > 0)
	const compactCommand = command.replace(/\s+/g, " ").trim()
	const statusText = isRunning
		? t("chat:commandExecution.running")
		: isTimedOut
			? t("chat:error")
			: exitCode !== undefined
				? t("chat.commandExecution.exitStatus", { exitCode })
				: hasOutput
					? t("chat:completed")
					: null

	return (
		<div className="ml-6 mt-2">
			<div className="bg-vscode-editor-background border border-vscode-panel-border rounded-sm overflow-hidden">
				<div className="flex items-center gap-2 px-2 py-1.5 min-w-0">
					<div className="flex items-center gap-2 min-w-0 flex-1">
						{icon}
						{title}
						<StatusIndicator
							isRunning={isRunning}
							isTimedOut={isTimedOut}
							exitCode={exitCode}
							isSuccessful={isSuccessful}
						/>
						{compactCommand && (
							<div className="min-w-0 flex-1 font-mono text-xs text-vscode-foreground/90 truncate">
								{compactCommand}
							</div>
						)}
					</div>
					<div className="flex items-center gap-1 shrink-0">
						{statusText && (
							<span className="text-xs text-vscode-descriptionForeground whitespace-nowrap">
								{statusText}
							</span>
						)}
						{isRunning && (
							<StandardTooltip content={t("chat:commandExecution.abortCommand")}>
								<Button
									variant="ghost"
									size="icon"
									title={t("chat:commandExecution.abortCommand")}
									aria-label={t("chat:commandExecution.abortCommand")}
									onClick={() =>
										vscode.postMessage({
											type: "terminalOperation",
											terminalOperation: "abort",
										})
									}>
									<OctagonX className="size-4" />
								</Button>
							</StandardTooltip>
						)}
						{hasDetails && (
							<Button
								variant="ghost"
								size="icon"
								title={
									isExpanded
										? t("chat:commandExecution.collapseOutput")
										: t("chat:commandExecution.expandOutput")
								}
								aria-label={
									isExpanded
										? t("chat:commandExecution.collapseOutput")
										: t("chat:commandExecution.expandOutput")
								}
								onClick={() => setIsExpanded((value) => !value)}>
								{isExpanded ? <ChevronDown className="size-4" /> : <ChevronRight className="size-4" />}
							</Button>
						)}
					</div>
				</div>

				<div
					className={cn("overflow-hidden transition-all duration-200", {
						"max-h-0": !isExpanded,
						"max-h-[420px] border-t border-vscode-panel-border": isExpanded,
					})}>
					<div className="p-2 space-y-2 overflow-y-auto max-h-[420px]">
						{(command.length > 0 || (!hasOutput && !command.trim())) && (
							<CodeBlock source={command} language="shell" />
						)}
						<OutputContainer isExpanded={isExpanded} output={output} />
						{command.trim().length > 0 && (
							<CommandPatternSelector
								patterns={commandPatterns}
								allowedCommands={allowedCommands}
								deniedCommands={deniedCommands}
								onAllowPatternChange={handleAllowPatternChange}
								onDenyPatternChange={handleDenyPatternChange}
							/>
						)}
					</div>
				</div>
			</div>
		</div>
	)
}

CommandExecution.displayName = "CommandExecution"

function StatusIndicator({
	isRunning,
	isTimedOut,
	exitCode,
	isSuccessful,
}: {
	isRunning: boolean
	isTimedOut: boolean
	exitCode: number | undefined
	isSuccessful: boolean
}) {
	if (isRunning) {
		return <Loader2 className="size-3.5 animate-spin text-blue-400 shrink-0" />
	}

	if (isTimedOut || (exitCode !== undefined && exitCode !== 0)) {
		return <div className="size-2 rounded-full bg-red-500 shrink-0" />
	}

	if (isSuccessful) {
		return <div className="size-2 rounded-full bg-green-500 shrink-0" />
	}

	return <div className="size-2 rounded-full bg-yellow-500/70 shrink-0" />
}

const OutputContainerInternal = ({ isExpanded, output }: { isExpanded: boolean; output: string }) => (
	<div
		className={cn("overflow-hidden", {
			"max-h-0": !isExpanded,
			"max-h-[100%]": isExpanded,
		})}>
		{output.length > 0 && <CodeBlock source={output} language="log" />}
	</div>
)

const OutputContainer = memo(OutputContainerInternal)

const parseCommandAndOutput = (text: string | undefined) => {
	if (!text) {
		return { command: "", output: "" }
	}

	const index = text.indexOf(COMMAND_OUTPUT_STRING)

	if (index === -1) {
		return { command: text, output: "" }
	}

	return {
		command: text.slice(0, index),
		output: text.slice(index + COMMAND_OUTPUT_STRING.length),
	}
}
