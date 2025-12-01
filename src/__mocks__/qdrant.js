// Mock Qdrant client for Vitest tests
export class QdrantClient {
	constructor(url, apiKey) {
		this.url = url
		this.apiKey = apiKey
		this.collections = new Map()
	}

	async getCollections() {
		return {
			collections: Array.from(this.collections.keys()).map(name => ({ name }))
		}
	}

	async createCollection(collectionName, config) {
		this.collections.set(collectionName, {
			vectors: config.vectors,
			points: []
		})
		return { status: 'ok' }
	}

	async deleteCollection(collectionName) {
		this.collections.delete(collectionName)
		return { status: 'ok' }
	}

	async getCollection(collectionName) {
		const collection = this.collections.get(collectionName)
		if (!collection) {
			throw new Error(`Collection ${collectionName} not found`)
		}
		return {
			result: {
				vectors: collection.vectors,
				points_count: collection.points.length
			}
		}
	}

	async upsert(collectionName, points) {
		const collection = this.collections.get(collectionName)
		if (!collection) {
			throw new Error(`Collection ${collectionName} not found`)
		}
		
		// Remove existing points with same IDs
		collection.points = collection.points.filter(p => !points.some(up => up.id === p.id))
		// Add new points
		collection.points.push(...points)
		
		return { status: 'ok' }
	}

	async search(collectionName, queryVector, options = {}) {
		const collection = this.collections.get(collectionName)
		if (!collection) {
			throw new Error(`Collection ${collectionName} not found`)
		}

		let points = collection.points

		// Apply filter if directory prefix is specified
		if (options.filter?.must?.length > 0) {
			const keyCondition = options.filter.must[0]?.key === 'filePath'
			if (keyCondition) {
				const prefix = options.filter.must[0]?.match?.prefix
				if (prefix) {
					points = points.filter(point => 
						point.payload?.filePath?.startsWith(prefix)
					)
				}
			}
		}

		// Simple similarity search (mock)
		const results = points.map(point => {
			// Mock similarity calculation - in real implementation this would be cosine similarity
			const similarity = Math.random() * 0.5 + 0.5 // Random score between 0.5 and 1.0
			return {
				id: point.id,
				score: similarity,
				payload: point.payload
			}
		})

		// Sort by score and limit
		return results
			.sort((a, b) => b.score - a.score)
			.slice(0, options.limit || 10)
			.filter(result => result.score >= (options.score_threshold || 0))
	}

	async delete(collectionName, pointsSelector) {
		const collection = this.collections.get(collectionName)
		if (!collection) {
			throw new Error(`Collection ${collectionName} not found`)
		}

		if (pointsSelector.points) {
			const idsToDelete = pointsSelector.points.map(p => p.id)
			collection.points = collection.points.filter(p => !idsToDelete.includes(p.id))
		}

		return { status: 'ok' }
	}

	async clearCollection(collectionName) {
		const collection = this.collections.get(collectionName)
		if (collection) {
			collection.points = []
		}
		return { status: 'ok' }
	}
}

export default QdrantClient