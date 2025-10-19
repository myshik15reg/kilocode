import type { CliMessage, WelcomeMessageOptions } from "../../types/cli.js"
import type { ValidationResult } from "../../config/validation.js"
import { getConfigPath } from "../../config/persistence.js"

// Counter to ensure unique IDs even when created in the same millisecond
let messageCounter = 0

/**
 * Converts validation errors into user-friendly instructions
 * @param validation - The validation result
 * @returns Array of instruction strings
 */
export function createConfigErrorInstructions(validation: ValidationResult): string[] {
	if (validation.valid) {
		return []
	}

	const configPath = getConfigPath()
	const instructions: string[] = ["Configuration Error: config.json is incomplete or invalid.\n", "Errors found:"]

	// Add each validation error
	if (validation.errors) {
		validation.errors.forEach((error) => {
			instructions.push(`  • ${error}`)
		})
	}

	instructions.push(
		"\nTo fix this issue:",
		`  1. Run: kilocode config`,
		`  2. Or edit: ${configPath}`,
		"\n",
		"The CLI will exit now. Please configure your Kilo Code and try again.",
	)

	return instructions
}

/**
 * Creates a welcome message with customizable options
 * @param options - Customization options for the welcome message
 * @returns A CliMessage of type "welcome"
 */
export function createWelcomeMessage(options?: WelcomeMessageOptions): CliMessage {
	const timestamp = Date.now()
	const id = `welcome-${timestamp}-${messageCounter++}`

	return {
		id,
		type: "welcome",
		content: "", // Content is rendered by WelcomeMessageContent component
		ts: timestamp,
		metadata: {
			welcomeOptions: options,
		},
	}
}
