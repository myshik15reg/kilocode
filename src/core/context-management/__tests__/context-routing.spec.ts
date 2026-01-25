import { resolveContextRoutingMode } from "../context-routing"

describe("resolveContextRoutingMode", () => {
	it("should return disabled when routing is disabled", () => {
		const result = resolveContextRoutingMode({
			enabled: false,
			totalTokens: 5000,
			contextWindow: 100000,
			fastThresholdPercent: 50,
			deepThresholdPercent: 80,
		})

		expect(result).toBe("disabled")
	})

	it("should return standard when below fast threshold", () => {
		const result = resolveContextRoutingMode({
			enabled: true,
			totalTokens: 40000,
			contextWindow: 100000,
			fastThresholdPercent: 50,
			deepThresholdPercent: 80,
		})

		expect(result).toBe("standard")
	})

	it("should return fast when between fast and deep thresholds", () => {
		const result = resolveContextRoutingMode({
			enabled: true,
			totalTokens: 60000,
			contextWindow: 100000,
			fastThresholdPercent: 50,
			deepThresholdPercent: 80,
		})

		expect(result).toBe("fast")
	})

	it("should return deep when above deep threshold", () => {
		const result = resolveContextRoutingMode({
			enabled: true,
			totalTokens: 90000,
			contextWindow: 100000,
			fastThresholdPercent: 50,
			deepThresholdPercent: 80,
		})

		expect(result).toBe("deep")
	})

	it("should clamp deep threshold to be at least fast threshold", () => {
		const result = resolveContextRoutingMode({
			enabled: true,
			totalTokens: 85000,
			contextWindow: 100000,
			fastThresholdPercent: 80,
			deepThresholdPercent: 60,
		})

		expect(result).toBe("deep")
	})

	it("should return standard when context window is invalid", () => {
		const result = resolveContextRoutingMode({
			enabled: true,
			totalTokens: 1000,
			contextWindow: 0,
			fastThresholdPercent: 50,
			deepThresholdPercent: 80,
		})

		expect(result).toBe("standard")
	})

	it("should clamp thresholds into valid percentage range", () => {
		const result = resolveContextRoutingMode({
			enabled: true,
			totalTokens: 50000,
			contextWindow: 100000,
			fastThresholdPercent: -10,
			deepThresholdPercent: 200,
		})

		expect(result).toBe("fast")
	})
})
