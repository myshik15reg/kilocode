import { Circle, Loader, CheckCircle, XCircle } from "lucide-react"

import { Button } from "@/components/ui/button"
import { useAppTranslation } from "@/i18n/TranslationContext"

import { ConnectionStatusProps, Neo4jConnectionStatus } from "./types"
import { useNeo4jTranslations } from "./translations"

const getStatusConfig = (
	status: Neo4jConnectionStatus,
): {
	icon: React.ReactNode
	colorClass: string
	defaultMessage: string
} => {
	switch (status) {
		case "connected":
			return {
				icon: <CheckCircle className="w-4 h-4" />,
				colorClass: "text-vscode-charts-green",
				defaultMessage: "Connected to Neo4j",
			}
		case "connecting":
			return {
				icon: <Loader className="w-4 h-4 animate-spin" />,
				colorClass: "text-vscode-charts-yellow",
				defaultMessage: "Connecting...",
			}
		case "error":
			return {
				icon: <XCircle className="w-4 h-4" />,
				colorClass: "text-vscode-charts-red",
				defaultMessage: "Connection failed",
			}
		case "disconnected":
		default:
			return {
				icon: <Circle className="w-4 h-4" />,
				colorClass: "text-vscode-descriptionForeground",
				defaultMessage: "Not connected",
			}
	}
}

export const ConnectionStatus = ({
	status,
	message,
	onTest,
	testing = false,
}: ConnectionStatusProps) => {
	const { i18n } = useAppTranslation()
	const t = useNeo4jTranslations(i18n.language as "en" | "ru")
	const config = getStatusConfig(status)

	const displayMessage = message || config.defaultMessage

	return (
		<div className="flex flex-col gap-2">
			<label className="block font-medium">{t.connection.status}</label>
			<div className="flex items-center gap-3">
				<div className={`flex items-center gap-2 ${config.colorClass}`}>
					{config.icon}
					<span className="text-sm">{displayMessage}</span>
				</div>
				{onTest && (
					<Button variant="secondary" onClick={onTest} disabled={testing}>
						{testing ? t.connection.testing : t.connection.testButton}
					</Button>
				)}
			</div>
		</div>
	)
}