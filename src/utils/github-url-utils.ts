/**
 * github-url-utils.ts
 *
 * Portable utility functions for creating and opening GitHub issue URLs
 * with proper URL encoding that bypasses VS Code's URI handling issues.
 *
 * This utility addresses a longstanding issue in VS Code's URI handling:
 * https://github.com/microsoft/vscode/issues/85930
 *
 * The issue causes URLs with special characters in query parameters to be incorrectly
 * encoded when opened through VS Code's standard APIs (vscode.Uri.parse followed by
 * vscode.env.openExternal). This particularly affects GitHub issue URLs with pre-filled
 * fields containing special characters.
 */

import { execFile } from "child_process"
import * as os from "os"
import * as vscode from "vscode"

/**
 * Creates a properly encoded GitHub issue URL.
 *
 * This function manually encodes each parameter value using encodeURIComponent()
 * to ensure consistent and correct encoding of all special characters. This is
 * necessary because VS Code's URI handling (vscode.Uri.parse) has issues with
 * encoding/decoding URL parameters, as documented in:
 * https://github.com/microsoft/vscode/issues/85930
 *
 * Specifically, VS Code's URI handling:
 * - Double-encodes some characters like # (hash) becoming %2523 instead of %23
 * - Inconsistently handles other characters like & (ampersand) and + (plus)
 * - Can corrupt query parameters containing special characters
 *
 * @param baseUrl The base GitHub repository URL (e.g., 'https://github.com/owner/repo/issues/new')
 * @param params Map of parameter names to values for the issue form
 * @returns The properly encoded full URL
 */
export function createGitHubIssueUrl(baseUrl: string, params: Map<string, string>): string {
	const queryParts: string[] = []

	for (const [key, value] of params.entries()) {
		const encodedKey = encodeURIComponent(key)
		const encodedValue = encodeURIComponent(value)
		queryParts.push(`${encodedKey}=${encodedValue}`)
	}

	const separator = baseUrl.includes("?") ? "&" : "?"
	const queryString = queryParts.join("&")
	return `${baseUrl}${separator}${queryString}`
}

type BrowserCommand = {
	command: string
	args: string[]
}

function execFileAsync(command: string, args: string[]): Promise<void> {
	return new Promise((resolve, reject) => {
		execFile(command, args, (error) => {
			if (error) {
				reject(error)
				return
			}

			resolve()
		})
	})
}

async function runBrowserCommands(commands: BrowserCommand[]): Promise<void> {
	let lastError: unknown

	for (const { command, args } of commands) {
		try {
			await execFileAsync(command, args)
			console.log(`Opened URL with '${command}'`)
			return
		} catch (error) {
			lastError = error
			console.error(`Error with '${command}': ${error}`)
		}
	}

	throw lastError ?? new Error("All OS commands failed")
}

function getBrowserCommands(platform: NodeJS.Platform, url: string): BrowserCommand[] {
	if (platform === "win32") {
		return [
			{ command: "rundll32.exe", args: ["url.dll,FileProtocolHandler", url] },
			{ command: "explorer.exe", args: [url] },
		]
	}

	if (platform === "darwin") {
		return [{ command: "open", args: [url] }]
	}

	return [
		{ command: "xdg-open", args: [url] },
		{ command: "gnome-open", args: [url] },
		{ command: "kde-open", args: [url] },
		{ command: "wslview", args: [url] },
	]
}

/**
 * Opens a URL using platform-specific commands to bypass VS Code's URI handling issues.
 *
 * IMPORTANT: This function intentionally avoids using VS Code's built-in URI handling
 * (vscode.Uri.parse() and vscode.env.openExternal()) due to known encoding issues with URLs
 * that contain special characters in query parameters. See:
 * https://github.com/microsoft/vscode/issues/85930
 *
 * The specific issues with VS Code's URI handling include:
 * 1. Double-encoding of certain characters (e.g., # becomes %23 then %2523)
 * 2. Inconsistent handling where some characters are encoded and others are decoded
 * 3. Issues with parameters in the query string being incorrectly processed
 *
 * Instead, this function:
 * - Uses direct OS commands to open the browser with the URL
 * - Preserves the exact encoding of the URL as provided
 * - Provides multiple fallback approaches if the primary method fails
 *
 * @param url The URL to open
 * @returns A promise that resolves when an attempt to open the URL has completed
 */
export async function openUrlInBrowser(url: string): Promise<void> {
	console.log(`Opening URL: ${url}`)

	try {
		await vscode.env.clipboard.writeText(url)
		console.log("URL copied to clipboard as backup")
	} catch (error) {
		console.error(`Failed to copy URL to clipboard: ${error}`)
	}

	try {
		const platform = os.platform()
		console.log(`Detected platform: ${platform}`)
		await runBrowserCommands(getBrowserCommands(platform, url))
		return
	} catch (error) {
		console.error(`OS commands failed: ${error}`)

		try {
			await vscode.env.openExternal(vscode.Uri.parse(url, true))
			console.log("Opened URL with vscode.env.openExternal (note: URL encoding may be affected)")
			return
		} catch (vscodeError) {
			console.error(`Error with vscode.env.openExternal: ${vscodeError}`)

			vscode.window
				.showInformationMessage(
					"Couldn't open the URL automatically. It has been copied to your clipboard.",
					"Copy URL Again",
				)
				.then((selection) => {
					if (selection === "Copy URL Again") {
						vscode.env.clipboard.writeText(url)
					}
				})
		}
	}
}

/**
 * Utility function to create and open a GitHub issue with the specified parameters.
 *
 * This is a high-level function that combines URL creation and opening while
 * working around VS Code's URI handling limitations (issue #85930). It provides
 * a simple API for the common use case of opening GitHub issue templates with
 * pre-filled fields.
 *
 * The function:
 * 1. Constructs a correctly formatted GitHub issue URL
 * 2. Properly encodes all special characters in parameters
 * 3. Opens the URL directly using OS commands to avoid VS Code's problematic URI handling
 * 4. Provides fallback options if opening fails
 *
 * Reference for the VS Code URI handling issue:
 * https://github.com/microsoft/vscode/issues/85930
 *
 * @param repoOwner GitHub repository owner/organization
 * @param repoName GitHub repository name
 * @param issueTemplate Template name to use (e.g., 'bug_report.yml')
 * @param params Map of parameter names to values for the issue form
 */
export async function createAndOpenGitHubIssue(
	repoOwner: string,
	repoName: string,
	issueTemplate: string | null,
	params: Map<string, string>,
): Promise<void> {
	let baseUrl = `https://github.com/${repoOwner}/${repoName}/issues/new`

	if (issueTemplate) {
		params.set("template", issueTemplate)
	}

	const issueUrl = createGitHubIssueUrl(baseUrl, params)
	await openUrlInBrowser(issueUrl)
}
