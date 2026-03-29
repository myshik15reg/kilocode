// kilocode_change - new file
import { beforeEach, describe, expect, it, vi } from "vitest"

import { Neo4jConnectionManager } from "../connection-manager"

const { missingDatabaseError, requestedDbSession, systemSession, mockDriver } = vi.hoisted(() => {
	const missingDatabaseError = Object.assign(new Error("Database does not exist"), {
		code: "Neo.ClientError.Database.DatabaseNotFound",
	})

	const requestedDbSession = {
		run: vi.fn(),
		close: vi.fn().mockResolvedValue(undefined),
	}

	const systemSession = {
		run: vi.fn().mockResolvedValue(undefined),
		close: vi.fn().mockResolvedValue(undefined),
	}

	const mockDriver = {
		verifyConnectivity: vi.fn().mockResolvedValue(undefined),
		close: vi.fn().mockResolvedValue(undefined),
		session: vi.fn((options?: { database?: string }) =>
			options?.database === "system" ? systemSession : requestedDbSession,
		),
	}

	return { missingDatabaseError, requestedDbSession, systemSession, mockDriver }
})

vi.mock("neo4j-driver", () => {
	const mockAuth = {
		basic: vi.fn(),
	}

	return {
		__esModule: true,
		default: {
			driver: vi.fn().mockReturnValue(mockDriver),
			auth: mockAuth,
		},
		auth: mockAuth,
	}
})

describe("Neo4jConnectionManager database auto-create", () => {
	beforeEach(async () => {
		requestedDbSession.run.mockReset()
		systemSession.run.mockClear()
		requestedDbSession.close.mockClear()
		systemSession.close.mockClear()
		mockDriver.verifyConnectivity.mockClear()
		mockDriver.close.mockClear()
		mockDriver.session.mockClear()

		requestedDbSession.run
			.mockRejectedValueOnce(missingDatabaseError)
			.mockRejectedValueOnce(missingDatabaseError)
			.mockResolvedValue({ records: [{ toObject: () => ({ n: 1 }) }] })

		const manager = Neo4jConnectionManager.getInstance() as any
		await manager.disconnect?.().catch(() => {})
	})

	it("creates the requested database when it is missing", async () => {
		const manager = Neo4jConnectionManager.getInstance()

		await manager.connect({
			uri: "bolt://localhost:7687",
			username: "neo4j",
			password: "password",
			database: "project_graph",
		})

		expect(mockDriver.verifyConnectivity).toHaveBeenCalledTimes(1)
		expect(systemSession.run).toHaveBeenCalledWith("CREATE DATABASE `project_graph` IF NOT EXISTS")
		expect(requestedDbSession.run).toHaveBeenCalledTimes(3)
		expect(mockDriver.session).toHaveBeenCalledWith({ database: "project_graph" })
		expect(mockDriver.session).toHaveBeenCalledWith({ database: "system" })
	})
})
