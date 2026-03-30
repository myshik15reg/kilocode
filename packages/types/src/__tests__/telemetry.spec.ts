import { describe, expect, it } from "vitest"

import { TelemetryEventName, rooCodeTelemetryEventSchema, telemetryPropertiesSchema } from "../index.js"

describe("telemetry contracts", () => {
	it("accepts Slice 1 delegation lifecycle telemetry events", () => {
		const baseProperties = telemetryPropertiesSchema.parse({
			appName: "AlfaCode",
			appVersion: "1.0.0",
			vscodeVersion: "1.99.0",
			platform: "win32",
			editorName: "vscode",
			wrapped: false,
			wrapper: null,
			wrapperTitle: null,
			wrapperCode: null,
			wrapperVersion: null,
			machineId: null,
			vscodeIsTelemetryEnabled: null,
			language: "ru",
			mode: "code",
		})

		expect(
			rooCodeTelemetryEventSchema.parse({
				type: TelemetryEventName.DELEGATION_COMPLETED,
				properties: {
					...baseProperties,
					taskId: "parent-1",
					childTaskId: "child-1",
				},
			}),
		).toMatchObject({
			type: TelemetryEventName.DELEGATION_COMPLETED,
			properties: expect.objectContaining({ taskId: "parent-1", childTaskId: "child-1" }),
		})

		expect(
			rooCodeTelemetryEventSchema.parse({
				type: TelemetryEventName.DELEGATION_RESUMED,
				properties: {
					...baseProperties,
					taskId: "parent-1",
					childTaskId: "child-1",
				},
			}),
		).toMatchObject({
			type: TelemetryEventName.DELEGATION_RESUMED,
			properties: expect.objectContaining({ taskId: "parent-1", childTaskId: "child-1" }),
		})
	})
})
