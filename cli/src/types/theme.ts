/**
 * Theme type definitions for Kilo Code CLI
 *
 * Defines the structure for color themes used throughout the CLI interface.
 */

/**
 * Core theme interface defining all color categories
 */
export interface Theme {
	/** Theme identifier */
	id: string
	/** Theme display name */
	name: string

	/** Brand identity colors */
	brand: {
		primary: string
		secondary: string
	}

	/** Semantic colors for common states */
	semantic: {
		success: string
		error: string
		warning: string
		info: string
		neutral: string
	}

	/** Interactive element colors */
	interactive: {
		prompt: string
		selection: string
		hover: string
		disabled: string
		focus: string
	}

	/** Message type colors */
	messages: {
		user: string
		assistant: string
		system: string
		error: string
	}

	/** Action colors (unified approve/reject/cancel patterns) */
	actions: {
		approve: string
		reject: string
		cancel: string
		pending: string
	}

	/** Code and diff display colors */
	code: {
		addition: string
		deletion: string
		modification: string
		context: string
		lineNumber: string
	}

	/** UI structure colors */
	ui: {
		border: {
			default: string
			active: string
			warning: string
			error: string
		}
		text: {
			primary: string
			secondary: string
			dimmed: string
			highlight: string
		}
		background: {
			default: string
			elevated: string
		}
	}

	/** Status indicator colors */
	status: {
		online: string
		offline: string
		busy: string
		idle: string
	}
}

/**
 * Theme identifier type
 */
export type ThemeId = "dark" | "light" | string
