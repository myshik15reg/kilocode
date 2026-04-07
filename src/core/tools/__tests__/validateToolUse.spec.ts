// npx vitest run src/core/tools/__tests__/validateToolUse.spec.ts

import type { ModeConfig } from "@roo-code/types"

import { modes } from "../../../shared/modes"
import { TOOL_GROUPS } from "../../../shared/tools"

import { validateToolUse, isToolAllowedForMode } from "../validateToolUse"

const codeMode = modes.find((m) => m.slug === "code")?.slug || "code"
const architectMode = modes.find((m) => m.slug === "architect")?.slug || "architect"
const askMode = modes.find((m) => m.slug === "ask")?.slug || "ask"

describe("mode-validator", () => {
	describe("isToolAllowedForMode", () => {
		describe("code mode", () => {
			it("allows all code mode tools", () => {
				// Code mode has all groups
				Object.entries(TOOL_GROUPS).forEach(([_, config]) => {
					config.tools.forEach((tool: string) => {
						expect(isToolAllowedForMode(tool, codeMode, [])).toBe(true)
					})
				})
			})

			it("disallows unknown tools", () => {
				expect(isToolAllowedForMode("unknown_tool" as any, codeMode, [])).toBe(false)
			})
		})

		describe("architect mode", () => {
			it("allows configured tools", () => {
				// Architect mode has read, browser, and mcp groups
				const architectTools = [
					...TOOL_GROUPS.read.tools,
					...TOOL_GROUPS.browser.tools,
					...TOOL_GROUPS.mcp.tools,
				]
				architectTools.forEach((tool) => {
					expect(isToolAllowedForMode(tool, architectMode, [])).toBe(true)
				})
			})
		})

		describe("ask mode", () => {
			it("allows configured tools", () => {
				// Ask mode has read, browser, and mcp groups
				const askTools = [...TOOL_GROUPS.read.tools, ...TOOL_GROUPS.browser.tools, ...TOOL_GROUPS.mcp.tools]
				askTools.forEach((tool) => {
					expect(isToolAllowedForMode(tool, askMode, [])).toBe(true)
				})
			})
		})

		describe("custom modes", () => {
			it("allows tools from custom mode configuration", () => {
				const customModes: ModeConfig[] = [
					{
						slug: "custom-mode",
						name: "Custom Mode",
						roleDefinition: "Custom role",
						groups: ["read", "edit"] as const,
					},
				]
				// Should allow tools from read and edit groups
				expect(isToolAllowedForMode("read_file", "custom-mode", customModes)).toBe(true)
				expect(isToolAllowedForMode("write_to_file", "custom-mode", customModes)).toBe(true)
				// Should not allow tools from other groups
				expect(isToolAllowedForMode("execute_command", "custom-mode", customModes)).toBe(false)
			})

			it("allows custom mode to override built-in mode", () => {
				const customModes: ModeConfig[] = [
					{
						slug: codeMode,
						name: "Custom Code Mode",
						roleDefinition: "Custom role",
						groups: ["read"] as const,
					},
				]
				// Should allow tools from read group
				expect(isToolAllowedForMode("read_file", codeMode, customModes)).toBe(true)
				// Should not allow tools from other groups
				expect(isToolAllowedForMode("write_to_file", codeMode, customModes)).toBe(false)
			})

			it("respects tool requirements in custom modes", () => {
				const customModes: ModeConfig[] = [
					{
						slug: "custom-mode",
						name: "Custom Mode",
						roleDefinition: "Custom role",
						groups: ["edit"] as const,
					},
				]
				const requirements = { apply_diff: false }

				// Should respect disabled requirement even if tool group is allowed
				expect(isToolAllowedForMode("apply_diff", "custom-mode", customModes, requirements)).toBe(false)

				// Should allow other edit tools
				expect(isToolAllowedForMode("write_to_file", "custom-mode", customModes, requirements)).toBe(true)
			})
		})

		describe("dynamic MCP tools", () => {
			it("allows dynamic MCP tools when mcp group is in mode groups", () => {
				// Code mode has mcp group, so dynamic MCP tools should be allowed
				expect(isToolAllowedForMode("mcp_context7_resolve-library-id", codeMode, [])).toBe(true)
				expect(isToolAllowedForMode("mcp_serverName_toolName", codeMode, [])).toBe(true)
			})

			it("disallows dynamic MCP tools when mcp group is not in mode groups", () => {
				const customModes: ModeConfig[] = [
					{
						slug: "no-mcp-mode",
						name: "No MCP Mode",
						roleDefinition: "Custom role",
						groups: ["read", "edit"] as const,
					},
				]
				// Custom mode without mcp group should not allow dynamic MCP tools
				expect(isToolAllowedForMode("mcp_context7_resolve-library-id", "no-mcp-mode", customModes)).toBe(false)
				expect(isToolAllowedForMode("mcp_serverName_toolName", "no-mcp-mode", customModes)).toBe(false)
			})

			it("allows dynamic MCP tools in custom mode with mcp group", () => {
				const customModes: ModeConfig[] = [
					{
						slug: "custom-mcp-mode",
						name: "Custom MCP Mode",
						roleDefinition: "Custom role",
						groups: ["read", "mcp"] as const,
					},
				]
				expect(isToolAllowedForMode("mcp_context7_resolve-library-id", "custom-mcp-mode", customModes)).toBe(
					true,
				)
			})
		})

		describe("tool requirements", () => {
			it("respects tool requirements when provided", () => {
				const requirements = { apply_diff: false }
				expect(isToolAllowedForMode("apply_diff", codeMode, [], requirements)).toBe(false)

				const enabledRequirements = { apply_diff: true }
				expect(isToolAllowedForMode("apply_diff", codeMode, [], enabledRequirements)).toBe(true)
			})

			it("allows tools when their requirements are not specified", () => {
				const requirements = { some_other_tool: true }
				expect(isToolAllowedForMode("apply_diff", codeMode, [], requirements)).toBe(true)
			})

			it("handles undefined and empty requirements", () => {
				expect(isToolAllowedForMode("apply_diff", codeMode, [], undefined)).toBe(true)
				expect(isToolAllowedForMode("apply_diff", codeMode, [], {})).toBe(true)
			})

			it("prioritizes requirements over mode configuration", () => {
				const requirements = { apply_diff: false }
				// Even in code mode which allows all tools, disabled requirement should take precedence
				expect(isToolAllowedForMode("apply_diff", codeMode, [], requirements)).toBe(false)
			})
		})
	})

	describe("validateToolUse", () => {
		it("throws error for unknown/invalid tools", () => {
			// Unknown tools should throw with a specific "Unknown tool" error
			expect(() => validateToolUse("unknown_tool" as any, "architect", [])).toThrow(
				'Unknown tool "unknown_tool". This tool does not exist.',
			)
		})

		it("throws error for codebase_search when required query is missing/empty", () => {
			// FIX: codebase_search-missing-query (TestAnalyzer)
			expect(() => validateToolUse("codebase_search" as any, codeMode, [], undefined, {})).toThrow(
				/Invalid arguments for codebase_search: missing or empty required parameter "query"/,
			)
			expect(() => validateToolUse("codebase_search" as any, codeMode, [], undefined, { query: "   " })).toThrow(
				/Invalid arguments for codebase_search: missing or empty required parameter "query"/,
			)
		})

		it("throws error for web_search when required query is missing/empty", () => {
			expect(() => validateToolUse("web_search" as any, codeMode, [], undefined, {})).toThrow(
				/Invalid arguments for web_search: missing or empty required parameter "query"/,
			)
			expect(() => validateToolUse("web_search" as any, codeMode, [], undefined, { query: "   " })).toThrow(
				/Invalid arguments for web_search: missing or empty required parameter "query"/,
			)
			expect(() =>
				validateToolUse("web_search" as any, codeMode, [], undefined, { query: "docs", provider: "   " }),
			).toThrow(/Invalid arguments for web_search: optional parameter "provider" must be a non-empty string/)
		})

		it("throws error for read_file when neither legacy path nor valid files are provided", () => {
			expect(() => validateToolUse("read_file" as any, codeMode, [], undefined, {})).toThrow(
				/Invalid arguments for read_file: provide either a non-empty legacy "path" or a non-empty "files" array/,
			)
			expect(() => validateToolUse("read_file" as any, codeMode, [], undefined, { path: "   " })).toThrow(
				/Invalid arguments for read_file: provide either a non-empty legacy "path" or a non-empty "files" array/,
			)
			expect(() => validateToolUse("read_file" as any, codeMode, [], undefined, { files: [] })).toThrow(
				/Invalid arguments for read_file: provide either a non-empty legacy "path" or a non-empty "files" array/,
			)
			expect(() =>
				validateToolUse("read_file" as any, codeMode, [], undefined, { files: [{ path: "   " }] }),
			).toThrow(
				/Invalid arguments for read_file: provide either a non-empty legacy "path" or a non-empty "files" array/,
			)
			expect(() =>
				validateToolUse("read_file" as any, codeMode, [], undefined, { path: "src/file.ts" }),
			).not.toThrow()
			expect(() =>
				validateToolUse("read_file" as any, codeMode, [], undefined, { files: [{ path: "src/file.ts" }] }),
			).not.toThrow()
		})

		it("throws error for search_and_replace when path or operations are invalid", () => {
			expect(() =>
				validateToolUse("search_and_replace" as any, codeMode, [], undefined, {}, undefined, [
					"search_and_replace",
				]),
			).toThrow(/Invalid arguments for search_and_replace: missing or empty required parameter "path"/)
			expect(() =>
				validateToolUse(
					"search_and_replace" as any,
					codeMode,
					[],
					undefined,
					{ path: "src/file.ts" },
					undefined,
					["search_and_replace"],
				),
			).toThrow(/Invalid arguments for search_and_replace: missing or empty required parameter "operations"/)
			expect(() =>
				validateToolUse(
					"search_and_replace" as any,
					codeMode,
					[],
					undefined,
					{ path: "src/file.ts", operations: [] },
					undefined,
					["search_and_replace"],
				),
			).toThrow(/Invalid arguments for search_and_replace: missing or empty required parameter "operations"/)
			expect(() =>
				validateToolUse(
					"search_and_replace" as any,
					codeMode,
					[],
					undefined,
					{
						path: "src/file.ts",
						operations: [{ search: "   ", replace: "new" }],
					},
					undefined,
					["search_and_replace"],
				),
			).toThrow(
				/Invalid arguments for search_and_replace: every operation must include a non-empty string "search" and a string "replace"/,
			)
		})

		it("throws error for search_replace when file_path or strings are invalid", () => {
			expect(() =>
				validateToolUse("search_replace" as any, codeMode, [], undefined, {}, undefined, ["search_replace"]),
			).toThrow(/Invalid arguments for search_replace: missing or empty required parameter "file_path"/)
			expect(() =>
				validateToolUse(
					"search_replace" as any,
					codeMode,
					[],
					undefined,
					{ file_path: "src/file.ts" },
					undefined,
					["search_replace"],
				),
			).toThrow(/Invalid arguments for search_replace: missing or empty required parameter "old_string"/)
			expect(() =>
				validateToolUse(
					"search_replace" as any,
					codeMode,
					[],
					undefined,
					{ file_path: "src/file.ts", old_string: "old" },
					undefined,
					["search_replace"],
				),
			).toThrow(/Invalid arguments for search_replace: missing required parameter "new_string"/)
		})

		it("throws error for edit_file when file_path or strings are invalid", () => {
			expect(() => validateToolUse("edit_file" as any, codeMode, [], undefined, {})).toThrow(
				/Invalid arguments for edit_file: missing or empty required parameter "file_path"/,
			)
			expect(() =>
				validateToolUse("edit_file" as any, codeMode, [], undefined, {
					file_path: "src/file.ts",
					new_string: "new",
				}),
			).toThrow(/Invalid arguments for edit_file: missing required parameter "old_string"/)
			expect(() =>
				validateToolUse("edit_file" as any, codeMode, [], undefined, {
					file_path: "src/file.ts",
					old_string: "old",
				}),
			).toThrow(/Invalid arguments for edit_file: missing required parameter "new_string"/)
			expect(() =>
				validateToolUse("edit_file" as any, codeMode, [], undefined, {
					file_path: "src/file.ts",
					old_string: "",
					new_string: "content",
				}),
			).not.toThrow()
			expect(() =>
				validateToolUse("edit_file" as any, codeMode, [], undefined, {
					file_path: "src/file.ts",
					old_string: "old",
					new_string: "",
				}),
			).not.toThrow()
		})

		it("throws error for attempt_completion when result is missing or empty", () => {
			expect(() => validateToolUse("attempt_completion" as any, codeMode, [], undefined, {})).toThrow(
				/Invalid arguments for attempt_completion: missing or empty required parameter "result"/,
			)
			expect(() =>
				validateToolUse("attempt_completion" as any, codeMode, [], undefined, { result: "   " }),
			).toThrow(/Invalid arguments for attempt_completion: missing or empty required parameter "result"/)
			expect(() =>
				validateToolUse("attempt_completion" as any, codeMode, [], undefined, { result: "Task done" }),
			).not.toThrow()
		})

		it("throws error for ask_followup_question when question or suggestions are invalid", () => {
			expect(() => validateToolUse("ask_followup_question" as any, codeMode, [], undefined, {})).toThrow(
				/Invalid arguments for ask_followup_question: missing or empty required parameter "question"/,
			)
			expect(() =>
				validateToolUse("ask_followup_question" as any, codeMode, [], undefined, {
					question: "Need more info",
				}),
			).toThrow(/Invalid arguments for ask_followup_question: missing or empty required parameter "follow_up"/)
			expect(() =>
				validateToolUse("ask_followup_question" as any, codeMode, [], undefined, {
					question: "   ",
					follow_up: [{ text: "Yes", mode: null }],
				}),
			).toThrow(/Invalid arguments for ask_followup_question: missing or empty required parameter "question"/)
			expect(() =>
				validateToolUse("ask_followup_question" as any, codeMode, [], undefined, {
					question: "Need more info",
					follow_up: [{ text: "   ", mode: null }],
				}),
			).toThrow(
				/Invalid arguments for ask_followup_question: each follow_up item must include a non-empty string "text"/,
			)
			expect(() =>
				validateToolUse("ask_followup_question" as any, codeMode, [], undefined, {
					question: "Need more info",
					follow_up: [{ text: "Yes", mode: 1 }],
				}),
			).toThrow(
				/Invalid arguments for ask_followup_question: each follow_up item must include a non-empty string "text"/,
			)
			expect(() =>
				validateToolUse("ask_followup_question" as any, codeMode, [], undefined, {
					question: "Need more info",
					follow_up: [{ text: "Yes", mode: null }],
				}),
			).not.toThrow()
		})

		it("throws error for request_user_input when questions are invalid", () => {
			expect(() => validateToolUse("request_user_input" as any, codeMode, [], undefined, {})).toThrow(
				/Invalid arguments for request_user_input: provide a valid "questions" array/,
			)
			expect(() =>
				validateToolUse("request_user_input" as any, codeMode, [], undefined, {
					questions: [
						{
							header: "Scope",
							question: "Which slice?",
							options: [{ label: "Search", description: "Only one option is invalid." }],
						},
					],
				}),
			).toThrow(/Invalid arguments for request_user_input: provide a valid "questions" array/)
			expect(() =>
				validateToolUse("request_user_input" as any, codeMode, [], undefined, {
					questions: [
						{
							header: "Scope",
							question: "Which slice?",
							options: [
								{ label: "Search", description: "Start with provider-aware search." },
								{ label: "UI", description: "Start with the structured input UI." },
							],
						},
					],
				}),
			).not.toThrow()
		})

		it("throws error for fetch_instructions when task is missing or empty", () => {
			expect(() => validateToolUse("fetch_instructions" as any, codeMode, [], undefined, {})).toThrow(
				/Invalid arguments for fetch_instructions: missing or empty required parameter "task"/,
			)
			expect(() =>
				validateToolUse("fetch_instructions" as any, codeMode, [], undefined, { task: "   " }),
			).toThrow(/Invalid arguments for fetch_instructions: missing or empty required parameter "task"/)
			expect(() =>
				validateToolUse("fetch_instructions" as any, codeMode, [], undefined, { task: "workflow init" }),
			).not.toThrow()
		})

		it("throws error for run_slash_command when command is missing or empty", () => {
			expect(() => validateToolUse("run_slash_command" as any, codeMode, [], undefined, {})).toThrow(
				/Invalid arguments for run_slash_command: missing or empty required parameter "command"/,
			)
			expect(() =>
				validateToolUse("run_slash_command" as any, codeMode, [], undefined, { command: "   " }),
			).toThrow(/Invalid arguments for run_slash_command: missing or empty required parameter "command"/)
			expect(() =>
				validateToolUse("run_slash_command" as any, codeMode, [], undefined, { command: "init-protocol" }),
			).not.toThrow()
		})

		it("throws error for generate_image when prompt or path are invalid", () => {
			expect(() => validateToolUse("generate_image" as any, codeMode, [], undefined, {})).toThrow(
				/Invalid arguments for generate_image: missing or empty required parameter "prompt"/,
			)
			expect(() =>
				validateToolUse("generate_image" as any, codeMode, [], undefined, { prompt: "draw cat" }),
			).toThrow(/Invalid arguments for generate_image: missing or empty required parameter "path"/)
			expect(() =>
				validateToolUse("generate_image" as any, codeMode, [], undefined, { prompt: "   ", path: "img.png" }),
			).toThrow(/Invalid arguments for generate_image: missing or empty required parameter "prompt"/)
			expect(() =>
				validateToolUse("generate_image" as any, codeMode, [], undefined, { prompt: "draw cat", path: "   " }),
			).toThrow(/Invalid arguments for generate_image: missing or empty required parameter "path"/)
			expect(() =>
				validateToolUse("generate_image" as any, codeMode, [], undefined, {
					prompt: "draw cat",
					path: "images/cat.png",
				}),
			).not.toThrow()
		})

		it("throws error for access_mcp_resource when server_name or uri are invalid", () => {
			expect(() => validateToolUse("access_mcp_resource" as any, codeMode, [], undefined, {})).toThrow(
				/Invalid arguments for access_mcp_resource: missing or empty required parameter "server_name"/,
			)
			expect(() =>
				validateToolUse("access_mcp_resource" as any, codeMode, [], undefined, { server_name: "context7" }),
			).toThrow(/Invalid arguments for access_mcp_resource: missing or empty required parameter "uri"/)
			expect(() =>
				validateToolUse("access_mcp_resource" as any, codeMode, [], undefined, {
					server_name: "   ",
					uri: "resource://x",
				}),
			).toThrow(/Invalid arguments for access_mcp_resource: missing or empty required parameter "server_name"/)
			expect(() =>
				validateToolUse("access_mcp_resource" as any, codeMode, [], undefined, {
					server_name: "context7",
					uri: "   ",
				}),
			).toThrow(/Invalid arguments for access_mcp_resource: missing or empty required parameter "uri"/)
			expect(() =>
				validateToolUse("access_mcp_resource" as any, codeMode, [], undefined, {
					server_name: "context7",
					uri: "resource://x",
				}),
			).not.toThrow()
		})

		it("throws error for use_mcp_tool when server_name, tool_name, or arguments are invalid", () => {
			expect(() => validateToolUse("use_mcp_tool" as any, codeMode, [], undefined, {})).toThrow(
				/Invalid arguments for use_mcp_tool: missing or empty required parameter "server_name"/,
			)
			expect(() =>
				validateToolUse("use_mcp_tool" as any, codeMode, [], undefined, { server_name: "context7" }),
			).toThrow(/Invalid arguments for use_mcp_tool: missing or empty required parameter "tool_name"/)
			expect(() =>
				validateToolUse("use_mcp_tool" as any, codeMode, [], undefined, {
					server_name: "   ",
					tool_name: "resolve",
				}),
			).toThrow(/Invalid arguments for use_mcp_tool: missing or empty required parameter "server_name"/)
			expect(() =>
				validateToolUse("use_mcp_tool" as any, codeMode, [], undefined, {
					server_name: "context7",
					tool_name: "   ",
				}),
			).toThrow(/Invalid arguments for use_mcp_tool: missing or empty required parameter "tool_name"/)
			expect(() =>
				validateToolUse("use_mcp_tool" as any, codeMode, [], undefined, {
					server_name: "context7",
					tool_name: "resolve",
					arguments: [],
				}),
			).toThrow(
				/Invalid arguments for use_mcp_tool: optional parameter "arguments" must be a JSON object or JSON string payload/,
			)
			expect(() =>
				validateToolUse("use_mcp_tool" as any, codeMode, [], undefined, {
					server_name: "context7",
					tool_name: "resolve",
					arguments: { id: 1 },
				}),
			).not.toThrow()
			expect(() =>
				validateToolUse("use_mcp_tool" as any, codeMode, [], undefined, {
					server_name: "context7",
					tool_name: "resolve",
					arguments: '{"id":1}',
				}),
			).not.toThrow()
		})
		it("throws error for execute_command when command is missing or empty", () => {
			expect(() => validateToolUse("execute_command" as any, codeMode, [], undefined, {})).toThrow(
				/Invalid arguments for execute_command: missing or empty required parameter "command"/,
			)
			expect(() =>
				validateToolUse("execute_command" as any, codeMode, [], undefined, { command: "   " }),
			).toThrow(/Invalid arguments for execute_command: missing or empty required parameter "command"/)
		})

		it("throws error for apply_patch when patch is missing or empty", () => {
			expect(() =>
				validateToolUse("apply_patch" as any, codeMode, [], undefined, {}, undefined, ["apply_patch"]),
			).toThrow(/Invalid arguments for apply_patch: missing or empty required parameter "patch"/)
			expect(() =>
				validateToolUse("apply_patch" as any, codeMode, [], undefined, { patch: "   " }, undefined, [
					"apply_patch",
				]),
			).toThrow(/Invalid arguments for apply_patch: missing or empty required parameter "patch"/)
		})

		it("throws error for apply_diff when path or diff are invalid", () => {
			expect(() => validateToolUse("apply_diff" as any, codeMode, [], undefined, {})).toThrow(
				/Invalid arguments for apply_diff: missing or empty required parameter "path"/,
			)
			expect(() =>
				validateToolUse("apply_diff" as any, codeMode, [], undefined, { path: "src/file.ts" }),
			).toThrow(/Invalid arguments for apply_diff: missing or empty required parameter "diff"/)
			expect(() =>
				validateToolUse("apply_diff" as any, codeMode, [], undefined, { path: "   ", diff: "patch" }),
			).toThrow(/Invalid arguments for apply_diff: missing or empty required parameter "path"/)
			expect(() =>
				validateToolUse("apply_diff" as any, codeMode, [], undefined, { path: "src/file.ts", diff: "   " }),
			).toThrow(/Invalid arguments for apply_diff: missing or empty required parameter "diff"/)
			expect(() =>
				validateToolUse("apply_diff" as any, codeMode, [], undefined, {
					path: "src/file.ts",
					diff: "@@ -1 +1 @@",
				}),
			).not.toThrow()
		})

		it("throws error for write_to_file when path or content are invalid", () => {
			expect(() => validateToolUse("write_to_file" as any, codeMode, [], undefined, {})).toThrow(
				/Invalid arguments for write_to_file: missing or empty required parameter "path"/,
			)
			expect(() =>
				validateToolUse("write_to_file" as any, codeMode, [], undefined, { path: "src/file.ts" }),
			).toThrow(/Invalid arguments for write_to_file: missing required parameter "content"/)
			expect(() =>
				validateToolUse("write_to_file" as any, codeMode, [], undefined, { path: "   ", content: "hello" }),
			).toThrow(/Invalid arguments for write_to_file: missing or empty required parameter "path"/)
			expect(() =>
				validateToolUse("write_to_file" as any, codeMode, [], undefined, {
					path: "src/file.ts",
					content: "hello",
				}),
			).not.toThrow()
			expect(() =>
				validateToolUse("write_to_file" as any, codeMode, [], undefined, { path: "src/file.ts", content: "" }),
			).not.toThrow()
		})
		it("throws error for disallowed tools in architect mode", () => {
			// execute_command is a valid tool but not allowed in architect mode
			expect(() => validateToolUse("execute_command", "architect", [])).toThrow(
				'Tool "execute_command" is not allowed in architect mode.',
			)
		})

		it("does not throw for allowed tools in architect mode", () => {
			expect(() =>
				validateToolUse("read_file", "architect", [], undefined, { path: "src/file.ts" }),
			).not.toThrow()
		})

		it("throws error when tool requirement is not met", () => {
			const requirements = { apply_diff: false }
			expect(() => validateToolUse("apply_diff", codeMode, [], requirements)).toThrow(
				'Tool "apply_diff" is not allowed in code mode.',
			)
		})

		it("does not throw when tool requirement is met", () => {
			const requirements = { apply_diff: true }
			expect(() =>
				validateToolUse("apply_diff", codeMode, [], requirements, { path: "src/file.ts", diff: "@@ -1 +1 @@" }),
			).not.toThrow()
		})

		it("handles undefined requirements gracefully", () => {
			expect(() =>
				validateToolUse("apply_diff", codeMode, [], undefined, { path: "src/file.ts", diff: "@@ -1 +1 @@" }),
			).not.toThrow()
		})
	})
})

describe("read_file malformed path validation", () => {
	it("rejects legacy read_file paths that contain streamed tool-call garbage", () => {
		expect(() =>
			validateToolUse("read_file" as any, codeMode, [], undefined, {
				path: ".kilocode/skills/test-skill/SKILL.md'}} qnhassistant to=functions.read_file",
			}),
		).toThrow(/contains non-path stream content/)
	})

	it("rejects native read_file files[].path values that contain streamed tool-call garbage", () => {
		expect(() =>
			validateToolUse("read_file" as any, codeMode, [], undefined, {
				files: [{ path: ".kilocode/skills/test-skill/SKILL.md'}} qnhassistant to=functions.read_file" }],
			}),
		).toThrow(/files\[\]\.path|files\[\]\.path values contain non-path stream content/)
	})
})
