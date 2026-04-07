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
	queued: "border-vscode-panel-border/70 bg-vscode-editor-background/40 text-vscode-descriptionForeground",
	running: "border-yellow-500/35 bg-yellow-500/8 text-yellow-200/85",
	paused: "border-blue-500/35 bg-blue-500/8 text-blue-200/85",
	recoverable: "border-blue-500/30 bg-blue-500/8 text-blue-200/80",
	completed: "border-green-500/35 bg-green-500/8 text-green-200/85",
	cancelled: "border-orange-500/30 bg-orange-500/8 text-orange-200/85",
	abstained: "border-amber-500/35 bg-amber-500/8 text-amber-200/90",
	failed: "border-red-500/35 bg-red-500/8 text-red-200/90",
}

const OrchestrationStatusBadge = ({ status, label, className, title }: OrchestrationStatusBadgeProps) => (
	<span
		className={cn(
			"inline-flex h-5 shrink-0 items-center rounded-md border px-1.5 text-[10px] leading-none whitespace-nowrap",
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
