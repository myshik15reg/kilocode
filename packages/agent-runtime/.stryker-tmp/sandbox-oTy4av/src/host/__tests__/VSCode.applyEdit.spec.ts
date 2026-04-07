// @ts-nocheck
import { describe, it, expect, beforeEach, afterEach, vi } from "vitest"
import fs from "fs"
import os from "os" // kilocode_change
import path from "path"
import { createVSCodeAPIMock, Uri, WorkspaceEdit, Position, Range } from "../VSCode.js"

describe("WorkspaceAPI.applyEdit", () => {
	let tempDir: string
	let filePath: string

	beforeEach(() => {
		tempDir = fs.mkdtempSync(path.join(os.tmpdir(), "kilocode-apply-edit-"))
		filePath = path.join(tempDir, "apply-edit.txt")
		fs.writeFileSync(filePath, "alpha\n", "utf-8")
	})

	afterEach(() => {
		try {
			if (tempDir) {
				fs.rmSync(tempDir, { recursive: true, force: true })
			}
		} catch (_error) {
			// Ignore cleanup errors in tests.
		}
	})

	it("applies sequential edits without mutating the edit list", async () => {
		const vscode = createVSCodeAPIMock(tempDir, tempDir)
		const edit = new WorkspaceEdit()
		const uri = Uri.file(filePath)

		edit.replace(uri, new Range(new Position(0, 0), new Position(0, 0)), "X")
		edit.replace(uri, new Range(new Position(0, 0), new Position(0, 0)), "Y")

		const applyEditSpy = vi.spyOn(vscode.workspace, "applyEdit")
		await vscode.workspace.applyEdit(edit)
		await vscode.workspace.applyEdit(edit)

		expect(applyEditSpy).toHaveBeenCalledTimes(2)
		const finalContent = fs.readFileSync(filePath, "utf-8")
		expect(finalContent).toBe("YXYXalpha\n")
	}, 15000)

	it("handles multi-line replacements without duplicating tail lines", async () => {
		const vscode = createVSCodeAPIMock(tempDir, tempDir)
		const edit = new WorkspaceEdit()
		const uri = Uri.file(filePath)

		fs.writeFileSync(filePath, "alpha\nbeta\n", "utf-8")
		edit.replace(uri, new Range(new Position(0, 0), new Position(1, 0)), "one\ntwo\n")

		await vscode.workspace.applyEdit(edit)

		const finalContent = fs.readFileSync(filePath, "utf-8")
		expect(finalContent).toBe("one\ntwo\nbeta\n")
	}, 15000)

	it("handles Windows CRLF line endings correctly", async () => {
		const vscode = createVSCodeAPIMock(tempDir, tempDir)
		const edit = new WorkspaceEdit()
		const uri = Uri.file(filePath)

		fs.writeFileSync(filePath, "alpha\r\nbeta\r\ngamma\r\n", "utf-8")
		edit.replace(uri, new Range(new Position(1, 0), new Position(1, 4)), "REPLACED")

		await vscode.workspace.applyEdit(edit)

		const finalContent = fs.readFileSync(filePath, "utf-8")
		expect(finalContent).toBe("alpha\nREPLACED\ngamma\n")
	}, 15000)

	it("handles mixed line endings correctly", async () => {
		const vscode = createVSCodeAPIMock(tempDir, tempDir)
		const edit = new WorkspaceEdit()
		const uri = Uri.file(filePath)

		fs.writeFileSync(filePath, "line1\r\nline2\nline3\r\n", "utf-8")
		edit.replace(uri, new Range(new Position(1, 0), new Position(1, 5)), "MODIFIED")

		await vscode.workspace.applyEdit(edit)

		const finalContent = fs.readFileSync(filePath, "utf-8")
		expect(finalContent).toBe("line1\nMODIFIED\nline3\n")
	}, 15000)
})
