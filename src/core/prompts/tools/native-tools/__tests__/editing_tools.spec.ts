import type OpenAI from "openai"

import editFileTool from "../edit_file"
import searchReplaceTool from "../search_replace"
import searchAndReplaceBatchTool from "../search_and_replace"

type FunctionTool = OpenAI.Chat.ChatCompletionTool & { type: "function" }

const getFunctionDef = (tool: OpenAI.Chat.ChatCompletionTool) => (tool as FunctionTool).function

describe("native editing tool descriptions", () => {
	it("documents hashline references for edit_file", () => {
		const description = getFunctionDef(editFileTool).description

		expect(description).toContain("HASHLINE REFERENCES")
		expect(description).toContain("#HL 42:abc|...")
	})

	it("documents hashline references for search_replace", () => {
		const description = getFunctionDef(searchReplaceTool).description

		expect(description).toContain("HASHLINE REFERENCES")
		expect(description).toContain("#HL 42:abc|...")
	})
	it("documents hashline references for search_and_replace", () => {
		const description = getFunctionDef(searchAndReplaceBatchTool).description

		expect(description).toContain("#HL 42:abc|...")
		expect(description).toContain("replacement text")
	})
})
