import { beforeEach, describe, expect, it, vi } from "vitest"
import * as vscode from "vscode"

vi.mock("vscode", () => ({
	env: {
		openExternal: vi.fn().mockResolvedValue(true),
	},
	Uri: {
		parse: vi.fn((rawUrl: string) => {
			const parsed = new URL(rawUrl)
			return {
				scheme: parsed.protocol.replace(/:$/, ""),
				toString: () => rawUrl,
			}
		}),
	},
}))

import { openTrustedExternalUrl, parseTrustedExternalUri } from "../externalUrlPolicy"

describe("externalUrlPolicy", () => {
	beforeEach(() => {
		vi.clearAllMocks()
	})

	it("accepts http and https URLs", () => {
		expect(parseTrustedExternalUri("https://example.com/path?x=1")).toEqual(
			expect.objectContaining({ scheme: "https" }),
		)
		expect(parseTrustedExternalUri("http://example.com")).toEqual(expect.objectContaining({ scheme: "http" }))
	})

	it("rejects unsupported URI schemes", () => {
		expect(parseTrustedExternalUri("file:///tmp/secret.txt")).toBeUndefined()
		expect(parseTrustedExternalUri("command:workbench.action.openSettings")).toBeUndefined()
	})

	it("opens only trusted external URLs", async () => {
		await expect(openTrustedExternalUrl("https://example.com")).resolves.toBe(true)
		expect(vscode.env.openExternal).toHaveBeenCalledWith(expect.objectContaining({ scheme: "https" }))
	})

	it("does not open unsupported URLs", async () => {
		await expect(openTrustedExternalUrl("file:///tmp/secret.txt")).resolves.toBe(false)
		expect(vscode.env.openExternal).not.toHaveBeenCalled()
	})
})
