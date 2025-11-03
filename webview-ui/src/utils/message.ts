import { MaybeTypedWebviewMessage as WebviewMessage } from "@roo/WebviewMessage"
import { vscode } from "./vscode"

type PendingRequest = {
	resolve: (value: unknown) => void
	reject: (reason?: any) => void
	responseType: WebviewMessage["type"]
}

const pendingRequests = new Map<string, PendingRequest>()

window.addEventListener("message", (event: MessageEvent<WebviewMessage>) => {
	const message = event.data
	if ("requestId" in message && message.requestId) {
		const pending = pendingRequests.get(message.requestId)
		if (pending && message.type === pending.responseType) {
			if ((message.payload as any)?.success) {
				pending.resolve(message.payload)
			} else {
				pending.reject(new Error((message.payload as any)?.error || "Unknown error"))
			}
			pendingRequests.delete(message.requestId)
		}
	}
})

export function requestResponse(
	message: Omit<WebviewMessage, "type"> & { type: WebviewMessage["type"] },
	responseType: WebviewMessage["type"] = "response",
): Promise<unknown> {
	return new Promise((resolve, reject) => {
		const requestId = Math.random().toString(36).substring(2, 15)
		pendingRequests.set(requestId, { resolve, reject, responseType })
		vscode.postMessage({ ...message, requestId })
	})
}