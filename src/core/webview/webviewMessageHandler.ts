import * as vscode from "vscode"

import { type HistoryItem, type ProviderSettings, type RooCodeSettings, ORGANIZATION_ALLOW_ALL } from "@roo-code/types"

// Local type definitions for missing imports
interface CodeSymbol {
	name: string
	type: string
	[key: string]: any
}

interface CodeNode {
	id: string
	type: string
	label: string
	properties?: { [key: string]: any }
}

interface CodeEdge {
	source: string
	target: string
	type: string
	properties?: { [key: string]: any }
}

import { ProfileValidator } from "../../shared/ProfileValidator"
import { getModeBySlug } from "../../shared/modes"
import { experiments } from "../../shared/experiments"

import { Terminal } from "../../integrations/terminal/Terminal"
// import { resetAllTerminals } from "../../integrations/terminal/resetAllTerminals"
import { openFile } from "../../integrations/misc/open-file"
import { getTheme } from "../../integrations/theme/getTheme"
// import { openUrl } from "../../integrations/misc/openUrl"

import { McpServerManager } from "../../services/mcp/McpServerManager"
import { MarketplaceManager } from "../../services/marketplace/MarketplaceManager"
import { updateCodeIndexWithKiloProps } from "../../services/code-index/managed/webview"

import { setTtsEnabled, setTtsSpeed } from "../../utils/tts"
// import { getActiveEditorSelection } from "../../utils/getActiveEditorSelection"
import { OrganizationAllowListViolationError } from "../../utils/errors"

import { t } from "../../i18n"

// import { deleteMode } from "../config/deleteMode"

import type { ClineProvider } from "./ClineProvider"
import { WebviewMessage } from "../../shared/WebviewMessage"

export async function webviewMessageHandler(
	provider: ClineProvider,
	message: WebviewMessage,
	marketplaceManager: MarketplaceManager,
) {
	const { log, contextProxy, context } = provider
	const { type } = message
	const task = provider.getCurrentTask()

	try {
		switch (type) {
			case "addCodeSymbol": {
				const { symbol } = message
				const codeIndexManager = provider.getCurrentWorkspaceCodeIndexManager()
				if (codeIndexManager && symbol) {
					await (codeIndexManager as any).addSymbol?.(symbol)
					log(`Added symbol: ${symbol.id}`)
				} else {
					log("No active code index manager or symbol to add.")
				}
				break
			}
			case "addCodeNode": {
				const { node } = message
				const codeIndexManager = provider.getCurrentWorkspaceCodeIndexManager()
				if (codeIndexManager && node) {
					await (codeIndexManager as any).addOrUpdateNode?.(node)
					log(`Added node: ${node.id}`)
				} else {
					log("No active code index manager or node to add.")
				}
				break
			}
			case "addCodeEdge": {
				const { edge } = message
				const codeIndexManager = provider.getCurrentWorkspaceCodeIndexManager()
				if (codeIndexManager && edge) {
					await (codeIndexManager as any).addEdge?.(edge)
					log(`Added edge from ${edge.source} to ${edge.target}`)
				} else {
					log("No active code index manager or edge to add.")
				}
				break
			}
			case "searchCodeGraph": {
				const { query, searchType } = message
				const codeIndexManager = provider.getCurrentWorkspaceCodeIndexManager()
				if (codeIndexManager && query) {
					const results = await (codeIndexManager as any).searchByTerm?.(query, searchType)
					await provider.postMessageToWebview({
						type: "action" as any,
						action: "codeGraphSearchResults",
						results,
					} as any)
				} else {
					log("No active code index manager or query to search.")
				}
				break
			}
			case "copyToClipboard":
				if (message.text) await vscode.env.clipboard.writeText(message.text)
				break
			case "showInformationMessage":
				if (message.text) vscode.window.showInformationMessage(message.text)
				break
			case "showErrorMessage":
				if (message.text) vscode.window.showErrorMessage(message.text)
				break
			// case "openUrl":
			// 	if (message.url) openUrl(message.url)
			// 	break
			case "openFile":
				if (message.path) openFile(message.path)
				break
			case "getTheme":
				await provider.postMessageToWebview({ type: "theme", text: JSON.stringify(await getTheme()) })
				break
			case "getHistory":
				await provider.postStateToWebview()
				break
			case "clearHistory": {
				const taskHistory = provider.getTaskHistory()
				for (const task of taskHistory) {
					if (!task.isFavorited) {
						await provider.deleteTaskWithId(task.id)
					}
				}
				break
			}
			case "deleteTask":
				if (message.id) await provider.deleteTaskWithId(message.id)
				break
			case "deleteMultipleTasks":
				try {
					if (message.ids) await provider.deleteMultipleTasks(message.ids)
				} catch (error) {
					if (error instanceof Error) {
						vscode.window.showErrorMessage(error.message)
					}
				}
				break
			case "toggleTaskFavorite":
				if (message.id) await provider.toggleTaskFavorite(message.id)
				break
			case "exportTask":
				if (message.id) await provider.exportTaskWithId(message.id)
				break
			case "restoreTask":
				if (message.id) await provider.showTaskWithId(message.id)
				break
			case "condenseTaskContext":
				if (message.taskId) await provider.condenseTaskContext(message.taskId)
				break
			case "editTask":
				if (task && message.text && message.id) {
					;(task as any)?.handleMessage?.("edit", message.text, message.id)
				}
				break
			case "cancelTask":
				await provider.cancelTask()
				break
			case "getSettings":
				await provider.postStateToWebview()
				break
			case "resetState":
				await provider.resetState()
				break
			case "updateSetting": {
				const { key, value } = message
				if (key) {
					await contextProxy.setValue(key as keyof RooCodeSettings, value)

					// Handle specific settings that require immediate action
					if (key === "ttsEnabled") {
						setTtsEnabled(value as boolean)
					} else if (key === "ttsSpeed") {
						setTtsSpeed(value as number)
					} else if (key === "terminalShellIntegrationDisabled") {
						Terminal.setShellIntegrationDisabled(value as boolean)
					} else if (key === "terminalShellIntegrationTimeout") {
						Terminal.setShellIntegrationTimeout(value as number)
					} else if (key === "terminalCommandDelay") {
						Terminal.setCommandDelay(value as number)
					} else if (key === "terminalZshClearEolMark") {
						Terminal.setTerminalZshClearEolMark(value as boolean)
					} else if (key === "terminalZshOhMy") {
						Terminal.setTerminalZshOhMy(value as boolean)
					} else if (key === "terminalZshP10k") {
						Terminal.setTerminalZshP10k(value as boolean)
					} else if (key === "terminalZdotdir") {
						Terminal.setTerminalZdotdir(value as boolean)
					} else if (key === "terminalPowershellCounter") {
						Terminal.setPowershellCounter(value as boolean)
					} else if (key === "kilocodeToken") {
						await updateCodeIndexWithKiloProps(provider)
					} else if (key === "kilocodeOrganizationId") {
						await updateCodeIndexWithKiloProps(provider)
					}

					await provider.postStateToWebview()
				}
				break
			}
			case "updateCodebaseIndexConfig": {
				const { config } = message
				if (config) {
					const currentConfig = (await provider.getState()).codebaseIndexConfig
					await contextProxy.setValue("codebaseIndexConfig", { ...currentConfig, ...config })
					await provider.postStateToWebview()
				}
				break
			}
			case "reindexCodebase": {
				const codeIndexManager = provider.getCurrentWorkspaceCodeIndexManager()
				if (codeIndexManager) {
					await (codeIndexManager as any).reindex?.()
				} else {
					log("No active code index manager to reindex.")
				}
				break
			}
			case "pauseCodebaseIndexing": {
				const codeIndexManager = provider.getCurrentWorkspaceCodeIndexManager()
				if (codeIndexManager) {
					;(codeIndexManager as any).pause?.()
				} else {
					log("No active code index manager to pause.")
				}
				break
			}
			case "resumeCodebaseIndexing": {
				const codeIndexManager = provider.getCurrentWorkspaceCodeIndexManager()
				if (codeIndexManager) {
					;(codeIndexManager as any).resume?.()
				} else {
					log("No active code index manager to resume.")
				}
				break
			}
			case "cancelCodebaseIndexing": {
				const codeIndexManager = provider.getCurrentWorkspaceCodeIndexManager()
				if (codeIndexManager) {
					;(codeIndexManager as any).cancel?.()
				} else {
					log("No active code index manager to cancel.")
				}
				break
			}
			// case "resetTerminals":
			// 	await resetAllTerminals()
			// 	break
			case "newProviderProfile": {
				const { name, providerSettings, activate = true } = message
				if (name && providerSettings) {
					await provider.upsertProviderProfile(name, providerSettings, activate)
				}
				break
			}
			case "deleteProviderProfile": {
				if (message.profile) await provider.deleteProviderProfile(message.profile)
				break
			}
			case "activateProviderProfile": {
				if (message.name) await provider.activateProviderProfile({ name: message.name })
				break
			}
			case "updateCustomInstructions":
				if (message.instructions) await provider.updateCustomInstructions(message.instructions)
				break
			case "request":
				if (task && message.text) {
					;(task as any)?.handleMessage?.("request", message.text)
				}
				break
			case "messageResponse":
				task?.handleWebviewAskResponse(type, message.text, message.images)
				break
			case "userActionResponse":
				if (task && message.userAction && message.text) {
					;(task as any)?.handleUserActionResponse?.(message.userAction, message.text)
				}
				break
			case "toolResponse":
				if (task && message.tool && message.text && message.id) {
					;(task as any)?.handleToolResponse?.(message.tool, message.text, message.id)
				}
				break
			case "tool-result": {
				if (task) {
					;(task as any)?.handleToolResult?.(message)
				}
				break
			}
			case "new-task":
				try {
					await provider.createTask(message.text, message.images)
					await provider.postMessageToWebview({ type: "action", action: "chatButtonClicked" } as any)
				} catch (error) {
					if (error instanceof OrganizationAllowListViolationError) {
						vscode.window.showErrorMessage(error.message)
					} else {
						throw error
					}
				}
				break
			case "clear-task":
				await provider.clearTask()
				break
			case "insertAtCursor":
				{
					if (message.text) {
						const editor = vscode.window.activeTextEditor
						if (!editor) {
							vscode.window.showInformationMessage(t("common:errors.no_active_editor"))
							return
						}
						editor.edit((editBuilder: vscode.TextEditorEdit) => {
							if (editor.selection.isEmpty) {
								editBuilder.insert(editor.selection.active, message.text!)
							} else {
								editBuilder.replace(editor.selection, message.text!)
							}
						})
					}
				}
				break
			case "open-in-new-editor":
				{
					if (message.text) {
						const document = await vscode.workspace.openTextDocument({
							content: message.text,
							language: message.language,
						})
						await vscode.window.showTextDocument(document)
					}
				}
				break
			case "replace-selection-with-text":
				{
					if (message.text) {
						const editor = vscode.window.activeTextEditor
						if (!editor) {
							vscode.window.showInformationMessage(t("common:errors.no_active_editor"))
							return
						}
						editor.edit((editBuilder: vscode.TextEditorEdit) => {
							editBuilder.replace(editor.selection, message.text!)
						})
					}
				}
				break
			// case "get-active-editor-selection":
			// 	await provider.postMessageToWebview({
			// 		type: "activeEditorSelection" as any,
			// 		text: JSON.stringify(await getActiveEditorSelection()),
			// 	} as any)
			// 	break
			case "new-mode": {
				const { customMode, activate } = message
				if (customMode) {
					await (provider.customModesManager as any).saveCustomMode?.(customMode)
					if (activate && customMode.slug) {
						await provider.handleModeSwitch(customMode.slug)
					}
				}
				break
			}
			case "delete-mode":
				{
					// if (message.mode) {
					// 	const customModes = await provider.customModesManager.getCustomModes()
					// 	await deleteMode(contextProxy, provider, message.mode, customModes)
					// }
				}
				break
			case "mode-api-config-change": {
				const { mode, configId } = message
				if (mode && configId) {
					await provider.providerSettingsManager.setModeConfig(mode, configId)
					await provider.postStateToWebview()
				}
				break
			}
			case "mode-switch": {
				const { mode } = message
				if (mode) {
					const customModes = await provider.customModesManager.getCustomModes()
					const newMode = getModeBySlug(mode, customModes)
					if (newMode) {
						await provider.handleModeSwitch(newMode.slug)
					}
				}
				break
			}
			case "open-mode-selector":
				await contextProxy.setValue("hasOpenedModeSelector", true)
				break
			case "open-router-auth-callback":
				if (message.code) await provider.handleOpenRouterCallback(message.code)
				break
			case "glama-auth-callback":
				if (message.code) await provider.handleGlamaCallback(message.code)
				break
			case "requesty-auth-callback":
				if (message.code && message.baseUrl) {
					await provider.handleRequestyCallback(message.code, message.baseUrl)
				}
				break
			case "kilocode-auth-callback":
				if (message.token) await provider.handleKiloCodeCallback(message.token)
				break
			case "webview-loaded":
				provider.isViewLaunched = true
				await provider.postStateToWebview()
				await provider.postMessageToWebview({
					type: "action",
					action: "didBecomeVisible",
				} as any)
				// Fetch marketplace data after initial state is posted
				await marketplaceManager.getMarketplaceItems()
				break
			case "refresh-workspace":
				await provider.refreshWorkspace()
				break
			case "refreshRules":
				await provider.postRulesDataToWebview()
				break
			case "execute-mcp-command":
				try {
					const hub = await McpServerManager.getInstance(context, provider)
					if (hub && message.serverName && message.command) {
						await hub.callTool(message.serverName, message.command, message.args?.[0])
					} else {
						throw new Error("MCP Hub not available or missing parameters.")
					}
				} catch (error) {
					log(`Failed to execute MCP command: ${error}`)
					vscode.window.showErrorMessage(`Failed to execute MCP command: ${error}`)
				}
				break
			case "connect-mcp-server":
				{
					const mcpPath =
						(await vscode.window.showInputBox({
							prompt: "Enter the path to the MCP server executable",
							value: message.path,
						})) || message.path

					if (mcpPath && message.name) {
						try {
							const hub = await McpServerManager.getInstance(context, provider)
							const connection = await hub.connectToServer(message.name, {
								type: "stdio",
								command: mcpPath,
								timeout: 5000,
								cwd: provider.cwd ?? "",
								alwaysAllow: [],
								disabledTools: [],
							})

							await provider.postMessageToWebview({
								type: "mcpServerStatus" as any,
								name: connection.server.name,
								status: "connected",
								tools: connection.server.tools,
								resources: connection.server.resources,
							} as any)
						} catch (error) {
							log(`Failed to connect to MCP server: ${error}`)
							vscode.window.showErrorMessage(`Failed to connect to MCP server: ${error}`)
						}
					}
				}
				break
			case "disconnect-mcp-server":
				try {
					if (message.name) {
						const hub = await McpServerManager.getInstance(context, provider)
						await hub.deleteConnection(message.name)
						await provider.postMessageToWebview({
							type: "mcpServerStatus" as any,
							name: message.name,
							status: "disconnected",
						} as any)
					}
				} catch (error) {
					log(`Failed to disconnect MCP server: ${error}`)
					vscode.window.showErrorMessage(`Failed to disconnect MCP server: ${error}`)
				}
				break
			case "install-mcp-server":
				if (message.item) await marketplaceManager.installMarketplaceItem(message.item)
				break
			case "uninstall-mcp-server":
				if (message.item) await marketplaceManager.removeInstalledMarketplaceItem(message.item)
				break
			case "fetchMarketplaceData":
				await marketplaceManager.getMarketplaceItems()
				break
			case "fetch-mcp-readme":
				// if (message.repo) await marketplaceManager.fetchMcpReadme(message.repo)
				break
			case "editMessage": {
				if (!task) {
					log(`[edit-message] No active task found.`)
					return
				}

				const { experiments: exp } = await provider.getState()
				const usePendingEdit = experiments.isEnabled(exp, "pendingEdit" as any)
				const { messageTs, editedContent, images } = message

				if (messageTs && editedContent) {
					if (usePendingEdit) {
						const { messageIndex, apiConversationHistoryIndex } = (() => {
							const messageIndex = task.clineMessages.findIndex((msg) => msg.ts === messageTs)
							const apiConversationHistoryIndex = task.apiConversationHistory.findIndex(
								(msg) => msg.ts === messageTs,
							)
							return { messageIndex, apiConversationHistoryIndex }
						})()

						if (messageIndex !== -1 && task.taskId) {
							provider.setPendingEditOperation(`task-${task.taskId}`, {
								messageTs,
								editedContent,
								images,
								messageIndex,
								apiConversationHistoryIndex,
							})
						}
					} else {
						const messageIndex = task.clineMessages.findIndex((msg) => msg.ts === messageTs)
						if (messageIndex !== -1) {
							await task.overwriteClineMessages(task.clineMessages.slice(0, messageIndex))
							await task.handleWebviewAskResponse("messageResponse", editedContent, images)
						}
					}
				}
				break
			}
			case "remoteControlEnabled":
				if (typeof message.enabled === "boolean") {
					await provider.remoteControlEnabled(message.enabled)
				}
				break
			// kilocode_change start
			case "fetchMcpMarketplace":
				if (typeof message.force === "boolean") {
					await provider.fetchMcpMarketplace(message.force)
				}
				break
			case "downloadMcp":
				if (message.mcpId) await provider.downloadMcp(message.mcpId)
				break
			// kilocode_change end
			default:
				log(`Unknown message type: ${type}`)
				break
		}
	} catch (error) {
		const errorMessage = error instanceof Error ? error.message : String(error)
		log(`Error handling message type "${type}": ${errorMessage}`)
		log(error instanceof Error ? (error.stack ?? "") : "")
		vscode.window.showErrorMessage(`Error processing action "${type}": ${errorMessage}`)
	}
}
