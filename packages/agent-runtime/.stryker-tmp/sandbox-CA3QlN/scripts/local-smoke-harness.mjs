// @ts-nocheck
import { fork } from "node:child_process"
import path from "node:path"
import process from "node:process"
import { fileURLToPath } from "node:url"

// kilocode_change - new file

const __dirname = path.dirname(fileURLToPath(import.meta.url))
const packageRoot = path.resolve(__dirname, "..")
const distProcessPath = path.join(packageRoot, "dist", "process.js")

const workspace = process.env.AGENT_RUNTIME_WORKSPACE || process.cwd()
const prompt = process.env.AGENT_RUNTIME_PROMPT || "Reply with OK"
const mode = process.env.AGENT_RUNTIME_MODE || "code"
const providerSettingsJson = process.env.AGENT_RUNTIME_PROVIDER_JSON

if (!providerSettingsJson) {
	console.error("AGENT_RUNTIME_PROVIDER_JSON is required")
	process.exit(1)
}

let providerSettings
try {
	providerSettings = JSON.parse(providerSettingsJson)
} catch (error) {
	console.error(`Failed to parse AGENT_RUNTIME_PROVIDER_JSON: ${error instanceof Error ? error.message : String(error)}`)
	process.exit(1)
}

const child = fork(distProcessPath, [], {
	cwd: workspace,
	env: {
		...process.env,
		AGENT_CONFIG: JSON.stringify({
			workspace,
			providerSettings,
			mode,
			autoApprove: true,
			appName: "agent-runtime-smoke-harness",
		}),
	},
	stdio: ["inherit", "inherit", "inherit", "ipc"],
})

let ready = false
let stateChanges = 0
const completionRequestId = "smoke-request"

const shutdown = (code = 0) => {
	if (child.connected) {
		child.send({ type: "shutdown" })
	}
	setTimeout(() => process.exit(code), 250)
}

child.on("message", (message) => {
	if (!message || typeof message !== "object") {
		return
	}

	if (message.type === "ready") {
		ready = true
		console.log("[smoke] ready")
		child.send({ type: "sendMessage", payload: { type: "singleCompletion", text: prompt, completionRequestId } })
		return
	}

	if (message.type === "stateChange") {
		stateChanges += 1
		const activeMode = message.state?.mode || "unknown"
		console.log(`[smoke] stateChange #${stateChanges} mode=${activeMode}`)
		return
	}

	if (message.type === "message" && message.payload?.type === "singleCompletionResult") {
		if (message.payload.completionRequestId !== completionRequestId) {
			return
		}
		if (message.payload.success) {
			console.log(`[smoke] completion=${message.payload.completionText}`)
			shutdown(0)
		} else {
			console.error(`[smoke] completion failed: ${message.payload.completionError}`)
			shutdown(1)
		}
		return
	}

	if (message.type === "error") {
		console.error(`[smoke] error: ${message.error?.message || "unknown"}`)
		shutdown(1)
	}
})

child.on("exit", (code, signal) => {
	if (signal) {
		console.error(`[smoke] child exited by signal ${signal}`)
		process.exit(1)
	}
	if (!ready) {
		console.error("[smoke] child exited before ready")
	}
	process.exit(code ?? 0)
})

setTimeout(() => {
	console.error(`[smoke] timeout waiting for singleCompletion after ${ready ? "ready" : "startup"}`)
	shutdown(1)
}, 120000)
