import {
	annotateWithHashline,
	expandHashlineReferences,
	resolveHashlineReference,
	stripHashlinePrefixes,
} from "../helpers/hashline"

describe("hashline helper", () => {
	it("uses the shortest unique hash prefix for small previews", () => {
		const result = annotateWithHashline("alpha\nbeta")
		const [firstLine, secondLine] = result.split("\n")

		expect(firstLine).toMatch(/^#HL 1:[0-9a-f]{2}\|/)
		expect(secondLine).toMatch(/^#HL 2:[0-9a-f]{2}\|/)
	})

	it("expands the hash prefix length when two hex digits are not unique", () => {
		const content = Array.from({ length: 300 }, (_, index) => `line ${index}`).join("\n")
		const [firstLine] = annotateWithHashline(content, { maxLines: 300 }).split("\n")
		const hash = firstLine.split(":")[1].split("|")[0]

		expect(hash.length).toBeGreaterThan(2)
		expect(hash.length).toBeLessThanOrEqual(4)
	})

	it("resolves hashline references back to the exact file line", () => {
		const content = "first\nsecond\nthird"
		const reference = annotateWithHashline(content).split("\n")[1].split("|")[0]

		expect(resolveHashlineReference(content, reference)).toBe("second")
	})

	it("strips hashline prefixes from tagged replacement lines", () => {
		expect(stripHashlinePrefixes("#HL 2:abc|replacement")).toBe("replacement")
		expect(stripHashlinePrefixes("  #HL 2:abc|replacement")).toBe("  replacement")
	})

	it("expands references while preserving non-reference lines", () => {
		const content = "first\nsecond\nthird"
		const reference = annotateWithHashline(content).split("\n")[1].split("|")[0]
		const expanded = expandHashlineReferences(content, `${reference}\nplain line`)

		expect(expanded).toBe("second\nplain line")
	})
})
