// kilocode_change - new file
import { cn } from "@/lib/utils"
import type { OrchestrationStatus } from "./orchestration"

interface OrchestrationStatusBadgeProps {
	status: OrchestrationStatus
	label: string
	className?: string
	title?: string
}

const statusToneClasses: Record<OrchestrationStatus, string> = {
	queued: "border-vscode-panel-border text-vscode-descriptionForeground",
	running: "border-yellow-500/70 text-yellow-300",
	paused: "border-blue-500/70 text-blue-300",
	recoverable: "border-blue-500/70 text-blue-300",
	completed: "border-green-500/70 text-green-300",
	cancelled: "border-orange-500/70 text-orange-300",
	failed: "border-red-500/70 text-red-300",
}

const OrchestrationStatusBadge = ({ status, label, className, title }: OrchestrationStatusBadgeProps) => (
	<span
		className={cn(
			"inline-flex shrink-0 items-center rounded border bg-vscode-editor-background px-1.5 py-0.5 text-[10px] leading-tight whitespace-nowrap",
			statusToneClasses[status],
			className,
		)}
		title={title ?? label}
		aria-label={title ?? label}
		data-testid={`orchestration-status-badge-${status}`}>
		{label}
	</span>
)

export default OrchestrationStatusBadge
