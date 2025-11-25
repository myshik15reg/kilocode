export interface ICacheManager {
	getHash(filePath: string): string | undefined
	updateHash(filePath: string, hash: string): void
	deleteHash(filePath: string): void
	getAllHashes(): Record<string, string>
	getNeo4jHash(filePath: string): string | undefined
	updateNeo4jHash(filePath: string, hash: string): void
	deleteNeo4jHash(filePath: string): void
}
