// kilocode_change - new file
import { type Page, type FrameLocator, expect } from "@playwright/test"
import type { WebviewMessage } from "../../../src/shared/WebviewMessage"
import { ProviderSettings } from "@roo-code/types"

function requireOpenRouterApiKey(): string {
	const apiKey = process.env.OPENROUTER_API_KEY
	if (!apiKey) {
		throw new Error("OPENROUTER_API_KEY is required for API-backed Playwright scenarios")
	}
	return apiKey
}

const defaultPlaywrightApiConfig = {
	apiProvider: "openrouter" as const,
	openRouterApiKey: process.env.OPENROUTER_API_KEY,
	openRouterModelId: "openai/gpt-4o-mini",
}

export async function findWebview(workbox: Page): Promise<FrameLocator> {
	const webviewFrameEl = workbox.frameLocator(
		'iframe[src*="extensionId=alfacode.alfa-code-assistant"][src*="purpose=webviewView"]',
	)
	await webviewFrameEl.locator("#active-frame")
	return webviewFrameEl.frameLocator("#active-frame")
}

export async function waitForWebviewText(page: Page, text: string, timeout: number = 30000): Promise<void> {
	const webviewFrame = await findWebview(page)
	await expect(webviewFrame.locator("body")).toContainText(text, { timeout })
}

export async function waitForModelSelector(page: Page, timeout: number = 30000): Promise<void> {
	const webviewFrame = await findWebview(page)
	await expect(webviewFrame.locator('[data-testid="model-selector"]')).toBeVisible({ timeout })
}

export async function postWebviewMessage(page: Page, message: WebviewMessage): Promise<void> {
	const webviewFrame = await findWebview(page)

	const maxRetries = 3
	for (let attempt = 1; attempt <= maxRetries; attempt++) {
		try {
			await webviewFrame.locator("body").evaluate((element, msg) => {
				if (!window.vscode) {
					throw new Error("Global vscode API not found")
				}

				window.vscode.postMessage(msg)
			}, message)
			return
		} catch (error) {
			if (attempt === maxRetries) {
				throw error
			}
			await page.waitForTimeout(1000)
		}
	}
}

export async function upsertApiConfiguration(page: Page, apiConfiguration?: Partial<ProviderSettings>): Promise<void> {
	const resolvedApiConfiguration = apiConfiguration ?? {
		...defaultPlaywrightApiConfig,
		openRouterApiKey: requireOpenRouterApiKey(),
	}

	await postWebviewMessage(page, {
		type: "upsertApiConfiguration",
		text: "default",
		apiConfiguration: resolvedApiConfiguration,
	})
	await postWebviewMessage(page, { type: "currentApiConfigName", text: "default" })
}

export async function configureApiKeyThroughUI(page: Page): Promise<void> {
	const apiKey = requireOpenRouterApiKey()
	const webviewFrame = await findWebview(page)
	console.log("Webview found")

	const useOwnKeyButton = webviewFrame.locator('button:has-text("Use your own API key")')
	await useOwnKeyButton.waitFor()
	await useOwnKeyButton.click()

	const providerDropdown = webviewFrame.locator('[role="combobox"]').first()
	await providerDropdown.waitFor()
	await providerDropdown.click()

	const openRouterOption = webviewFrame.locator('[role="option"]:has-text("OpenRouter")')
	await openRouterOption.waitFor()
	await openRouterOption.click()

	const apiKeyInput = webviewFrame.locator('input[type="password"]').first()
	await apiKeyInput.waitFor()
	await apiKeyInput.fill(apiKey)
	console.log("Filled OpenRouter key")

	const submitButton = webviewFrame.locator('button:has-text("Let\'s go!")')
	await submitButton.waitFor()
	await submitButton.click()
	console.log("Provider configured")
}

export async function clickSaveSettingsButton(webviewFrame: FrameLocator): Promise<void> {
	const saveButton = webviewFrame.locator('[data-testid="save-button"]')
	const saveButtonExists = (await saveButton.count()) > 0
	if (saveButtonExists) {
		await saveButton.click({ force: true })
	}
}

export async function waitForTooltipsToDismiss(webviewFrame: FrameLocator): Promise<void> {
	const tooltipContent = webviewFrame.locator('[data-slot="tooltip-content"]')
	await tooltipContent.waitFor({ state: "detached", timeout: 3000 }).catch(() => {
		// Ignore tooltip timeout in screenshot stabilization path.
	})
}

export async function freezeGifs(page: Page): Promise<void> {
	await page.emulateMedia({ reducedMotion: "reduce" })

	const webviewFrame = await findWebview(page)

	await webviewFrame.locator("body").evaluate(() => {
		const freezeGif = (img: HTMLImageElement) => {
			if (!img.src.toLowerCase().includes(".gif")) return
			if (img.dataset.gifFrozen === "true") return

			const canvas = document.createElement("canvas")
			const ctx = canvas.getContext("2d")
			if (!ctx) return

			const frame = new Image()
			frame.crossOrigin = "anonymous"
			frame.onload = () => {
				canvas.width = frame.naturalWidth || frame.width
				canvas.height = frame.naturalHeight || frame.height
				ctx.drawImage(frame, 0, 0)
				img.src = canvas.toDataURL("image/png")
				img.dataset.gifFrozen = "true"
			}
			frame.onerror = () => {
				img.dataset.gifFrozen = "true"
			}
			frame.src = img.src
		}

		document.querySelectorAll('img[src*=".gif"]').forEach((img) => {
			freezeGif(img as HTMLImageElement)
		})
	})
}
