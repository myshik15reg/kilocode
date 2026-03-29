// kilocode_change - new file
import React, { useState, useEffect } from "react"
import { VSCodeTextField, VSCodeButton, VSCodeCheckbox } from "@vscode/webview-ui-toolkit/react"
import { CheckCircle2, XCircle, Loader2 } from "lucide-react"

import { StandardTooltip } from "@src/components/ui"
import { useAppTranslation } from "@src/i18n/TranslationContext"
import { vscode } from "@src/utils/vscode"

const SAVED_PASSWORD_PLACEHOLDER = "••••••••••••••••"

interface Neo4jSettingsProps {
	enabled: boolean
	uri: string
	username: string
	database: string
	password: string
	onPasswordChange: (password: string) => void
	setCachedStateField: (key: string, value: any) => void
}

export const Neo4jSettings: React.FC<Neo4jSettingsProps> = ({
	enabled,
	uri,
	username,
	database,
	password,
	onPasswordChange,
	setCachedStateField,
}) => {
	const { t } = useAppTranslation()
	const [isTestingConnection, setIsTestingConnection] = useState(false)
	const [hasSavedNeo4jPassword, setHasSavedNeo4jPassword] = useState(false)
	const [isPasswordFocused, setIsPasswordFocused] = useState(false)
	const [connectionTestResult, setConnectionTestResult] = useState<{
		success: boolean
		message: string
		version?: string
		databaseCreated?: boolean
	} | null>(null)

	// Request password status on mount
	useEffect(() => {
		vscode.postMessage({ type: "getNeo4jPasswordStatus" })
	}, [])

	// Listen for password status and connection test results
	useEffect(() => {
		const handleMessage = (event: MessageEvent) => {
			if (event.data.type === "neo4jPasswordStatus") {
				setHasSavedNeo4jPassword(Boolean(event.data.hasNeo4jPassword))
			} else if (event.data.type === "neo4jConnectionResult") {
				setConnectionTestResult(event.data.neo4jConnectionResult)
				setIsTestingConnection(false)
			}
		}

		window.addEventListener("message", handleMessage)
		return () => window.removeEventListener("message", handleMessage)
	}, [])

	const handleTestConnection = () => {
		setIsTestingConnection(true)
		setConnectionTestResult(null)

		vscode.postMessage({
			type: "neo4jConnectionTest",
			neo4jConfig: {
				uri,
				username,
				database: database || "neo4j",
			},
		})
	}

	const handleFieldChange = (field: string, value: string | boolean) => {
		setCachedStateField(field, value)
	}

	const handlePasswordInput = (e: any) => {
		onPasswordChange(e.target.value)
	}

	const shouldShowSavedPasswordPlaceholder = hasSavedNeo4jPassword && password.length === 0 && !isPasswordFocused
	const passwordPlaceholder = shouldShowSavedPasswordPlaceholder
		? SAVED_PASSWORD_PLACEHOLDER
		: t("settings:codeIndex.neo4j.passwordPlaceholder")

	return (
		<>
			{/* Enable Neo4j Toggle */}
			<div className="space-y-2 mb-4">
				<div className="flex items-center gap-2">
					<VSCodeCheckbox
						checked={enabled}
						onChange={(e: any) => handleFieldChange("codebaseIndexNeo4jEnabled", e.target.checked)}>
						<span className="flex items-center gap-2">
							<span className="font-medium">{t("settings:codeIndex.neo4j.enableLabel")}</span>
							<StandardTooltip
								content={t("settings:codeIndex.neo4j.enableDescription", {
									defaultValue: `${t("settings:codeIndex.neo4j.aboutPoint2")} • ${t(
										"settings:codeIndex.neo4j.aboutPoint3",
									)}`,
								})}
								maxWidth={360}>
								<span
									className="codicon codicon-info text-xs text-vscode-descriptionForeground cursor-help"
									onPointerDown={(e) => {
										e.preventDefault()
										e.stopPropagation()
									}}
									onClick={(e) => {
										e.preventDefault()
										e.stopPropagation()
									}}
									aria-label={t("settings:codeIndex.neo4j.enableDescription", {
										defaultValue: t("settings:codeIndex.neo4j.aboutTitle"),
									})}
								/>
							</StandardTooltip>
						</span>
					</VSCodeCheckbox>
				</div>
			</div>

			{/* Neo4j Connection Settings */}
			{enabled && (
				<div className="space-y-4 mt-4">
					<div className="rounded-md bg-vscode-editor-inactiveSelectionBackground/40 px-3 py-2 text-xs text-vscode-descriptionForeground">
						{t("settings:codeIndex.neo4j.autoCreateHint")}
					</div>

					{/* URI */}
					<div className="space-y-2">
						<label className="text-sm font-medium">{t("settings:codeIndex.neo4j.uriLabel")}</label>
						<VSCodeTextField
							value={uri || ""}
							onInput={(e: any) => handleFieldChange("codebaseIndexNeo4jUri", e.target.value)}
							placeholder={t("settings:codeIndex.neo4j.uriPlaceholder")}
							className="w-full"
						/>
					</div>

					{/* Username */}
					<div className="space-y-2">
						<label className="text-sm font-medium">{t("settings:codeIndex.neo4j.usernameLabel")}</label>
						<VSCodeTextField
							value={username || ""}
							onInput={(e: any) => handleFieldChange("codebaseIndexNeo4jUsername", e.target.value)}
							placeholder={t("settings:codeIndex.neo4j.usernamePlaceholder")}
							className="w-full"
						/>
					</div>

					{/* Database */}
					<div className="space-y-2">
						<label className="text-sm font-medium">{t("settings:codeIndex.neo4j.databaseLabel")}</label>
						<VSCodeTextField
							value={database || ""}
							onInput={(e: any) => handleFieldChange("codebaseIndexNeo4jDatabase", e.target.value)}
							placeholder={t("settings:codeIndex.neo4j.databasePlaceholder")}
							className="w-full"
						/>
					</div>

					{/* Password */}
					<div className="space-y-2">
						<label className="text-sm font-medium">{t("settings:codeIndex.neo4j.passwordLabel")}</label>
						<VSCodeTextField
							type="password"
							value={password}
							onInput={handlePasswordInput}
							onFocus={() => setIsPasswordFocused(true)}
							onBlur={() => setIsPasswordFocused(false)}
							placeholder={passwordPlaceholder}
							className="w-full"
							data-testid="neo4j-password"
							data-has-saved-password={hasSavedNeo4jPassword ? "true" : "false"}
						/>
						<p className="text-xs text-vscode-descriptionForeground mt-1 mb-0">
							{t("settings:codeIndex.neo4j.passwordDescription")}
						</p>
					</div>

					{/* Test Connection Button */}
					<div className="mt-4">
						<VSCodeButton
							appearance="secondary"
							onClick={handleTestConnection}
							disabled={isTestingConnection || !uri || !username}>
							{isTestingConnection ? (
								<>
									<Loader2 className="animate-spin mr-2" />
									{t("settings:codeIndex.neo4j.testingConnection")}
								</>
							) : (
								t("settings:codeIndex.neo4j.testConnectionButton")
							)}
						</VSCodeButton>
					</div>

					{/* Connection Test Result */}
					{connectionTestResult && (
						<div
							className={`mt-2 rounded-md px-3 py-2 ${
								connectionTestResult.success
									? "bg-green-50 text-green-800 dark:bg-green-900/20 dark:text-green-300"
									: "bg-red-50 text-red-800 dark:bg-red-900/20 dark:text-red-300"
							}`}>
							<div className="flex items-start gap-2">
								{connectionTestResult.success ? (
									<CheckCircle2 className="mt-0.5 h-4 w-4 flex-shrink-0" />
								) : (
									<XCircle className="mt-0.5 h-4 w-4 flex-shrink-0" />
								)}
								<div className="flex-1">
									<p className="text-sm font-medium">{connectionTestResult.message}</p>
									{connectionTestResult.success && connectionTestResult.databaseCreated && (
										<p className="mt-1 text-xs text-vscode-descriptionForeground">
											{t("settings:codeIndex.neo4j.databaseCreatedHint")}
										</p>
									)}
									{connectionTestResult.version && (
										<p className="text-xs text-vscode-descriptionForeground mt-1">
											{t("settings:codeIndex.neo4j.version", {
												version: connectionTestResult.version,
											})}
										</p>
									)}
								</div>
							</div>
						</div>
					)}
				</div>
			)}
		</>
	)
}
