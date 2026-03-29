// kilocode_change - new file
import { memo } from "react"

import { cn } from "@/lib/utils"

type HistoryTreeGutterProps = {
	depth: number
	hasChildren: boolean
	isExpanded: boolean
	ancestorHasNextSiblings: boolean[]
	isLastSibling: boolean
	onToggle?: () => void
	toggleTestId?: string
	toggleLabel?: string
	className?: string
}

const SEGMENT_WIDTH = 18

const HistoryTreeGutter = ({
	depth,
	hasChildren,
	isExpanded,
	ancestorHasNextSiblings,
	isLastSibling,
	onToggle,
	toggleTestId,
	toggleLabel,
	className,
}: HistoryTreeGutterProps) => {
	if (depth === 0 && !hasChildren) {
		return <div className={cn("shrink-0", className)} style={{ width: 16 }} aria-hidden="true" />
	}

	return (
		<div
			className={cn("relative shrink-0 self-stretch min-h-full", className)}
			style={{ width: Math.max(16, depth * SEGMENT_WIDTH + 16) }}
			aria-hidden={!hasChildren}>
			{ancestorHasNextSiblings.map((hasNextSibling, index) =>
				hasNextSibling ? (
					<div
						key={`ancestor-line-${index}`}
						className="absolute top-0 bottom-0 border-l border-dashed border-vscode-panel-border/70"
						style={{ left: index * SEGMENT_WIDTH + SEGMENT_WIDTH / 2 }}
					/>
				) : null,
			)}
			{depth > 0 && (
				<>
					<div
						className="absolute border-l border-dashed border-vscode-panel-border/70"
						style={{
							left: (depth - 1) * SEGMENT_WIDTH + SEGMENT_WIDTH / 2,
							top: 0,
							height: isLastSibling ? 20 : "100%",
						}}
					/>
					<div
						className="absolute top-5 border-t border-dashed border-vscode-panel-border/70"
						style={{
							left: (depth - 1) * SEGMENT_WIDTH + SEGMENT_WIDTH / 2,
							width: SEGMENT_WIDTH,
						}}
					/>
				</>
			)}
			{hasChildren && (
				<button
					type="button"
					data-testid={toggleTestId}
					aria-label={toggleLabel}
					className="absolute top-2.5 flex h-5 w-5 items-center justify-center rounded-sm border border-vscode-panel-border bg-vscode-editor-background text-[12px] leading-none text-vscode-foreground hover:bg-vscode-list-hoverBackground"
					style={{ left: depth === 0 ? 0 : depth * SEGMENT_WIDTH - 1 }}
					onClick={(event) => {
						event.stopPropagation()
						onToggle?.()
					}}>
					{isExpanded ? "-" : "+"}
				</button>
			)}
		</div>
	)
}

export default memo(HistoryTreeGutter)
