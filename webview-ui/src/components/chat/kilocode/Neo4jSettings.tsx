// kilocode_change - new file
import React, { useState, useEffect } from "react"
import { VSCodeTextField, VSCodeButton, VSCodeCheckbox } from "@vscode/webview-ui-toolkit/react"
import { CheckCircle2, XCircle, Loader2 } from "lucide-react"

import { useAppTranslation } from "@src/i18n/TranslationContext"
import { vscode } from "@src/utils/vscode"

interface Neo4jSettingsProps {
	enabled: boolean
	uri: string
	username: string
	database: string
	setCachedStateField: (key: string, value: any) => void
}

export const Neo4jSettings: React.FC<Neo4jSettingsProps> = ({
	enabled,
	uri,
	username,
	database,
	setCachedStateField,
}) => {
	const { t } = useAppTranslation()
	const [isTestingConnection, setIsTestingConnection] = useState(false)
	const [connectionTestResult, setConnectionTestResult] = useState<{
		success: boolean
		message: string
		version?: string
	} | null>(null)

	// Request password status on mount
	useEffect(() => {
		vscode.postMessage({ type: "getNeo4jPasswordStatus" })
	}, [])

	// Listen for password status and connection test results
	useEffect(() => {
		const handleMessage = (event: MessageEvent) => {
			if (event.data.type === "neo4jPasswordStatus") {
				// Password status is handled by parent component
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

	return (
		<>
			{/* Enable Neo4j Toggle */}
			<div className="space-y-2 mb-4">
				<div className="flex items-center gap-2">
					<VSCodeCheckbox
						checked={enabled}
						onChange={(e: any) => handleFieldChange("codebaseIndexNeo4jEnabled", e.target.checked)}>
						<span className="font-medium">{t("settings:codeIndex.neo4j.enableLabel")}</span>
					</VSCodeCheckbox>
				</div>
			</div>

			{/* Neo4j Connection Settings */}
			{enabled && (
				<div className="space-y-4 mt-4">
					{/* URI */}
					<div className="space-y-2">
						<label className="text-sm font-medium">
							{t("settings:codeIndex.neo4j.uriLabel")}
						</label>
						<VSCodeTextField
							value={uri || ""}
							onInput={(e: any) => handleFieldChange("codebaseIndexNeo4jUri", e.target.value)}
							placeholder={t("settings:codeIndex.neo4j.uriPlaceholder")}
							className="w-full"
						/>
					</div>

					{/* Username */}
					<div className="space-y-2">
						<label className="text-sm font-medium">
							{t("settings:codeIndex.neo4j.usernameLabel")}
						</label>
						<VSCodeTextField
							value={username || ""}
							onInput={(e: any) => handleFieldChange("codebaseIndexNeo4jUsername", e.target.value)}
							placeholder={t("settings:codeIndex.neo4j.usernamePlaceholder")}
							className="w-full"
						/>
					</div>

					{/* Database */}
					<div className="space-y-2">
						<label className="text-sm font-medium">
							{t("settings:codeIndex.neo4j.databaseLabel")}
						</label>
						<VSCodeTextField
							value={database || ""}
							onInput={(e: any) => handleFieldChange("codebaseIndexNeo4jDatabase", e.target.value)}
							placeholder={t("settings:codeIndex.neo4j.databasePlaceholder")}
							className="w-full"
						/>
					</div>

					{/* Password */}
					<div className="space-y-2">
						<label className="text-sm font-medium">
							{t("settings:codeIndex.neo4j.passwordLabel")}
						</label>
						<VSCodeTextField
							type="password"
							placeholder={t("settings:codeIndex.neo4j.passwordPlaceholder")}
							className="w-full"
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
							className={`mt-2 p-3 rounded border ${
								connectionTestResult.success
									? "border-green-500 bg-green-50 dark:bg-green-900/20"
									: "border-red-500 bg-red-50 dark:bg-red-900/20"
							}`}>
							<div className="flex items-start gap-2">
								{connectionTestResult.success ? (
									<CheckCircle2 className="w-5 h-5 text-green-600 dark:text-green-400 flex-shrink-0 mt-0.5" />
								) : (
									<XCircle className="w-5 h-5 text-red-600 dark:text-red-400 flex-shrink-0 mt-0.5" />
								)}
								<div className="flex-1">
									<p className="text-sm font-medium">
										{connectionTestResult.message}
									</p>
									{connectionTestResult.version && (
										<p className="text-xs text-vscode-descriptionForeground mt-1">
											{t("settings:codeIndex.neo4j.version", { version: connectionTestResult.version })}
										</p>
									)}
								</div>
							</div>
						</div>
					)}

					{/* Description */}
					<div className="mt-4 p-3 bg-vscode-editor-background border border-vscode-dropdown-border rounded">
						<h4 className="text-sm font-medium mb-2">
							{t("settings:codeIndex.neo4j.aboutTitle")}
						</h4>
						<p className="text-sm text-vscode-descriptionForeground mb-2">
							{t("settings:codeIndex.neo4j.aboutDescription")}
						</p>
						<ul className="text-sm text-vscode-descriptionForeground list-disc list-inside pl-5 space-y-1">
							<li>{t("settings:codeIndex.neo4j.aboutPoint1")}</li>
							<li>{t("settings:codeIndex.neo4j.aboutPoint2")}</li>
							<li>{t("settings:codeIndex.neo4j.aboutPoint3")}</li>
						</ul>
					</div>
				</div>
			)}
		</>
	)
}
