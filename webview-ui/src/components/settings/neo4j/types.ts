import { SetCachedStateField } from "../types"

// Статусы подключения
export type Neo4jConnectionStatus = "disconnected" | "connecting" | "connected" | "error"

// Конфигурация Neo4j (только для UI)
export interface Neo4jConfig {
	enabled: boolean
	uri: string
	username: string
	database: string
}

// Props для Neo4jSettings компонента
export interface Neo4jSettingsProps {
	enabled?: boolean
	uri?: string
	username?: string
	database?: string
	setCachedStateField: SetCachedStateField<"codebaseIndexConfig">
}

// Props для PasswordField
export interface PasswordFieldProps {
	value?: string
	onChange: (value: string) => void
	onSetPassword: () => void
	disabled?: boolean
	hasPassword?: boolean
}

// Props для ConnectionStatus
export interface ConnectionStatusProps {
	status: Neo4jConnectionStatus
	message?: string
	onTest?: () => void
	testing?: boolean
}

// Результат теста подключения
export interface Neo4jConnectionTestResult {
	success: boolean
	message: string
	version?: string
}