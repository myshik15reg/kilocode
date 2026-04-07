import { describe, it, expect } from "vitest"
import { safeStringify, argToString, argsToMessage } from "../safe-stringify.js"

describe("safeStringify", () => {
	describe("primitives", () => {
		it("should return null as-is", () => {
			expect(safeStringify(null)).toBe(null)
		})

		it("should return undefined as-is", () => {
			expect(safeStringify(undefined)).toBe(undefined)
		})

		it("should return strings as-is", () => {
			expect(safeStringify("hello")).toBe("hello")
		})

		it("should return numbers as-is", () => {
			expect(safeStringify(42)).toBe(42)
			expect(safeStringify(3.14)).toBe(3.14)
		})

		it("should return booleans as-is", () => {
			expect(safeStringify(true)).toBe(true)
			expect(safeStringify(false)).toBe(false)
		})
	})

	describe("arrays", () => {
		it("should handle simple arrays", () => {
			expect(safeStringify([1, 2, 3])).toEqual([1, 2, 3])
		})

		it("should handle nested arrays", () => {
			expect(
				safeStringify([
					[1, 2],
					[3, 4],
				]),
			).toEqual([
				[1, 2],
				[3, 4],
			])
		})

		it("should handle arrays with mixed types", () => {
			expect(safeStringify([1, "two", true, null])).toEqual([1, "two", true, null])
		})
	})

	describe("objects", () => {
		it("should handle simple objects", () => {
			expect(safeStringify({ a: 1, b: 2 })).toEqual({ a: 1, b: 2 })
		})

		it("should handle nested objects", () => {
			expect(safeStringify({ a: { b: { c: 1 } } })).toEqual({ a: { b: { c: 1 } } })
		})

		it("should serialize shared object references without treating the second reference as circular", () => {
			const shared = { value: 42 }
			const result = safeStringify({ first: shared, second: shared })

			expect(result).toEqual({
				first: { value: 42 },
				second: { value: 42 },
			})
		})

		it("should mark a property when nested serialization throws", () => {
			const brokenChild = {}
			Object.defineProperty(brokenChild, "boom", {
				enumerable: true,
				get() {
					throw new Error("boom")
				},
			})

			expect(safeStringify({ brokenChild })).toEqual({
				brokenChild: "[Serialization Error]",
			})
		})
	})

	describe("circular references", () => {
		it("should handle self-referencing objects", () => {
			const obj: Record<string, unknown> = { a: 1 }
			obj.self = obj

			const result = safeStringify(obj)
			expect(result).toEqual({ a: 1, self: "[Circular]" })
		})

		it("should handle circular references in arrays", () => {
			const arr: unknown[] = [1, 2]
			arr.push(arr)

			const result = safeStringify(arr)
			expect(result).toEqual([1, 2, "[Circular]"])
		})

		it("should handle deeply nested circular references", () => {
			const obj: Record<string, unknown> = { a: { b: { c: {} } } }
			;(obj.a as Record<string, unknown>).b = (obj.a as Record<string, unknown>).b || {}
			;((obj.a as Record<string, unknown>).b as Record<string, unknown>).c = obj

			const result = safeStringify(obj) as Record<string, unknown>
			expect(((result.a as Record<string, unknown>).b as Record<string, unknown>).c).toBe("[Circular]")
		})
	})

	describe("Error objects", () => {
		it("should serialize Error with message, name, and stack", () => {
			const error = new Error("test error")
			const result = safeStringify(error) as Record<string, unknown>

			expect(result.message).toBe("test error")
			expect(result.name).toBe("Error")
			expect(result.stack).toBeDefined()
		})

		it("should serialize TypeError", () => {
			const error = new TypeError("type error")
			const result = safeStringify(error) as Record<string, unknown>

			expect(result.message).toBe("type error")
			expect(result.name).toBe("TypeError")
		})

		it("should include custom properties on errors", () => {
			const error = new Error("custom error") as Error & { code: string }
			error.code = "ERR_CUSTOM"

			const result = safeStringify(error) as Record<string, unknown>
			expect(result.code).toBe("ERR_CUSTOM")
		})

		it("should not re-read standard error fields through the extra-properties reducer", () => {
			const accessCount = {
				message: 0,
				name: 0,
				stack: 0,
			}
			const error = new Error("tracked")

			Object.defineProperty(error, "message", {
				configurable: true,
				get() {
					accessCount.message += 1
					return "tracked"
				},
			})
			Object.defineProperty(error, "name", {
				configurable: true,
				get() {
					accessCount.name += 1
					return "TrackedError"
				},
			})
			Object.defineProperty(error, "stack", {
				configurable: true,
				get() {
					accessCount.stack += 1
					return "TrackedError: tracked"
				},
			})

			const result = safeStringify(error) as Record<string, unknown>

			expect(result).toMatchObject({
				message: "tracked",
				name: "TrackedError",
				stack: "TrackedError: tracked",
			})
			expect(accessCount).toEqual({ message: 1, name: 1, stack: 1 })
		})
	})

	describe("Date objects", () => {
		it("should convert Date to ISO string", () => {
			const date = new Date("2024-01-15T10:30:00.000Z")
			expect(safeStringify(date)).toBe("2024-01-15T10:30:00.000Z")
		})
	})

	describe("RegExp objects", () => {
		it("should convert RegExp to string", () => {
			expect(safeStringify(/test/gi)).toBe("/test/gi")
		})
	})
})

describe("argToString", () => {
	it("should return strings as-is", () => {
		expect(argToString("hello")).toBe("hello")
	})

	it("should stringify numbers", () => {
		expect(argToString(42)).toBe("42")
	})

	it("should stringify objects", () => {
		expect(argToString({ a: 1 })).toBe('{"a":1}')
	})

	it("should handle circular references", () => {
		const obj: Record<string, unknown> = { a: 1 }
		obj.self = obj

		expect(argToString(obj)).toBe('{"a":1,"self":"[Circular]"}')
	})

	it("should return a fallback when JSON serialization still fails", () => {
		expect(argToString(1n)).toBe("[Unable to stringify]")
	})
})

describe("argsToMessage", () => {
	it("should join multiple arguments with spaces", () => {
		expect(argsToMessage(["hello", "world"])).toBe("hello world")
	})

	it("should handle mixed types", () => {
		expect(argsToMessage(["count:", 42])).toBe("count: 42")
	})

	it("should handle objects", () => {
		expect(argsToMessage(["data:", { x: 1 }])).toBe('data: {"x":1}')
	})
})
