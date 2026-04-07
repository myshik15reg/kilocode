import { SSEStream } from "../sse-stream"

type StreamWithMockableWriter = {
	_writer: {
		write?: ReturnType<typeof vi.fn>
		close: ReturnType<typeof vi.fn>
	}
}

describe("SSEStream", () => {
	let stream: SSEStream

	beforeEach(() => {
		stream = new SSEStream()
	})

	it("should create a new SSEStream instance", () => {
		expect(stream).toBeInstanceOf(SSEStream)
		expect(stream.isClosed).toBe(false)
	})

	it("should write string data successfully when stream is open", async () => {
		const response = stream.getResponse()
		const reader = response.body?.getReader()

		const writePromise = stream.write("test message")

		if (reader) {
			await reader.read()
			reader.releaseLock()
		}

		const result = await writePromise
		expect(result).toBe(true)
		expect(stream.isClosed).toBe(false)
	})

	it("should write object data successfully when stream is open", async () => {
		const testData = { message: "test", id: 123 }

		const response = stream.getResponse()
		const reader = response.body?.getReader()

		const writePromise = stream.write(testData)

		if (reader) {
			await reader.read()
			reader.releaseLock()
		}

		const result = await writePromise
		expect(result).toBe(true)
		expect(stream.isClosed).toBe(false)
	})

	it("should return false when writing to closed stream", async () => {
		await stream.close()
		expect(stream.isClosed).toBe(true)

		const result = await stream.write("test message")
		expect(result).toBe(false)
	})

	it("should mark the stream as closed when writes fail", async () => {
		const error = new Error("write failed")
		const consoleErrorSpy = vi.spyOn(console, "error").mockImplementation(() => undefined)
		;(stream as unknown as StreamWithMockableWriter)._writer = {
			write: vi.fn().mockRejectedValue(error),
			close: vi.fn().mockResolvedValue(undefined),
		}

		await expect(stream.write("test message")).resolves.toBe(false)
		expect(stream.isClosed).toBe(true)
		expect(consoleErrorSpy).toHaveBeenCalledWith("[SSEStream#write]", error)
	})

	it("should handle multiple close calls gracefully", async () => {
		await stream.close()
		expect(stream.isClosed).toBe(true)

		await expect(stream.close()).resolves.toBeUndefined()
		expect(stream.isClosed).toBe(true)
	})

	it("should ignore writer close errors", async () => {
		;(stream as unknown as StreamWithMockableWriter)._writer = {
			close: vi.fn().mockRejectedValue(new Error("already closed")),
		}

		await expect(stream.close()).resolves.toBeUndefined()
		expect(stream.isClosed).toBe(true)
	})

	it("should create response with correct headers", () => {
		const response = stream.getResponse()
		expect(response).toBeInstanceOf(Response)
		expect(response.headers.get("Content-Type")).toBe("text/event-stream")
		expect(response.headers.get("Connection")).toBe("keep-alive")
		expect(response.headers.get("Cache-Control")).toBe("no-cache, no-transform")
		expect(response.headers.get("Access-Control-Allow-Origin")).toBe("*")
	})

	it("should format data correctly for SSE", async () => {
		const response = stream.getResponse()
		const reader = response.body?.getReader()
		const decoder = new TextDecoder()

		const writePromise = stream.write("hello world")

		if (reader) {
			const { value } = await reader.read()
			const text = decoder.decode(value)
			expect(text).toBe("data: hello world\n\n")
			reader.releaseLock()
		}

		await writePromise
	})

	it("should format JSON data correctly for SSE", async () => {
		const response = stream.getResponse()
		const reader = response.body?.getReader()
		const decoder = new TextDecoder()

		const testData = { type: "test", message: "hello" }
		const writePromise = stream.write(testData)

		if (reader) {
			const { value } = await reader.read()
			const text = decoder.decode(value)
			expect(text).toBe(`data: ${JSON.stringify(testData)}\n\n`)
			reader.releaseLock()
		}

		await writePromise
	})
})
