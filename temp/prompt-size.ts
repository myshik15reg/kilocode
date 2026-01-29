import fs from "fs";
import path from "path";

import { DEFAULT_MODES } from "@roo-code/types";
import { TOOL_GROUPS, ALWAYS_AVAILABLE_TOOLS } from "../src/shared/tools";
import { addCustomInstructions } from "../src/core/prompts/sections/custom-instructions";
import { getSharedToolUseSection } from "../src/core/prompts/sections/tool-use";
import { getToolUseGuidelinesSection } from "../src/core/prompts/sections/tool-use-guidelines";
import { markdownFormattingSection } from "../src/core/prompts/sections/markdown-formatting";
import { getObjectiveSection } from "../src/core/prompts/sections/objective";
import { getAlfaCodeWorkflowSection } from "../src/core/prompts/sections/alfa-code-workflow";
import { getAlfaCode1CSection } from "../src/core/prompts/sections/alfa-code-1c";
import { MemoryBankService } from "../src/services/alfa-code/MemoryBankService";
import { MultiSearchReplaceDiffStrategy } from "../src/core/diff/strategies/multi-search-replace";
import { encodingForModel } from "../src/services/continuedev/core/llm/countTokens";

import { getExecuteCommandDescription } from "../src/core/prompts/tools/execute-command";
import { getReadFileDescription } from "../src/core/prompts/tools/read-file";
import { getFetchInstructionsDescription } from "../src/core/prompts/tools/fetch-instructions";
import { getWriteToFileDescription } from "../src/core/prompts/tools/write-to-file";
import { getSearchFilesDescription } from "../src/core/prompts/tools/search-files";
import { getListFilesDescription } from "../src/core/prompts/tools/list-files";
import { getBrowserActionDescription } from "../src/core/prompts/tools/browser-action";
import { getAskFollowupQuestionDescription } from "../src/core/prompts/tools/ask-followup-question";
import { getAttemptCompletionDescription } from "../src/core/prompts/tools/attempt-completion";
import { getUseMcpToolDescription } from "../src/core/prompts/tools/use-mcp-tool";
import { getAccessMcpResourceDescription } from "../src/core/prompts/tools/access-mcp-resource";
import { getSwitchModeDescription } from "../src/core/prompts/tools/switch-mode";
import { getNewTaskDescription } from "../src/core/prompts/tools/new-task";
import { getCodebaseSearchDescription } from "../src/core/prompts/tools/codebase-search";
import { getUpdateTodoListDescription } from "../src/core/prompts/tools/update-todo-list";
import { getRunSlashCommandDescription } from "../src/core/prompts/tools/run-slash-command";
import { getGenerateImageDescription } from "../src/core/prompts/tools/generate-image";
import { getDeleteFileDescription } from "../src/core/prompts/tools/delete-file";

const cwd = process.cwd();
const cwdPosix = cwd.replace(/\\/g, "/");

function tokenCount(text: string, model = "claude-3-5-sonnet"): number {
	const encoding = encodingForModel(model);
	return encoding.encode(text, "all", []).length;
}

function extractSingleQuoted(block: string, key: string): string {
	const marker = `${key}: '`;
	const idx = block.indexOf(marker);
	if (idx === -1) return "";
	let i = idx + marker.length;
	let result = "";
	while (i < block.length) {
		const ch = block[i];
		if (ch === "'") {
			if (block[i + 1] === "'") {
				result += "'";
				i += 2;
				continue;
			}
			return result;
		}
		result += ch;
		i++;
	}
	return result;
}

function parseGroups(block: string): string[] {
	const lines = block.split(/\r?\n/);
	const groups: string[] = [];
	let inGroups = false;
	for (const line of lines) {
		if (line.startsWith("  groups:")) {
			inGroups = true;
			continue;
		}
		if (!inGroups) continue;
		// end groups when hitting another top-level field
		if (/^  [a-zA-Z_]/.test(line)) break;
		const trimmed = line.trim();
		if (!trimmed.startsWith("-")) continue;
		let entry = trimmed.replace(/^-[\s]*/, "");
		// handle YAML array style: [edit, { ... }]
		if (entry.startsWith("[")) {
			const inner = entry.slice(1).trim();
			const first = inner.split(/[,\]]/)[0]?.trim() ?? "";
			entry = first;
		}
		entry = entry.replace(/^['"]|['"]$/g, "").trim();
		if (entry) groups.push(entry);
	}
	return groups;
}

function parseCustomModes(raw: string) {
	const blocks: Array<{ slug: string; block: string }> = [];
	const re = /(^|\n)- slug: ([^\n]+)/g;
	const starts: Array<{ idx: number; slug: string }> = [];
	let m: RegExpExecArray | null;
	while ((m = re.exec(raw)) !== null) {
		const idx = m.index + (m[1] ? 1 : 0);
		starts.push({ idx, slug: m[2].trim() });
	}
	for (let i = 0; i < starts.length; i++) {
		const start = starts[i];
		const end = i + 1 < starts.length ? starts[i + 1].idx : raw.length;
		const block = raw.slice(start.idx, end);
		blocks.push({ slug: start.slug, block });
	}

	return blocks.map(({ slug, block }) => {
		const nameMatch = block.match(/^\s{2}name:\s*(.*)$/m);
		const roleMatch = block.match(/^\s{2}roleDefinition:\s*(.*)$/m);
		const whenMatch = block.match(/^\s{2}whenToUse:\s*(.*)$/m);
		const descriptionMatch = block.match(/^\s{2}description:\s*(.*)$/m);
		const customInstructions = extractSingleQuoted(block, "customInstructions");
		return {
			slug,
			name: nameMatch?.[1]?.trim() ?? slug,
			roleDefinition: roleMatch?.[1]?.trim() ?? "",
			whenToUse: whenMatch?.[1]?.trim() ?? "",
			description: descriptionMatch?.[1]?.trim() ?? "",
			groups: parseGroups(block),
			customInstructions,
		};
	});
}

function buildModesSection(customModes: ReturnType<typeof parseCustomModes>, skipXmlExamples = false): string {
	const builtInModes = DEFAULT_MODES as Array<any>;
	const builtInModeSlugs = new Set(builtInModes.map((m) => m.slug));

	const allModes = [...builtInModes];
	for (const custom of customModes) {
		const idx = allModes.findIndex((m) => m.slug === custom.slug);
		if (idx !== -1) {
			allModes[idx] = { ...allModes[idx], ...custom };
		} else {
			allModes.push(custom);
		}
	}

	const includeDescriptionsForAll = allModes.length <= 20;
	const orderedModes = [
		...allModes.filter((m) => builtInModeSlugs.has(m.slug)),
		...allModes.filter((m) => !builtInModeSlugs.has(m.slug)),
	];

	let modesContent = `====\n\nMODES\n\n- These are the currently available modes:\n${orderedModes
		.map((mode) => {
			const shouldIncludeDescription = includeDescriptionsForAll || builtInModeSlugs.has(mode.slug);
			if (!shouldIncludeDescription) {
				return `  * "${mode.name}" mode (${mode.slug})`;
			}
			let description = "";
			if (mode.whenToUse && mode.whenToUse.trim() !== "") {
				description = String(mode.whenToUse).replace(/\n/g, "\n    ");
			} else if (mode.roleDefinition) {
				description = String(mode.roleDefinition).split(".")[0];
			}
			return `  * "${mode.name}" mode (${mode.slug})${description ? ` - ${description}` : ""}`;
		})
		.join("\n")}`;

	if (!skipXmlExamples) {
		modesContent += `\nIf the user asks you to create or edit a new mode for this project, you should read the instructions by using the fetch_instructions tool, like this:\n<fetch_instructions>\n<task>create_mode</task>\n</fetch_instructions>\n`;
	} else {
		modesContent += `\nIf the user asks you to create or edit a new mode for this project, you should read the instructions by using the fetch_instructions tool.\n`;
	}

	return modesContent;
}

function buildCapabilitiesSection(): string {
	return `====\n\nCAPABILITIES\n\n- You have access to tools that let you execute CLI commands on the user's computer, list files, view source code definitions, regex search, read and write files, and ask follow-up questions. These tools help you effectively accomplish a wide range of tasks, such as writing code, making edits or improvements to existing files, understanding the current state of a project, performing system operations, and much more.\n- When the user initially gives you a task, a recursive list of all filepaths in the current workspace directory ('${cwd}') will be included in environment_details. This provides an overview of the project's file structure, offering key insights into the project from directory/file names (how developers conceptualize and organize their code) and file extensions (the language used). This can also guide decision-making on which files to explore further. If you need to further explore directories such as outside the current workspace directory, you can use the list_files tool. If you pass 'true' for the recursive parameter, it will list files recursively. Otherwise, it will list files at the top level, which is better suited for generic directories where you don't necessarily need the nested structure, like the Desktop.\n- You can use the execute_command tool to run commands on the user's computer whenever you feel it can help accomplish the user's task. When you need to execute a CLI command, you must provide a clear explanation of what the command does. Prefer to execute complex CLI commands over creating executable scripts, since they are more flexible and easier to run. Interactive and long-running commands are allowed, since the commands are run in the user's VSCode terminal. The user may keep commands running in the background and you will be kept updated on their status along the way. Each command you execute is run in a new terminal instance.`;
}

function buildRulesSection({ includeFastApply = false }: { includeFastApply?: boolean } = {}): string {
	const fastApply = includeFastApply
		? `\n- **Morph FastApply is enabled.** You have access to the \`fast_edit_file\` tool which uses a specialized model optimized for intelligent code understanding and modification.\n- **ONLY use the fast_edit_file tool for file modifications.**\n- **Focus on clear instructions and precise code edits** using the fast_edit_file format with \`// ... existing code ...\` placeholders to represent unchanged sections.\n- **The fast_edit_file tool requires three parameters:**\n   - \`target_file\`: Full path to the file to modify\n   - \`instructions\`: Single sentence describing what you're doing (use first person)\n   - \`code_edit\`: Only the lines you want to change, using \`// ... existing code ...\` for unchanged sections\n- **Always make all edits to a file in a single fast_edit_file call** rather than multiple calls to the same file.`
		: "";

	return `====\n\nRULES\n\n- The project base directory is: ${cwdPosix}\n- All file paths must be relative to this directory. However, commands may change directories in terminals, so respect working directory specified by the response to <execute_command>.\n- You cannot \`cd\` into a different directory to complete a task. You are stuck operating from '${cwdPosix}', so be sure to pass in the correct 'path' parameter when using tools that require a path.\n- Do not use the ~ character or $HOME to refer to the home directory.\n- Before using the execute_command tool, you must first think about the SYSTEM INFORMATION context provided to understand the user's environment and tailor your commands to ensure they are compatible with their system. You must also consider if the command you need to run should be executed in a specific directory outside of the current working directory '${cwdPosix}', and if so prepend with \`cd\`'ing into that directory && then executing the command (as one command since you are stuck operating from '${cwdPosix}'). For example, if you needed to run \`npm install\` in a project outside of '${cwdPosix}', you would need to prepend with a \`cd\` i.e. pseudocode for this would be \`cd (path to project) && (command, in this case npm install)\`.${fastApply}\n- Some modes have restrictions on which files they can edit. If you attempt to edit a restricted file, the operation will be rejected with a FileRestrictionError that will specify which file patterns are allowed for the current mode.\n- Be sure to consider the type of project (e.g. Python, JavaScript, web application) when determining the appropriate structure and files to include. Also consider what files may be most relevant to accomplishing the task, for example looking at a project's manifest file would help you understand the project's dependencies, which you could incorporate into any code you write.\n  * For example, in architect mode trying to edit app.js would be rejected because architect mode can only edit files matching "\\.md$"\n- When making changes to code, always consider the context in which the code is being used. Ensure that your changes are compatible with the existing codebase and that they follow the project's coding standards and best practices.\n- Do not ask for more information than necessary. Use the tools provided to accomplish the user's request efficiently and effectively. When you've completed your task, you must use the attempt_completion tool to present the result to the user. The user may provide feedback, which you can use to make improvements and try again.\n- You are only allowed to ask the user questions using the ask_followup_question tool. Use this tool only when you need additional details to complete a task, and be sure to use a clear and concise question that will help you move forward with the task. When you ask a question, provide the user with 2-4 suggested answers based on your question so they don't need to do so much typing. The suggestions should be specific, actionable, and directly related to the completed task. They should be ordered by priority or logical sequence. However if you can use the available tools to avoid having to ask the user questions, you should do so. For example, if the user mentions a file that may be in an outside directory like the Desktop, you should use the list_files tool to list the files in the Desktop and check if the file they are talking about is there, rather than asking the user to provide the file path themselves.\n- When executing commands, if you don't see the expected output, assume the terminal executed the command successfully and proceed with the task. The user's terminal may be unable to stream the output back properly. If you absolutely need to see the actual terminal output, use the ask_followup_question tool to request the user to copy and paste it back to you.\n- The user may provide a file's contents directly in their message, in which case you shouldn't use the read_file tool to get the file contents again since you already have it.\n- Your goal is to try to accomplish the user's task, NOT engage in a back and forth conversation.\n- NEVER end attempt_completion result with a question or request to engage in further conversation! Formulate the end of your result in a way that is final and does not require further input from the user.\n- You are STRICTLY FORBIDDEN from starting your messages with "Great", "Certainly", "Okay", "Sure". You should NOT be conversational in your responses, but rather direct and to the point. For example you should NOT say "Great, I've updated the CSS" but instead something like "I've updated the CSS". It is important you be clear and technical in your messages.\n- When presented with images, utilize your vision capabilities to thoroughly examine them and extract meaningful information. Incorporate these insights into your thought process as you accomplish the user's task.\n- At the end of each user message, you will automatically receive environment_details. This information is not written by the user themselves, but is auto-generated to provide potentially relevant context about the project structure and environment. While this information can be valuable for understanding the project context, do not treat it as a direct part of the user's request or response. Use it to inform your actions and decisions, but don't assume the user is explicitly asking about or referring to this information unless they clearly do so in their message. When using environment_details, explain your actions clearly to ensure the user understands, as they may not be aware of these details.\n- Before executing commands, check the "Actively Running Terminals" section in environment_details. If present, consider how these active processes might impact your task. For example, if a local development server is already running, you wouldn't need to start it again. If no active terminals are listed, proceed with command execution as normal.\n- MCP operations should be used one at a time, similar to other tool usage. Wait for confirmation of success before proceeding with additional operations.\n- It is critical you wait for the user's response after each tool use, in order to confirm the success of the tool use. For example, if asked to make a todo app, you would create a file, wait for the user's response it was created successfully, then create another file if needed, wait for the user's response it was created successfully, etc.`;
}

function buildSystemInfoSection(): string {
	const os = process.platform === "win32" ? "Windows" : process.platform;
	const shell = process.env.ComSpec || process.env.SHELL || "";
	const home = process.env.USERPROFILE || process.env.HOME || "";
	return `====\n\nSYSTEM INFORMATION\n\nOperating System: ${os}\nDefault Shell: ${shell}\nHome Directory: ${home.replace(/\\/g, "/")}\nCurrent Workspace Directory: ${cwdPosix}\n\nThe Current Workspace Directory is the active VS Code project directory, and is therefore the default directory for all tool operations. New terminals will be created in the current workspace directory, however if you change directories in a terminal it will then have a different working directory; changing directories in a terminal does not modify the workspace directory, because you do not have access to change the workspace directory. When the user initially gives you a task, a recursive list of all filepaths in the current workspace directory ('/test/path') will be included in environment_details. This provides an overview of the project's file structure, offering key insights into the project from directory/file names (how developers conceptualize and organize their code) and file extensions (the language used). This can also guide decision-making on which files to explore further. If you need to further explore directories such as outside the current workspace directory, you can use the list_files tool. If you pass 'true' for the recursive parameter, it will list files recursively. Otherwise, it will list files at the top level, which is better suited for generic directories where you don't necessarily need the nested structure, like the Desktop.`;
}

function buildToolDescriptions({ supportsComputerUse, includeCodebaseSearch, includeGenerateImage, includeRunSlashCommand, includeDiff, includeFastApply }: {
	supportsComputerUse: boolean;
	includeCodebaseSearch: boolean;
	includeGenerateImage: boolean;
	includeRunSlashCommand: boolean;
	includeDiff: boolean;
	includeFastApply: boolean;
}): string {
	const toolArgs = {
		cwd,
		supportsComputerUse,
		diffStrategy: includeDiff ? new MultiSearchReplaceDiffStrategy() : undefined,
		browserViewportSize: "",
		mcpHub: undefined,
		partialReadsEnabled: true,
		settings: { maxConcurrentFileReads: 5 },
		experiments: {},
	};

	const toolDescriptions: Record<string, () => string | undefined> = {
		execute_command: () => getExecuteCommandDescription(toolArgs as any),
		read_file: () => getReadFileDescription(toolArgs as any),
		fetch_instructions: () => getFetchInstructionsDescription(false),
		write_to_file: () => getWriteToFileDescription(toolArgs as any),
		search_files: () => getSearchFilesDescription(toolArgs as any),
		list_files: () => getListFilesDescription(toolArgs as any),
		browser_action: () => getBrowserActionDescription(toolArgs as any),
		ask_followup_question: () => getAskFollowupQuestionDescription(),
		attempt_completion: () => getAttemptCompletionDescription(toolArgs as any),
		use_mcp_tool: () => getUseMcpToolDescription(toolArgs as any),
		access_mcp_resource: () => getAccessMcpResourceDescription(toolArgs as any),
		switch_mode: () => getSwitchModeDescription(),
		new_task: () => getNewTaskDescription(toolArgs as any),
		codebase_search: () => getCodebaseSearchDescription(toolArgs as any),
		update_todo_list: () => getUpdateTodoListDescription(toolArgs as any),
		run_slash_command: () => getRunSlashCommandDescription(),
		generate_image: () => getGenerateImageDescription(toolArgs as any),
		delete_file: () => getDeleteFileDescription(toolArgs as any),
		apply_diff: () =>
			includeDiff
				? new MultiSearchReplaceDiffStrategy().getToolDescription({ cwd })
				: "",
		fast_edit_file: () => undefined,
	};

	const toolsSet = new Set<string>();

	for (const group of Object.keys(TOOL_GROUPS)) {
		// groups will be filtered later based on mode
	}

	// select tools for code mode based on custom groups if available
	const customModesRaw = fs.readFileSync(path.join(cwd, ".kilocodemodes"), "utf8");
	const customModes = parseCustomModes(customModesRaw);
	const codeMode = customModes.find((m) => m.slug === "code");
	const modeGroups = codeMode?.groups?.length ? codeMode.groups : (DEFAULT_MODES as any[]).find((m) => m.slug === "code")?.groups || [];

	for (const groupEntry of modeGroups) {
		const groupName = typeof groupEntry === "string" ? groupEntry : Array.isArray(groupEntry) ? groupEntry[0] : groupEntry;
		const group = TOOL_GROUPS[groupName as keyof typeof TOOL_GROUPS];
		if (!group) continue;
		for (const tool of group.tools) toolsSet.add(tool);
	}

	for (const tool of ALWAYS_AVAILABLE_TOOLS) toolsSet.add(tool);

	if (!includeCodebaseSearch) toolsSet.delete("codebase_search");
	if (!includeGenerateImage) toolsSet.delete("generate_image");
	if (!includeRunSlashCommand) toolsSet.delete("run_slash_command");
	if (includeFastApply) {
		// remove classic edit tools
		toolsSet.delete("apply_diff");
		toolsSet.delete("write_to_file");
	} else {
		toolsSet.delete("fast_edit_file");
	}

	const descriptions = Array.from(toolsSet)
		.map((tool) => toolDescriptions[tool]?.())
		.filter(Boolean) as string[];

	return `# Tools\n\n${descriptions.join("\n\n")}`;
}

async function main() {
	const rawModes = fs.readFileSync(path.join(cwd, ".kilocodemodes"), "utf8");
	const customModes = parseCustomModes(rawModes);
	const codeMode = customModes.find((m) => m.slug === "code");
	if (!codeMode) {
		console.error("code mode not found in .kilocodemodes");
		process.exit(1);
	}

	const memoryBank = new MemoryBankService(cwd);
	const memoryBankContext = await memoryBank.getQuickContext();

	const modeInstructions = codeMode.customInstructions.trim();

	const customInstructionsSection = await addCustomInstructions(
		modeInstructions,
		"",
		cwd,
		"code",
		{
			language: "en",
			settings: { useAgentRules: true, enableSubfolderRules: false },
		},
	);

	const sections: Array<{ name: string; text: string }> = [];

	sections.push({ name: "roleDefinition", text: codeMode.roleDefinition || "" });
	sections.push({ name: "markdownFormatting", text: markdownFormattingSection() });
	sections.push({ name: "sharedToolUse", text: getSharedToolUseSection("xml", {}) });

	const toolCatalog = buildToolDescriptions({
		supportsComputerUse: false,
		includeCodebaseSearch: false,
		includeGenerateImage: false,
		includeRunSlashCommand: false,
		includeDiff: true,
		includeFastApply: false,
	});

	sections.push({ name: "toolsCatalog", text: `\n\n${toolCatalog}` });
	sections.push({ name: "toolUseGuidelines", text: getToolUseGuidelinesSection("xml", {}) });
	sections.push({ name: "mcpServers", text: "" });
	sections.push({ name: "capabilities", text: buildCapabilitiesSection() });
	sections.push({ name: "modes", text: buildModesSection(customModes, false) });
	sections.push({ name: "skills", text: "" });
	sections.push({ name: "rules", text: buildRulesSection({ includeFastApply: false }) });
	sections.push({ name: "alfaCodeWorkflow", text: getAlfaCodeWorkflowSection() });
	sections.push({ name: "memoryBank", text: memoryBankContext ? `\n${memoryBankContext}` : "" });
	sections.push({ name: "alfaCode1C", text: getAlfaCode1CSection(undefined) });
	sections.push({ name: "systemInfo", text: buildSystemInfoSection() });
	sections.push({ name: "objective", text: getObjectiveSection() });
	sections.push({ name: "customInstructions", text: customInstructionsSection });

	const totalText = sections.map((s) => s.text).join("\n\n");
	const totalChars = totalText.length;
	const totalTokens = tokenCount(totalText);

	console.log("=== AlfaCode prompt size (approx) ===");
	console.log(`Mode: code`);
	console.log(`Total chars: ${totalChars}`);
	console.log(`Total tokens (claude tokenizer): ${totalTokens}`);
	console.log("");
	console.log("Section breakdown:");
	for (const s of sections) {
		if (!s.text) continue;
		const chars = s.text.length;
		const tokens = tokenCount(s.text);
		console.log(`${s.name.padEnd(22)} chars=${String(chars).padStart(6)} tokens=${String(tokens).padStart(6)}`);
	}
	console.log("");
	console.log("Custom instructions sub-parts:");
	const agents = fs.readFileSync(path.join(cwd, "AGENTS.md"), "utf8");
	console.log(`AGENTS.md chars=${agents.length} tokens=${tokenCount(agents)}`);
	console.log(`mode customInstructions chars=${modeInstructions.length} tokens=${tokenCount(modeInstructions)}`);
}

main().catch((err) => {
	console.error(err);
	process.exit(1);
});
