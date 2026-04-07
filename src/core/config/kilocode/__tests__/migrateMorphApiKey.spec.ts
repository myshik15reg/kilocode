import { describe, it, expect, vi, beforeEach } from "vitest"
import type { ExtensionContext } from "vscode"

import { migrateMorphApiKey } from "../migrateMorphApiKey"

describe("migrateMorphApiKey", () => {
	let mockContext: ExtensionContext
	let mockSecrets: {
		get: ReturnType<typeof vi.fn>
		store: ReturnType<typeof vi.fn>
	}
	let mockGlobalState: {
		update: ReturnType<typeof vi.fn>
	}

	beforeEach(() => {
		mockSecrets = {
			get: vi.fn().mockResolvedValue(undefined),
			store: vi.fn().mockResolvedValue(undefined),
		}
		mockGlobalState = {
			update: vi.fn().mockResolvedValue(undefined),
		}
		mockContext = {
			secrets: mockSecrets,
			globalState: mockGlobalState,
		} as unknown as ExtensionContext
	})

	it("moves morphApiKey into secret storage and removes it from provider profiles", async () => {
		const providerProfiles = {
			apiConfigs: {
				default: {
					id: "default",
					apiProvider: "anthropic",
					morphApiKey: "legacy-morph-key",
				},
			},
		} as any

		const isDirty = await migrateMorphApiKey(mockContext, providerProfiles)

		expect(isDirty).toBe(true)
		expect(mockSecrets.get).toHaveBeenCalledWith("morphApiKey")
		expect(mockSecrets.store).toHaveBeenCalledWith("morphApiKey", "legacy-morph-key")
		expect(mockGlobalState.update).toHaveBeenCalledWith("morphApiKey", undefined)
		expect(providerProfiles.apiConfigs.default.morphApiKey).toBeUndefined()
	})
})
