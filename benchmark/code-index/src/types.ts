export type DatasetManifest = {
	id: string
	label: string
	repoPath: string
	optional?: boolean
	includeExtensions?: string[]
	excludeDirs?: string[]
}

export type QueryCase = {
	id: string
	query: string
	expected: Array<{ filePath: string; line?: number }>
}

export type QueryPack = {
	id: string
	datasetId: string
	seed: number
	cases: QueryCase[]
}
