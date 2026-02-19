import { getVectorIndexExtensions, shouldUseVectorFallbackChunking } from "../../file-types/file-type-registry"

// Single Source of Truth: scanner uses the file-type registry (vector-eligible extensions).
export const scannerExtensions = getVectorIndexExtensions()

/**
 * Check if a file extension should use fallback chunking
 * @param extension File extension (including the dot)
 * @returns true if the extension should use fallback chunking
 */
export function shouldUseFallbackChunking(extension: string): boolean {
	return shouldUseVectorFallbackChunking(extension)
}
