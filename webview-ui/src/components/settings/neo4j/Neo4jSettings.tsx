import { useState, useEffect } from "react"
import { VSCodeCheckbox, VSCodeTextField } from "@vscode/webview-ui-toolkit/react"

import { useAppTranslation } from "@/i18n/TranslationContext"
import { vscode } from "@/utils/vscode"

import { Neo4jSettingsProps, Neo4jConnectionStatus } from "./types"
import { useNeo4jTranslations } from "./translations"
import { PasswordField } from "./PasswordField"
import { ConnectionStatus } from "./ConnectionStatus"

// Валидация URI
const validateUri = (uri: string): string | null => {
	if (!uri || uri.trim().length === 0) {
		return "emptyError"
	}
	const validPrefixes = ["bolt://", "neo4j://", "neo4j+s://"]
	const isValid = validPrefixes.some((prefix) => uri.startsWith(prefix))
	return isValid ? null : "error"
}

// Валидация username
const validateUsername = (username: string): string | null => {
	return username && username.trim().length > 0 ? null : "error"
}

// Валидация database
const validateDatabase = (database: string): string | null => {
	return database && database.trim().length > 0 ? null : "error"
}

export const Neo4jSettings = ({
	enabled = false,
	uri = "bolt://localhost:7687",
	username = "neo4j",
	database = "neo4j",
	setCachedStateField,
}: Neo4jSettingsProps) => {
	const { i18n } = useAppTranslation()
	const t = useNeo4jTranslations(i18n.language as "en" | "ru")

	// Локальное состояние
	const [localEnabled, setLocalEnabled] = useState(enabled)
	const [localUri, setLocalUri] = useState(uri)
	const [localUsername, setLocalUsername] = useState(username)
	const [localDatabase, setLocalDatabase] = useState(database)
	const [password, setPassword] = useState("")
	const [hasPassword, setHasPassword] = useState(false)
	const [connectionStatus, setConnectionStatus] = useState<Neo4jConnectionStatus>("disconnected")
	const [statusMessage, setStatusMessage] = useState("")
	const [testing, setTesting] = useState(false)

	// Валидация
	const [uriError, setUriError] = useState<string | null>(null)
	const [usernameError, setUsernameError] = useState<string | null>(null)
	const [databaseError, setDatabaseError] = useState<string | null>(null)

	// Запрос статуса пароля при монтировании
	useEffect(() => {
		vscode.postMessage({ type: "getNeo4jPasswordStatus" })
	}, [])

	// Обработка сообщений от extension
	useEffect(() => {
		const handleMessage = (event: MessageEvent) => {
			const message = event.data

			switch (message.type) {
				case "neo4jPasswordStatus":
					setHasPassword(!!message.hasNeo4jPassword)
					break

				case "neo4jConnectionResult":
					setTesting(false)
					if (message.neo4jConnectionResult?.success) {
						setConnectionStatus("connected")
						setStatusMessage(
							message.neo4jConnectionResult.message || t.connection.connected,
						)
					} else {
						setConnectionStatus("error")
						setStatusMessage(
							message.neo4jConnectionResult?.message || t.connection.error,
						)
					}
					break
			}
		}

		window.addEventListener("message", handleMessage)
		return () => window.removeEventListener("message", handleMessage)
	}, [t])

	// Обновление локального состояния при изменении props
	useEffect(() => {
		setLocalEnabled(enabled)
	}, [enabled])

	useEffect(() => {
		setLocalUri(uri)
	}, [uri])

	useEffect(() => {
		setLocalUsername(username)
	}, [username])

	useEffect(() => {
		setLocalDatabase(database)
	}, [database])

	const handleEnabledChange = (e: any) => {
		const newEnabled = e.target.checked
		setLocalEnabled(newEnabled)
		setCachedStateField("codebaseIndexConfig", {
			codebaseIndexNeo4jEnabled: newEnabled,
		})
	}

	const handleUriChange = (e: any) => {
		const newUri = e.target.value
		setLocalUri(newUri)
		setUriError(validateUri(newUri))
		setCachedStateField("codebaseIndexConfig", {
			codebaseIndexNeo4jUri: newUri,
		})
	}

	const handleUsernameChange = (e: any) => {
		const newUsername = e.target.value
		setLocalUsername(newUsername)
		setUsernameError(validateUsername(newUsername))
		setCachedStateField("codebaseIndexConfig", {
			codebaseIndexNeo4jUsername: newUsername,
		})
	}

	const handleDatabaseChange = (e: any) => {
		const newDatabase = e.target.value
		setLocalDatabase(newDatabase)
		setDatabaseError(validateDatabase(newDatabase))
		setCachedStateField("codebaseIndexConfig", {
			codebaseIndexNeo4jDatabase: newDatabase,
		})
	}

	const handleSetPassword = () => {
		if (password.trim()) {
			vscode.postMessage({
				type: "setNeo4jPassword",
				neo4jPassword: password,
			})
			setHasPassword(true)
			setPassword("")
		}
	}

	const handleTestConnection = () => {
		// Валидация перед тестом
		const uriValidation = validateUri(localUri)
		const usernameValidation = validateUsername(localUsername)
		const databaseValidation = validateDatabase(localDatabase)

		setUriError(uriValidation)
		setUsernameError(usernameValidation)
		setDatabaseError(databaseValidation)

		if (uriValidation || usernameValidation || databaseValidation) {
			return
		}

		if (!hasPassword && !password.trim()) {
			setStatusMessage("Password is required for connection test")
			setConnectionStatus("error")
			return
		}

		setTesting(true)
		setConnectionStatus("connecting")
		setStatusMessage(t.connection.testing)

		vscode.postMessage({
			type: "neo4jConnectionTest",
			neo4jConfig: {
				uri: localUri,
				username: localUsername,
				database: localDatabase,
			},
			neo4jPassword: password || undefined,
		})
	}

	const hasValidationErrors = uriError || usernameError || databaseError

	return (
		<div className="flex flex-col gap-3">
			<VSCodeCheckbox checked={localEnabled} onChange={handleEnabledChange}>
				<span className="font-medium">{t.label}</span>
			</VSCodeCheckbox>
			<div className="text-vscode-descriptionForeground text-sm">{t.description}</div>

			{localEnabled && (
				<div className="flex flex-col gap-3 pl-3 border-l-2 border-vscode-button-background">
					{/* URI Field */}
					<div className="flex flex-col gap-1">
						<label className="block font-medium">{t.uri.label}</label>
						<VSCodeTextField
							value={localUri}
							onChange={handleUriChange}
							placeholder={t.uri.placeholder}
						/>
						{uriError && (
							<div className="text-vscode-charts-red text-sm">
								{uriError === "emptyError" ? t.uri.emptyError : t.uri.error}
							</div>
						)}
					</div>

					{/* Username Field */}
					<div className="flex flex-col gap-1">
						<label className="block font-medium">{t.username.label}</label>
						<VSCodeTextField
							value={localUsername}
							onChange={handleUsernameChange}
							placeholder={t.username.placeholder}
						/>
						{usernameError && (
							<div className="text-vscode-charts-red text-sm">{t.username.error}</div>
						)}
					</div>

					{/* Database Field */}
					<div className="flex flex-col gap-1">
						<label className="block font-medium">{t.database.label}</label>
						<VSCodeTextField
							value={localDatabase}
							onChange={handleDatabaseChange}
							placeholder={t.database.placeholder}
						/>
						{databaseError && (
							<div className="text-vscode-charts-red text-sm">{t.database.error}</div>
						)}
					</div>

					{/* Password Field */}
					<PasswordField
						value={password}
						onChange={setPassword}
						onSetPassword={handleSetPassword}
						hasPassword={hasPassword}
						disabled={false}
					/>

					{/* Connection Status */}
					<ConnectionStatus
						status={connectionStatus}
						message={statusMessage}
						onTest={handleTestConnection}
						testing={testing}
					/>

					{/* Warning */}
					<div className="bg-vscode-inputValidation-infoBackground border border-vscode-inputValidation-infoBorder p-2 rounded text-sm">
						{t.warning}
					</div>
				</div>
			)}
		</div>
	)
}