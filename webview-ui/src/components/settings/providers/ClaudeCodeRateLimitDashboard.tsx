import React, { useEffect, useState, useCallback } from "react"
import type { ClaudeCodeRateLimitInfo } from "@roo-code/types"
import { useAppTranslation } from "@src/i18n/TranslationContext"
import { vscode } from "@src/utils/vscode"

interface ClaudeCodeRateLimitDashboardProps {
	isAuthenticated: boolean
}

/**
 * Formats a Unix timestamp reset time into a human-readable duration
 */
function formatDuration(resetTimestamp: number, t: (key: string, options?: Record<string, any>) => string): string {
	if (!resetTimestamp) return t("settings:providers.claudeCodeRateLimits.time.notAvailable")

	const now = Date.now() / 1000 // Current time in seconds
	const diff = resetTimestamp - now

	if (diff <= 0) return t("settings:providers.claudeCodeRateLimits.time.now")

	const hours = Math.floor(diff / 3600)
	const minutes = Math.floor((diff % 3600) / 60)

	if (hours > 24) {
		const days = Math.floor(hours / 24)
		const remainingHours = hours % 24
		return t("settings:providers.claudeCodeRateLimits.duration.daysHours", { days, hours: remainingHours })
	}

	if (hours > 0) {
		return t("settings:providers.claudeCodeRateLimits.duration.hoursMinutes", { hours, minutes })
	}

	return t("settings:providers.claudeCodeRateLimits.duration.minutes", { minutes })
}

/**
 * Formats utilization as a percentage
 */
function formatUtilization(utilization: number): string {
	return `${(utilization * 100).toFixed(1)}%`
}

/**
 * Progress bar component for displaying usage
 */
const UsageProgressBar: React.FC<{ utilization: number; label: string }> = ({ utilization, label }) => {
	const percentage = Math.min(utilization * 100, 100)
	const isWarning = percentage >= 70
	const isCritical = percentage >= 90

	return (
		<div className="w-full">
			<div className="text-xs text-vscode-descriptionForeground mb-1">{label}</div>
			<div className="w-full bg-vscode-input-background rounded-sm h-2 overflow-hidden">
				<div
					className={`h-full transition-all duration-300 ${
						isCritical
							? "bg-vscode-errorForeground"
							: isWarning
								? "bg-vscode-editorWarning-foreground"
								: "bg-vscode-button-background"
					}`}
					style={{ width: `${percentage}%` }}
				/>
			</div>
		</div>
	)
}

export const ClaudeCodeRateLimitDashboard: React.FC<ClaudeCodeRateLimitDashboardProps> = ({ isAuthenticated }) => {
	const { t } = useAppTranslation()
	const [rateLimits, setRateLimits] = useState<ClaudeCodeRateLimitInfo | null>(null)
	const [isLoading, setIsLoading] = useState(false)
	const [error, setError] = useState<string | null>(null)

	const fetchRateLimits = useCallback(() => {
		if (!isAuthenticated) {
			setRateLimits(null)
			setError(null)
			return
		}

		setIsLoading(true)
		setError(null)
		vscode.postMessage({ type: "requestClaudeCodeRateLimits" })
	}, [isAuthenticated])

	useEffect(() => {
		const handleMessage = (event: MessageEvent) => {
			const message = event.data
			if (message.type === "claudeCodeRateLimits") {
				setIsLoading(false)
				if (message.error) {
					setError(message.error)
					setRateLimits(null)
				} else if (message.values) {
					setRateLimits(message.values)
					setError(null)
				}
			}
		}

		window.addEventListener("message", handleMessage)
		return () => window.removeEventListener("message", handleMessage)
	}, [])

	// Fetch rate limits when authenticated
	useEffect(() => {
		if (isAuthenticated) {
			fetchRateLimits()
		}
	}, [isAuthenticated, fetchRateLimits])

	if (!isAuthenticated) {
		return null
	}

	if (isLoading && !rateLimits) {
		return (
			<div className="bg-vscode-editor-background border border-vscode-panel-border rounded-md p-3">
				<div className="text-sm text-vscode-descriptionForeground">
					{t("settings:providers.claudeCodeRateLimits.loading")}
				</div>
			</div>
		)
	}

	if (error) {
		return (
			<div className="bg-vscode-editor-background border border-vscode-panel-border rounded-md p-3">
				<div className="flex items-center justify-between">
					<div className="text-sm text-vscode-errorForeground">
						{t("settings:providers.claudeCodeRateLimits.loadError")}
					</div>
					<button
						onClick={fetchRateLimits}
						className="text-xs text-vscode-textLink-foreground hover:text-vscode-textLink-activeForeground cursor-pointer bg-transparent border-none">
						{t("settings:providers.claudeCodeRateLimits.retry")}
					</button>
				</div>
				<div className="mt-2 text-xs text-vscode-descriptionForeground break-words">{error}</div>
			</div>
		)
	}

	if (!rateLimits) {
		return null
	}

	const fiveHourLimit = rateLimits.representativeClaim || t("settings:providers.claudeCodeRateLimits.window.fiveHour")
	const fiveHourUsage = t("settings:providers.claudeCodeRateLimits.usedPercent", {
		percent: formatUtilization(rateLimits.fiveHour.utilization),
	})
	const fiveHourReset = t("settings:providers.claudeCodeRateLimits.resetsIn", {
		time: formatDuration(rateLimits.fiveHour.resetTime, t),
	})

	return (
		<div className="bg-vscode-editor-background border border-vscode-panel-border rounded-md p-3">
			<div className="mb-3">
				<div className="text-sm font-medium text-vscode-foreground">
					{t("settings:providers.claudeCodeRateLimits.title")}
				</div>
			</div>

			<div className="space-y-3">
				<div className="flex flex-col gap-1">
					<div className="flex items-center justify-between text-xs">
						<span className="text-vscode-foreground">
							{t("settings:providers.claudeCodeRateLimits.limitLabel", { limit: fiveHourLimit })}
						</span>
						<span className="text-vscode-descriptionForeground">
							{fiveHourUsage} • {fiveHourReset}
						</span>
					</div>
					<UsageProgressBar utilization={rateLimits.fiveHour.utilization} label="" />
				</div>

				{rateLimits.weeklyUnified && rateLimits.weeklyUnified.utilization > 0 && (
					<div className="flex flex-col gap-1">
						<div className="flex items-center justify-between text-xs">
							<span className="text-vscode-foreground">
								{t("settings:providers.claudeCodeRateLimits.window.weekly")}
							</span>
							<span className="text-vscode-descriptionForeground">
								{t("settings:providers.claudeCodeRateLimits.usedPercent", {
									percent: formatUtilization(rateLimits.weeklyUnified.utilization),
								})}{" "}
								•{" "}
								{t("settings:providers.claudeCodeRateLimits.resetsIn", {
									time: formatDuration(rateLimits.weeklyUnified.resetTime, t),
								})}
							</span>
						</div>
						<UsageProgressBar utilization={rateLimits.weeklyUnified.utilization} label="" />
					</div>
				)}
			</div>
		</div>
	)
}
