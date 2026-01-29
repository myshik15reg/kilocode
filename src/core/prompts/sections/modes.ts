import * as vscode from "vscode"

import type { ModeConfig } from "@roo-code/types"

import { getAllModesWithPrompts, modes } from "../../../shared/modes" // kilocode_change
import { ensureSettingsDirectoryExists } from "../../../utils/globalContext"

export async function getModesSection(
	context: vscode.ExtensionContext,
	skipXmlExamples: boolean = false,
): Promise<string> {
	// Make sure path gets created
	await ensureSettingsDirectoryExists(context)

	// Get all modes with their overrides from extension state
	const allModes = await getAllModesWithPrompts(context)

	// kilocode_change start
	// Keep the system prompt compact when many custom modes exist:
	// - Always include descriptions for built-in modes
	// - For large mode sets, list custom modes by name/slug only
	const builtInModeSlugs = new Set(modes.map((m) => m.slug))
	const includeDescriptionsForAll = allModes.length <= 20

	const orderedModes = [
		...allModes.filter((m) => builtInModeSlugs.has(m.slug)),
		...allModes.filter((m) => !builtInModeSlugs.has(m.slug)),
	]
	// kilocode_change end

	let modesContent = `====

MODES

- These are the currently available modes:
${orderedModes
	.map((mode: ModeConfig) => {
		// kilocode_change start
		const shouldIncludeDescription = includeDescriptionsForAll || builtInModeSlugs.has(mode.slug)
		if (!shouldIncludeDescription) {
			return `  * "${mode.name}" mode (${mode.slug})`
		}
		// kilocode_change end

		let description: string
		if (mode.whenToUse && mode.whenToUse.trim() !== "") {
			// Use whenToUse as the primary description, indenting subsequent lines for readability
			description = mode.whenToUse.replace(/\n/g, "\n    ")
		} else {
			// Fallback to the first sentence of roleDefinition if whenToUse is not available
			description = mode.roleDefinition.split(".")[0]
		}
		return `  * "${mode.name}" mode (${mode.slug}) - ${description}`
	})
	.join("\n")}`

	if (!skipXmlExamples) {
		modesContent += `
If the user asks you to create or edit a new mode for this project, you should read the instructions by using the fetch_instructions tool, like this:
<fetch_instructions>
<task>create_mode</task>
</fetch_instructions>
`
	} else {
		modesContent += `
If the user asks you to create or edit a new mode for this project, you should read the instructions by using the fetch_instructions tool.
`
	}

	return modesContent
}
