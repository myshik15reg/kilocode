/**
 * Command system type definitions
 */

import type { RouterModels } from "../../types/messages.js"
import type { ProviderConfig } from "../../config/types.js"

export interface Command {
	name: string
	aliases: string[]
	description: string
	usage: string
	examples: string[]
	category: "chat" | "settings" | "navigation" | "system"
	handler: CommandHandler
	options?: CommandOption[]
	arguments?: ArgumentDefinition[]
	priority?: number // 1-10 scale, default 5. Higher = appears first in suggestions
}

export interface CommandOption {
	name: string
	alias?: string
	description: string
	required?: boolean
	type: "string" | "number" | "boolean"
	default?: any
}

export interface CommandContext {
	input: string
	args: string[]
	options: Record<string, any>
	sendMessage: (message: any) => Promise<void>
	addMessage: (message: any) => void
	clearMessages: () => void
	replaceMessages: (messages: any[]) => void
	clearTask: () => Promise<void>
	setMode: (mode: string) => void
	exit: () => void
	// Model-related context
	routerModels: RouterModels | null
	currentProvider: ProviderConfig | null
	kilocodeDefaultModel: string
	updateProviderModel: (modelId: string) => Promise<void>
	refreshRouterModels: () => Promise<void>
}

export type CommandHandler = (context: CommandContext) => Promise<void> | void

export interface ParsedCommand {
	command: string
	args: string[]
	options: Record<string, any>
}

// Argument autocompletion types

/**
 * Argument suggestion with metadata
 */
export interface ArgumentSuggestion {
	value: string
	title?: string
	description?: string
	matchScore: number
	highlightedValue: string
	loading?: boolean
	error?: string
}

/**
 * Context provided to argument providers
 */
export interface ArgumentProviderContext {
	// Basic info
	commandName: string
	argumentIndex: number
	argumentName: string

	// Current state
	currentArgs: string[]
	currentOptions: Record<string, any>
	partialInput: string

	// Access to previous arguments by name
	getArgument: (name: string) => string | undefined

	// Access to all parsed values
	parsedValues: {
		args: Record<string, string>
		options: Record<string, any>
	}

	// Metadata about the command
	command: Command

	// CommandContext properties for providers that need them
	commandContext?: {
		routerModels: RouterModels | null
		currentProvider: ProviderConfig | null
		kilocodeDefaultModel: string
		updateProviderModel: (modelId: string) => Promise<void>
		refreshRouterModels: () => Promise<void>
	}
}

/**
 * Argument provider function (can be async)
 */
export type ArgumentProvider = (
	context: ArgumentProviderContext,
) => Promise<ArgumentSuggestion[]> | ArgumentSuggestion[] | Promise<string[]> | string[]

/**
 * Validation result
 */
export interface ValidationResult {
	valid: boolean
	error?: string
	warning?: string
}

/**
 * Argument dependency
 */
export interface ArgumentDependency {
	argumentName: string
	values?: string[]
	condition?: (value: string, context: ArgumentProviderContext) => boolean
}

/**
 * Conditional provider
 */
export interface ConditionalProvider {
	condition: (context: ArgumentProviderContext) => boolean
	provider: ArgumentProvider
}

/**
 * Cache configuration for providers
 */
export interface ProviderCacheConfig {
	enabled: boolean
	ttl?: number
	keyGenerator?: (context: ArgumentProviderContext) => string
}

/**
 * Argument value with metadata
 */
export interface ArgumentValue {
	value: string
	description?: string
}

/**
 * Argument definition with provider support
 */
export interface ArgumentDefinition {
	name: string
	description: string
	required?: boolean

	// Provider options
	provider?: ArgumentProvider
	values?: ArgumentValue[]
	conditionalProviders?: ConditionalProvider[]
	defaultProvider?: ArgumentProvider

	// Dependencies
	dependsOn?: ArgumentDependency[]

	// Validation
	validate?: (value: string, context: ArgumentProviderContext) => Promise<ValidationResult> | ValidationResult

	// Transform
	transform?: (value: string) => string

	// UI
	placeholder?: string

	// Caching
	cache?: ProviderCacheConfig
}

/**
 * Input state for autocomplete
 */
export interface InputState {
	type: "command" | "argument" | "option" | "none"
	commandName?: string
	command?: Command

	currentArgument?: {
		definition: ArgumentDefinition
		index: number
		partialValue: string
	}

	validation?: {
		valid: boolean
		errors: string[]
		warnings: string[]
	}

	dependencies?: {
		satisfied: boolean
		missing: string[]
	}
}
