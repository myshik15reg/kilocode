// Mock Neo4j driver for Vitest tests
export class Driver {
	constructor(uri, auth) {
		this.uri = uri
		this.auth = auth
	}

	session(config) {
		return new Session(config)
	}

	async close() {
		// Mock cleanup
	}
}

export class Session {
	constructor(config) {
		this.database = config?.database || 'neo4j'
		this.records = []
		this.closed = false
	}

	async run(query, params = {}) {
		// Mock query execution
		const records = []

		// Handle different query patterns
		if (query.includes('MERGE')) {
			// Handle node creation/update
			const match = query.match(/n:Code\s*{id:\s*\$id}/)
			if (match) {
				const id = params.id
				const properties = params.properties || {}
				const labels = params.labels || ['Code']
				
				// Store mock node
				this.records.push({
					get: (key) => {
						switch (key) {
							case 'id': return id
							case 'name': return properties.name
							case 'filePath': return properties.filePath
							case 'kind': return properties.kind
							case 'range': return properties.range
							default: return null
						}
					}
				})
			}
		} else if (query.includes('MATCH') && query.includes('MERGE')) {
			// Handle edge creation
			const sourceId = params.sourceId
			const targetId = params.targetId
			const edgeType = query.match(/\[r:(\w+)\]/)?.[1] || 'RELATES_TO'
			
			// Store mock edge
			this.records.push({
				sourceId,
				targetId,
				type: edgeType
			})
		} else if (query.includes('MATCH') && query.includes('WHERE') && query.includes('CONTAINS')) {
			// Handle search by term
			const searchTerm = params.term?.toLowerCase() || ''
			
			// Return mock search results
			const mockResults = [
				{
					id: 'test-file-1.ts#functionA',
					name: 'functionA',
					filePath: 'test-file-1.ts',
					kind: 'function',
					range: { start: { line: 1 }, end: { line: 5 } }
				},
				{
					id: 'test-file-2.ts#classB',
					name: 'classB', 
					filePath: 'test-file-2.ts',
					kind: 'class',
					range: { start: { line: 10 }, end: { line: 20 } }
				},
				{
					id: 'test-file-1.ts#functionC',
					name: 'functionC',
					filePath: 'test-file-1.ts', 
					kind: 'function',
					range: { start: { line: 7 }, end: { line: 12 } }
				}
			].filter(item => 
				item.name.toLowerCase().includes(searchTerm) ||
				item.filePath.toLowerCase().includes(searchTerm)
			)

			records.push(...mockResults.map(result => ({
				get: (key) => {
					switch (key) {
						case 'id': return result.id
						case 'name': return result.name
						case 'filePath': return result.filePath
						case 'kind': return result.kind
						case 'range': return result.range
						default: return null
					}
				}
			})))
		}

		return {
			records: records.map(record => ({ get: (key) => record.get(key) })),
			summary: {
				resultAvailableAfter: 0,
				resultConsumedAfter: 0,
				counters: {}
			}
		}
	}

	async close() {
		this.closed = true
	}

	// Helper methods for testing
	addMockNode(node) {
		this.records.push({
			get: (key) => {
				switch (key) {
					case 'id': return node.id
					case 'name': return node.name
					case 'filePath': return node.filePath
					case 'kind': return node.kind
					case 'range': return node.range
					default: return null
				}
			}
		})
	}

	addMockEdge(edge) {
		this.records.push(edge)
	}

	clear() {
		this.records = []
	}
}

export const auth = {
	basic: (user, password) => ({ user, password })
}

export default {
	Driver,
	Session,
	auth
}