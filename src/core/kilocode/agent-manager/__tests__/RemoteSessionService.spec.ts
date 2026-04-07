import { beforeEach, describe, expect, it, vi } from "vitest"

const { listSessionsMock, initMock } = vi.hoisted(() => ({
	listSessionsMock: vi.fn(),
	initMock: vi.fn(),
}))

vi.mock("../../../../shared/kilocode/cli-sessions/core/SessionManager", () => ({
	SessionManager: {
		init: initMock,
	},
}))

vi.mock("../../../../shared/kilocode/cli-sessions/utils/fetchBlobFromSignedUrl", () => ({
	fetchSignedBlob: vi.fn(),
}))

import { RemoteSessionService } from "../RemoteSessionService"

describe("RemoteSessionService", () => {
	beforeEach(() => {
		vi.clearAllMocks()
	})

	it("returns unavailable when SessionManager is missing", async () => {
		initMock.mockReturnValue(null)
		const service = new RemoteSessionService({ outputChannel: { appendLine: vi.fn() } as any })

		await expect(service.fetchRemoteSessions()).resolves.toEqual({
			sessions: [],
			available: false,
			reason: "session-manager-unavailable",
		})
	})

	it("returns unavailable when remote session listing fails", async () => {
		initMock.mockReturnValue({ listSessions: listSessionsMock })
		listSessionsMock.mockRejectedValue(new Error("network down"))
		const service = new RemoteSessionService({ outputChannel: { appendLine: vi.fn() } as any })

		const result = await service.fetchRemoteSessions()

		expect(result.available).toBe(false)
		expect(result.sessions).toEqual([])
		expect(result.reason).toContain("network down")
	})

	it("returns sessions when SessionManager is available", async () => {
		const remoteSessions = [
			{
				session_id: "session-1",
				title: "Remote Session",
				created_at: "2026-04-11T00:00:00.000Z",
				updated_at: "2026-04-11T00:00:00.000Z",
			},
		]
		initMock.mockReturnValue({ listSessions: listSessionsMock })
		listSessionsMock.mockResolvedValue({ cliSessions: remoteSessions })
		const service = new RemoteSessionService({ outputChannel: { appendLine: vi.fn() } as any })

		await expect(service.fetchRemoteSessions()).resolves.toEqual({
			sessions: remoteSessions,
			available: true,
		})
	})
})
