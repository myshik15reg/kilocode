import * as vscode from "vscode"

import {
	type HistoryItem,
	type ProviderSettings,
	type RooCodeSettings,
	ORGANIZATION_ALLOW_ALL,
	type EditQueuedMessagePayload,
} from "@roo-code/types"

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
import * as path from "path"
import * as os from "os"
import * as fs from "fs-extra"
import { getCurrentCwd } from "../../utils/system"
import { getGlobalState, updateGlobalState } from "../../utils/state"
import { AutoPurgeScheduler } from "../../services/auto-purge/AutoPurgeScheduler"
import { singleCompletionHandler } from "../llm/singleCompletionHandler"
import { ManagedIndexer } from "../../services/code-index/managed/ManagedIndexer"

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
						Terminal.setTerminalZshClearEolMark(Boolean(value))
					} else if (key === "terminalZshOhMy") {
						Terminal.setTerminalZshOhMy(Boolean(value))
					} else if (key === "terminalZshP10k") {
						Terminal.setTerminalZshP10k(Boolean(value))
					} else if (key === "terminalZdotdir") {
						Terminal.setTerminalZdotdir(Boolean(value))
					} else if (key === "terminalPowershellCounter") {
						Terminal.setPowershellCounter(Boolean(value))
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
					const codeIndexManager = provider.getCurrentWorkspaceCodeIndexManager()
					if (!codeIndexManager) {
						log("No active code index manager to update config.")
						return
					}
					if (config.codebaseIndexQdrantCollectionName) {
						const validationError = codeIndexManager.validateCollectionName(
							config.codebaseIndexQdrantCollectionName,
						)
						if (validationError) {
							vscode.window.showErrorMessage(`Invalid collection name: ${validationError}`)
							return
						}
					}

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
			case "createCommand": {
				try {
					const source = message.values?.source as "global" | "project"
					const fileName = message.text // Custom filename from user input

					if (!source) {
						provider.log("Missing source for createCommand")
						break
					}

					// Determine the commands directory based on source
					let commandsDir: string
					if (source === "global") {
						const globalConfigDir = path.join(os.homedir(), ".roo")
						commandsDir = path.join(globalConfigDir, "commands")
					} else {
						if (!vscode.workspace.workspaceFolders?.length) {
							vscode.window.showErrorMessage(t("common:errors.no_workspace"))
							return
						}
						// Project commands
						const workspaceRoot = getCurrentCwd()
						if (!workspaceRoot) {
							vscode.window.showErrorMessage(t("common:errors.no_workspace_for_project_command"))
							break
						}
						commandsDir = path.join(workspaceRoot, ".roo", "commands")
					}

					// Ensure the commands directory exists
					await fs.mkdir(commandsDir, { recursive: true })

					// Use provided filename or generate a unique one
					let commandName: string
					if (fileName && fileName.trim()) {
						let cleanFileName = fileName.trim()

						// Strip leading slash if present
						if (cleanFileName.startsWith("/")) {
							cleanFileName = cleanFileName.substring(1)
						}

						// Remove .md extension if present BEFORE slugification
						if (cleanFileName.toLowerCase().endsWith(".md")) {
							cleanFileName = cleanFileName.slice(0, -3)
						}

						// Slugify the command name: lowercase, replace spaces with dashes, remove special characters
						commandName = cleanFileName
							.toLowerCase()
							.replace(/\s+/g, "-") // Replace spaces with dashes
							.replace(/[^a-z0-9-]/g, "") // Remove special characters except dashes
							.replace(/-+/g, "-") // Replace multiple dashes with single dash
							.replace(/^-|-$/g, "") // Remove leading/trailing dashes

						// Ensure we have a valid command name
						if (!commandName || commandName.length === 0) {
							commandName = "new-command"
						}
					} else {
						// Generate a unique command name
						commandName = "new-command"
						let counter = 1
						let filePath = path.join(commandsDir, `${commandName}.md`)

						while (
							await fs
								.access(filePath)
								.then(() => true)
								.catch(() => false)
						) {
							commandName = `new-command-${counter}`
							filePath = path.join(commandsDir, `${commandName}.md`)
							counter++
						}
					}

					const filePath = path.join(commandsDir, `${commandName}.md`)

					// Check if file already exists
					if (
						await fs
							.access(filePath)
							.then(() => true)
							.catch(() => false)
					) {
						vscode.window.showErrorMessage(t("common:errors.command_already_exists", { commandName }))
						break
					}

					// Create the command file with template content
					const templateContent = t("common:errors.command_template_content")

					await fs.writeFile(filePath, templateContent, "utf8")
					provider.log(`Created new command file: ${filePath}`)

					// Open the new file in the editor
					openFile(filePath)

					// Refresh commands list
					const { getCommands } = await import("../../services/command/commands")
					const commands = await getCommands(getCurrentCwd() || "")
					const commandList = commands.map((command) => ({
						name: command.name,
						source: command.source,
						filePath: command.filePath,
						description: command.description,
						argumentHint: command.argumentHint,
					}))
					await provider.postMessageToWebview({
						type: "commands",
						commands: commandList,
					})
				} catch (error) {
					provider.log(
						`Error creating command: ${JSON.stringify(error, Object.getOwnPropertyNames(error), 2)}`,
					)
					vscode.window.showErrorMessage(t("common:errors.create_command_failed"))
				}
				break
			}
			case "insertTextIntoTextarea": {
				const text = message.text
				if (text) {
					// Send message to insert text into the chat textarea
					await provider.postMessageToWebview({
						type: "insertTextIntoTextarea",
						text: text,
					})
				}
				break
			}
			case "showMdmAuthRequiredNotification": {
				// Show notification that organization requires authentication
				vscode.window.showWarningMessage(t("common:mdm.info.organization_requires_auth"))
				break
			}

			// kilocode_change start - Auto-purge settings handlers
			case "autoPurgeEnabled":
				await updateGlobalState("autoPurgeEnabled", message.bool ?? false)
				await provider.postStateToWebview()
				break
			case "autoPurgeDefaultRetentionDays":
				await updateGlobalState("autoPurgeDefaultRetentionDays", message.value ?? 30)
				await provider.postStateToWebview()
				break
			case "autoPurgeFavoritedTaskRetentionDays":
				await updateGlobalState("autoPurgeFavoritedTaskRetentionDays", message.value ?? null)
				await provider.postStateToWebview()
				break
			case "autoPurgeCompletedTaskRetentionDays":
				await updateGlobalState("autoPurgeCompletedTaskRetentionDays", message.value ?? 30)
				await provider.postStateToWebview()
				break
			case "autoPurgeIncompleteTaskRetentionDays":
				await updateGlobalState("autoPurgeIncompleteTaskRetentionDays", message.value ?? 7)
				await provider.postStateToWebview()
				break
			case "manualPurge":
				try {
					const state = await provider.getState()
					const autoPurgeSettings = {
						enabled: state.autoPurgeEnabled ?? false,
						defaultRetentionDays: state.autoPurgeDefaultRetentionDays ?? 30,
						favoritedTaskRetentionDays: state.autoPurgeFavoritedTaskRetentionDays ?? null,
						completedTaskRetentionDays: state.autoPurgeCompletedTaskRetentionDays ?? 30,
						incompleteTaskRetentionDays: state.autoPurgeIncompleteTaskRetentionDays ?? 7,
						lastRunTimestamp: state.autoPurgeLastRunTimestamp,
					}

					if (!autoPurgeSettings.enabled) {
						vscode.window.showWarningMessage("Auto-purge is disabled. Please enable it in settings first.")
						break
					}

					const scheduler = new AutoPurgeScheduler(provider.contextProxy.globalStorageUri.fsPath)
					const currentTaskId = provider.getCurrentTask()?.taskId

					await scheduler.triggerManualPurge(
						autoPurgeSettings,
						provider.getTaskHistory(),
						currentTaskId,
						async (taskId: string) => {
							// Remove task from state when purged
							await provider.deleteTaskFromState(taskId)
						},
					)

					// Update last run timestamp
					await updateGlobalState("autoPurgeLastRunTimestamp", Date.now())
					await provider.postStateToWebview()
				} catch (error) {
					const errorMessage = error instanceof Error ? error.message : String(error)
					provider.log(`Error in manual purge: ${errorMessage}`)
					vscode.window.showErrorMessage(`Manual purge failed: ${errorMessage}`)
				}
				break

			// kilocode_change end

			/**
			 * Chat Message Queue
			 */

			case "queueMessage": {
				provider.getCurrentTask()?.messageQueueService.addMessage(message.text ?? "", message.images)
				break
			}
			case "removeQueuedMessage": {
				provider.getCurrentTask()?.messageQueueService.removeMessage(message.text ?? "")
				break
			}
			case "editQueuedMessage": {
				if (message.payload) {
					const { id, text, images } = message.payload as EditQueuedMessagePayload
					provider.getCurrentTask()?.messageQueueService.updateMessage(id, text, images)
				}

				break
			}

			case "dismissUpsell": {
				if (message.upsellId) {
					try {
						// Get current list of dismissed upsells
						const dismissedUpsells = getGlobalState("dismissedUpsells") || []

						// Add the new upsell ID if not already present
						let updatedList = dismissedUpsells
						if (!dismissedUpsells.includes(message.upsellId)) {
							updatedList = [...dismissedUpsells, message.upsellId]
							await updateGlobalState("dismissedUpsells", updatedList)
						}

						// Send updated list back to webview (use the already computed updatedList)
						await provider.postMessageToWebview({
							type: "dismissedUpsells",
							list: updatedList,
						})
					} catch (error) {
						// Fail silently as per Bruno's comment - it's OK to fail silently in this case
						provider.log(`Failed to dismiss upsell: ${error instanceof Error ? error.message : String(error)}`)
					}
				}
				break
			}
			case "getDismissedUpsells": {
				// Send the current list of dismissed upsells to the webview
				const dismissedUpsells = getGlobalState("dismissedUpsells") || []
				await provider.postMessageToWebview({
					type: "dismissedUpsells",
					list: dismissedUpsells,
				})
				break
			}
			// kilocode_change start
			case "addTaskToHistory": {
				if (message.historyItem) {
					await provider.updateTaskHistory(message.historyItem)
					await provider.postStateToWebview()
				}
				break
			}
			case "singleCompletion": {
				try {
					const { text, completionRequestId } = message

					if (!completionRequestId) {
						throw new Error("Missing completionRequestId")
					}

					if (!text) {
						throw new Error("Missing prompt text")
					}

					// Always use current configuration
					const config = (await provider.getState()).apiConfiguration

					// Call the single completion handler
					const result = await singleCompletionHandler(config, text)

					// Send success response
					await provider.postMessageToWebview({
						type: "singleCompletionResult",
						completionRequestId,
						completionText: result,
						success: true,
					})
				} catch (error) {
					// Send error response
					await provider.postMessageToWebview({
						type: "singleCompletionResult",
						completionRequestId: message.completionRequestId,
						completionError: error instanceof Error ? error.message : String(error),
						success: false,
					})
				}
				break
			}
			// kilocode_change end
			// kilocode_change start - ManagedIndexer state
			case "requestManagedIndexerState": {
				ManagedIndexer.getInstance()?.sendStateToWebview()
				break
			}
			// kilocode_change end
			default: {
				// console.log(`Unhandled message type: ${message.type}`)
				//
				// Currently unhandled:
				//
				// "currentApiConfigName" |
				// "codebaseIndexEnabled" |
				// "enhancedPrompt" |
				// "systemPrompt" |
				// "exportModeResult" |
				// "importModeResult" |
				// "checkRulesDirectoryResult" |
				// "browserConnectionResult" |
				// "vsCodeSetting" |
				// "indexingStatusUpdate" |
				// "indexCleared" |
				// "marketplaceInstallResult" |
				// "shareTaskSuccess" |
				// "playSound" |
				// "draggedImages" |
				// "setApiConfigPassword" |
				// "setopenAiCustomModelInfo" |
				// "marketplaceButtonClicked" |
				// "cancelMarketplaceInstall" |
				// "imageGenerationSettings"
				break
			}
		}
	} catch (error) {
		const errorMessage = error instanceof Error ? error.message : String(error)
		log(`Error handling message type "${type}": ${errorMessage}`)
		log(error instanceof Error ? (error.stack ?? "") : "")
		vscode.window.showErrorMessage(`Error processing action "${type}": ${errorMessage}`)
	}
}