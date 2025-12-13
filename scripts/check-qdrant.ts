#!/usr/bin/env tsx

/**
 * Qdrant Health Check Script
 * 
 * Checks if Qdrant is running and displays collection statistics.
 * 
 * Usage:
 *   npm run check:qdrant
 *   tsx scripts/check-qdrant.ts
 */

// ANSI color codes for cross-platform colored output
const colors = {
	reset: '\x1b[0m',
	bright: '\x1b[1m',
	green: '\x1b[32m',
	yellow: '\x1b[33m',
	red: '\x1b[31m',
	cyan: '\x1b[36m',
	white: '\x1b[37m',
}

function log(message: string, color: keyof typeof colors = 'white') {
	console.log(`${colors[color]}${message}${colors.reset}`)
}

function formatBytes(bytes: number): string {
	const sizes = ['Bytes', 'KB', 'MB', 'GB']
	if (bytes === 0) return '0 Bytes'
	const i = Math.floor(Math.log(bytes) / Math.log(1024))
	return `${Math.round(bytes / Math.pow(1024, i) * 100) / 100} ${sizes[i]}`
}

interface QdrantHealth {
	title: string
	version: string
}

interface QdrantCollection {
	name: string
}

interface QdrantCollectionInfo {
	status: string
	optimizer_status: string
	vectors_count: number
	indexed_vectors_count: number
	points_count: number
	segments_count: number
	config: {
		params: {
			vectors: {
				size: number
				distance: string
			}
		}
	}
}

const QDRANT_URL = 'http://localhost:6333'
const KILOCODE_COLLECTION = 'kilocode'

async function checkQdrant() {
	console.log('')
	log('=== Qdrant Health Check ===', 'bright')
	console.log('')

	try {
		// 1. Check if Qdrant is running
		log('Checking Qdrant connection...', 'yellow')
		const healthResponse = await fetch(`${QDRANT_URL}/`)
		
		if (!healthResponse.ok) {
			log('❌ Qdrant is not responding', 'red')
			process.exit(1)
		}

		const healthData = await healthResponse.json() as QdrantHealth
		log(`✅ Qdrant is running`, 'green')
		log(`   Version: ${healthData.version}`, 'cyan')
		log(`   Title: ${healthData.title}`, 'cyan')
		console.log('')

		// 2. Check health endpoint
		log('Checking health status...', 'yellow')
		const healthCheckResponse = await fetch(`${QDRANT_URL}/health`)
		const healthCheck = await healthCheckResponse.json()
		
		if (healthCheck.status === 'ok') {
			log('✅ Health check passed', 'green')
		} else {
			log(`⚠️  Health check status: ${healthCheck.status}`, 'yellow')
		}
		console.log('')

		// 3. List all collections
		log('Fetching collections...', 'yellow')
		const collectionsResponse = await fetch(`${QDRANT_URL}/collections`)
		const collectionsData = await collectionsResponse.json()
		const collections = collectionsData.result.collections as QdrantCollection[]

		if (collections.length === 0) {
			log('⚠️  No collections found', 'yellow')
			console.log('')
			log('To create a Kilocode collection, index your codebase first.', 'cyan')
			process.exit(0)
		}

		log(`✅ Found ${collections.length} collection(s):`, 'green')
		collections.forEach((col) => {
			log(`   • ${col.name}`, 'white')
		})
		console.log('')

		// 4. Check Kilocode collection specifically
		const hasKilocodeCollection = collections.some(col => col.name === KILOCODE_COLLECTION)
		
		if (!hasKilocodeCollection) {
			log(`⚠️  Kilocode collection "${KILOCODE_COLLECTION}" not found`, 'yellow')
			log('   Available collections:', 'cyan')
			collections.forEach((col) => {
				log(`   • ${col.name}`, 'white')
			})
			console.log('')
			log('To create the Kilocode collection, run codebase indexing.', 'cyan')
			process.exit(0)
		}

		// 5. Get detailed info about Kilocode collection
		log(`Checking "${KILOCODE_COLLECTION}" collection details...`, 'yellow')
		const collectionResponse = await fetch(`${QDRANT_URL}/collections/${KILOCODE_COLLECTION}`)
		const collectionData = await collectionResponse.json()
		const info = collectionData.result as QdrantCollectionInfo

		log(`✅ Collection "${KILOCODE_COLLECTION}" statistics:`, 'green')
		console.log('')
		
		log('  Status:', 'cyan')
		log(`    Status: ${info.status}`, 'white')
		log(`    Optimizer: ${info.optimizer_status}`, 'white')
		console.log('')
		
		log('  Vectors:', 'cyan')
		log(`    Total vectors: ${info.vectors_count.toLocaleString()}`, 'white')
		log(`    Indexed vectors: ${info.indexed_vectors_count.toLocaleString()}`, 'white')
		log(`    Vector size: ${info.config.params.vectors.size}`, 'white')
		log(`    Distance metric: ${info.config.params.vectors.distance}`, 'white')
		console.log('')
		
		log('  Points:', 'cyan')
		log(`    Total points: ${info.points_count.toLocaleString()}`, 'white')
		log(`    Segments: ${info.segments_count}`, 'white')
		console.log('')

		// Estimate size (rough calculation)
		const estimatedSize = info.vectors_count * info.config.params.vectors.size * 4 // 4 bytes per float32
		log('  Estimated Size:', 'cyan')
		log(`    ~${formatBytes(estimatedSize)}`, 'white')
		console.log('')

		// 6. Summary
		log('=== Summary ===', 'bright')
		console.log('')
		
		if (info.vectors_count === 0) {
			log('⚠️  Collection is empty. No vectors indexed yet.', 'yellow')
			log('   Run codebase indexing to populate the collection.', 'cyan')
		} else if (info.indexed_vectors_count < info.vectors_count) {
			const percentageIndexed = Math.round((info.indexed_vectors_count / info.vectors_count) * 100)
			log(`⚠️  Indexing in progress: ${percentageIndexed}% complete`, 'yellow')
		} else {
			log('✅ All systems operational', 'green')
			log(`   Ready for semantic code search with ${info.vectors_count.toLocaleString()} indexed vectors`, 'cyan')
		}
		console.log('')

	} catch (error) {
		console.log('')
		log('❌ Qdrant is not running or not accessible', 'red')
		console.log('')
		log('Error details:', 'yellow')
		if (error instanceof Error) {
			log(`   ${error.message}`, 'red')
		}
		console.log('')
		log('Troubleshooting:', 'cyan')
		log('  1. Make sure Qdrant is running:', 'white')
		log('     docker run -p 6333:6333 qdrant/qdrant', 'white')
		log('  2. Check if port 6333 is accessible', 'white')
		log('  3. Verify QDRANT_URL is correct (default: http://localhost:6333)', 'white')
		console.log('')
		process.exit(1)
	}
}

// Run the check
checkQdrant().catch((error) => {
	console.error('Unexpected error:', error)
	process.exit(1)
})