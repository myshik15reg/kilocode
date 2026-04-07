import { formatCurrency, formatDateTime, formatDuration, formatTokens, formatToolUsageSuccessRate } from "../formatters"

describe("formatCurrency()", () => {
	it("formats USD amounts using en-US locale", () => {
		expect(formatCurrency(1234.5)).toBe(
			new Intl.NumberFormat("en-US", {
				style: "currency",
				currency: "USD",
			}).format(1234.5),
		)
	})
})

describe("formatDuration()", () => {
	it("formats as H:MM:SS", () => {
		expect(formatDuration(0)).toBe("0:00:00")
		expect(formatDuration(1_000)).toBe("0:00:01")
		expect(formatDuration(61_000)).toBe("0:01:01")
		expect(formatDuration(3_661_000)).toBe("1:01:01")
	})
})

describe("formatTokens()", () => {
	it("formats small numbers without suffix", () => {
		expect(formatTokens(0)).toBe("0")
		expect(formatTokens(999)).toBe("999")
	})

	it("formats thousands without decimals and clamps to 1.0M at boundary", () => {
		expect(formatTokens(1_000)).toBe("1k")
		expect(formatTokens(72_500)).toBe("73k")
		expect(formatTokens(999_499)).toBe("999k")
		expect(formatTokens(999_500)).toBe("1.0M")
	})

	it("formats millions with one decimal and clamps to 1.0B at boundary", () => {
		expect(formatTokens(1_000_000)).toBe("1.0M")
		expect(formatTokens(3_240_000)).toBe("3.2M")
		expect(formatTokens(999_950_000)).toBe("1.0B")
	})

	it("formats billions with one decimal", () => {
		expect(formatTokens(1_250_000_000)).toBe("1.3B")
	})
})

describe("formatToolUsageSuccessRate()", () => {
	it("returns zero percent when there are no attempts", () => {
		expect(formatToolUsageSuccessRate({ attempts: 0, failures: 0 })).toBe("0%")
	})

	it("returns a rounded success percentage", () => {
		expect(formatToolUsageSuccessRate({ attempts: 8, failures: 2 })).toBe("75%")
	})
})

describe("formatDateTime()", () => {
	it("formats dates with the expected locale options", () => {
		const date = new Date("2026-04-13T15:07:00Z")
		expect(formatDateTime(date)).toBe(
			new Intl.DateTimeFormat("en-US", {
				month: "short",
				day: "numeric",
				hour: "numeric",
				minute: "2-digit",
				hour12: true,
			}).format(date),
		)
	})
})
