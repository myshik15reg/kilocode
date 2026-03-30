// kilocode_change - new file
import { describe, expect, it } from "vitest"

import { AdaptiveRoutingAdvisor, buildAdaptiveRoutingProfilePalette } from "./AdaptiveRoutingAdvisor"

describe("AdaptiveRoutingAdvisor", () => {
	const advisor = new AdaptiveRoutingAdvisor()

	it("prefers explicit mode and explicit execution over adaptive recommendations", () => {
		const recommendation = advisor.recommend({
			explicitMode: "debug",
			explicitExecution: "foreground",
			message: "Research this independently in the background",
			todos: "[ ] Inspect logs\n[ ] Report findings",
			currentMode: "code",
			currentProfileName: "primary-profile",
			availableBackgroundCapacity: true,
			profilePalette: {
				strong: "primary-profile",
				cheap: "Cheap helper",
			},
		})

		expect(recommendation.mode).toEqual({ value: "debug", source: "explicit" })
		expect(recommendation.execution.value).toBe("foreground")
		expect(recommendation.execution.source).toBe("explicit")
		expect(recommendation.execution.ranking[0]).toMatchObject({
			value: "foreground",
			score: 100,
		})
	})

	it("recommends background plus cheap helper for independent work when capacity exists", () => {
		const recommendation = advisor.recommend({
			explicitMode: "code",
			message: "Independently research this parser issue",
			todos: "[ ] Inspect parser\n[ ] Collect traces",
			currentMode: "code",
			currentProfileName: "primary-profile",
			availableBackgroundCapacity: true,
			profilePalette: {
				strong: "primary-profile",
				balanced: "Balanced helper",
				cheap: "Cheap helper",
			},
		})

		expect(recommendation.execution).toMatchObject({
			value: "background",
			source: "recommended",
		})
		expect(recommendation.execution.ranking[0]).toMatchObject({
			value: "background",
		})
		expect(recommendation.profile).toMatchObject({
			value: "cheap",
			source: "recommended",
			helperProfile: "Cheap helper",
		})
	})

	it("falls back to safe defaults when historical signals and helper profiles are absent", () => {
		const recommendation = advisor.recommend({
			message: "Continue this task",
			currentMode: undefined,
			currentProfileName: undefined,
			availableBackgroundCapacity: false,
		})

		expect(recommendation.mode).toEqual({ value: "code", source: "default" })
		expect(recommendation.execution).toMatchObject({
			value: "foreground",
			source: "default",
		})
		expect(recommendation.profile).toMatchObject({
			value: "strong",
			source: "default",
			helperProfile: undefined,
		})
	})

	it("keeps branch follow-ups in the foreground even when background hints exist", () => {
		const recommendation = advisor.recommend({
			explicitMode: "code",
			message: "Research this branch independently",
			todos: "[ ] Compare branch context\n[ ] Note differences",
			branchFromTaskId: "task-1",
			currentMode: "code",
			currentProfileName: "primary-profile",
			availableBackgroundCapacity: true,
			profilePalette: {
				strong: "primary-profile",
				cheap: "Cheap helper",
			},
		})

		expect(recommendation.execution.value).toBe("foreground")
		expect(recommendation.execution.source).toBe("recommended")
	})
})

describe("buildAdaptiveRoutingProfilePalette", () => {
	it("maps profile ids to names and falls back safely", () => {
		const palette = buildAdaptiveRoutingProfilePalette({
			currentProfileName: "Primary profile",
			listApiConfigMeta: [
				{ id: "cheap-1", name: "Cheap helper" },
				{ id: "balanced-1", name: "Balanced helper" },
			],
			cheapProfileId: "cheap-1",
			balancedProfileId: "balanced-1",
		})

		expect(palette).toEqual({
			strong: "Primary profile",
			balanced: "Balanced helper",
			cheap: "Cheap helper",
		})
	})
})
