import * as vscode from "vscode"

const ALLOWED_EXTERNAL_URI_SCHEMES = new Set(["http", "https"])

export function parseTrustedExternalUri(rawUrl: string): vscode.Uri | undefined {
	try {
		const uri = vscode.Uri.parse(rawUrl)
		const normalizedScheme = uri.scheme.toLowerCase()
		if (!ALLOWED_EXTERNAL_URI_SCHEMES.has(normalizedScheme)) {
			return undefined
		}
		return uri
	} catch {
		return undefined
	}
}

export async function openTrustedExternalUrl(rawUrl: string): Promise<boolean> {
	const uri = parseTrustedExternalUri(rawUrl)
	if (!uri) {
		return false
	}

	await vscode.env.openExternal(uri)
	return true
}
