// Mock embedder for Vitest tests
export class MockEmbedder {
	constructor(config = {}) {
		this.config = config
	}

	async createEmbeddings(texts, model) {
		// Return mock embeddings for each text
		const embeddings = texts.map(text => 
			Array.from({ length: 1536 }, () => Math.random()) // Mock 1536-dimensional vectors
		)
		
		return {
			embeddings,
			usage: {
				promptTokens: texts.reduce((sum, text) => sum + text.split(' ').length, 0),
				totalTokens: texts.reduce((sum, text) => sum + text.split(' ').length, 0)
			}
		}
	}

	async validateConfiguration() {
		return { valid: true }
	}

	get embedderInfo() {
		return { 
			name: this.config.provider || "openai"
		}
	}
}

export default MockEmbedder