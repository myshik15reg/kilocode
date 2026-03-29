const fs = require('fs')
const path = require('path')
const crypto = require('crypto')

function deterministicUuid(value) {
  const hex = crypto.createHash('sha1').update(value).digest('hex').slice(0, 32)
  return `${hex.slice(0, 8)}-${hex.slice(8, 12)}-${hex.slice(12, 16)}-${hex.slice(16, 20)}-${hex.slice(20, 32)}`
}

async function main() {
  const workspaceRoot = path.resolve('.tmp-e2e/ml-workspace')
  const srcDir = path.join(workspaceRoot, 'src')

  const files = [
    { filePath: 'src/math.ts', query: 'typescript add function' },
    { filePath: 'src/calc.py', query: 'python add function' },
    { filePath: 'src/Calc.java', query: 'java add method' },
    { filePath: 'src/module.bsl', query: '1C функция сумма' },
  ].map((item) => ({
    ...item,
    absPath: path.join(workspaceRoot, item.filePath),
    content: fs.readFileSync(path.join(workspaceRoot, item.filePath), 'utf8'),
  }))

  const embHeaders = {
    'Content-Type': 'application/json',
    Authorization: 'Bearer sk-platform-t6GHuBZeTtP6gdTmycAVDcsJ2pR_auyK',
  }

  const embResp = await fetch('http://localhost:4000/v1/embeddings', {
    method: 'POST',
    headers: embHeaders,
    body: JSON.stringify({
      model: 'alfaleasing/bge-m3',
      input: files.map((f) => f.content),
      encoding_format: 'base64',
    }),
  })

  if (!embResp.ok) {
    throw new Error(`Embeddings failed: ${embResp.status} ${await embResp.text()}`)
  }

  const embJson = await embResp.json()
  const vectors = embJson.data.map((item) => {
    const buffer = Buffer.from(item.embedding, 'base64')
    return Array.from(new Float32Array(buffer.buffer, buffer.byteOffset, buffer.byteLength / 4))
  })

  const vectorSize = vectors[0].length

  const qdrantCollection = 'test-e2e-ml'
  await fetch(`http://localhost:6333/collections/${qdrantCollection}`, {
    method: 'PUT',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({
      vectors: { size: vectorSize, distance: 'Cosine' },
    }),
  })

  const points = files.map((file, index) => ({
    id: deterministicUuid(file.filePath),
    vector: vectors[index],
    payload: {
      filePath: file.filePath,
      codeChunk: file.content,
      startLine: 1,
      endLine: file.content.split(/\r?\n/).length,
      code_snippet: file.content,
      module: file.filePath,
      neo4j_id: `file:${file.filePath}`,
    },
  }))

  const upsertResp = await fetch(`http://localhost:6333/collections/${qdrantCollection}/points?wait=true`, {
    method: 'PUT',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ points }),
  })
  if (!upsertResp.ok) {
    throw new Error(`Qdrant upsert failed: ${upsertResp.status} ${await upsertResp.text()}`)
  }

  const neoPair = Buffer.from('neo4j:pleaseChange').toString('base64')
  const cypherStatements = files.map((file) => ({
    statement: `MERGE (f:CodeEntity {id: $id}) SET f.type='file', f.name=$name, f.filePath=$filePath, f.line=1, f.language=$language, f.updatedAt=datetime() RETURN f.id`,
    parameters: {
      id: `file:${file.filePath}`,
      name: path.basename(file.filePath),
      filePath: file.filePath,
      language: file.filePath.endsWith('.bsl') ? 'onec' : file.filePath.split('.').pop(),
    },
  }))

  const neoResp = await fetch('http://localhost:7474/db/neo4j/tx/commit', {
    method: 'POST',
    headers: {
      Authorization: `Basic ${neoPair}`,
      'Content-Type': 'application/json',
    },
    body: JSON.stringify({ statements: cypherStatements }),
  })
  const neoJson = await neoResp.json()
  if (neoJson.errors?.length) {
    throw new Error(`Neo4j write failed: ${JSON.stringify(neoJson.errors)}`)
  }

  async function embedQuery(text) {
    const res = await fetch('http://localhost:4000/v1/embeddings', {
      method: 'POST',
      headers: embHeaders,
      body: JSON.stringify({ model: 'alfaleasing/bge-m3', input: [text], encoding_format: 'base64' }),
    })
    if (!res.ok) {
      throw new Error(`Query embedding failed: ${res.status} ${await res.text()}`)
    }
    const json = await res.json()
    const buffer = Buffer.from(json.data[0].embedding, 'base64')
    return Array.from(new Float32Array(buffer.buffer, buffer.byteOffset, buffer.byteLength / 4))
  }

  async function qdrantSearch(query, limit = 3) {
    const vector = await embedQuery(query)
    const res = await fetch(`http://localhost:6333/collections/${qdrantCollection}/points/search`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ vector, limit, with_payload: true }),
    })
    if (!res.ok) {
      throw new Error(`Qdrant search failed: ${res.status} ${await res.text()}`)
    }
    return res.json()
  }

  async function rerank(query, texts, topN = 2) {
    const res = await fetch('http://localhost:4000/v1/rerank', {
      method: 'POST',
      headers: embHeaders,
      body: JSON.stringify({
        model: 'alfaleasing/bge-reranker-v2-m3',
        query,
        texts,
        top_n: topN,
      }),
    })
    if (!res.ok) {
      throw new Error(`Rerank failed: ${res.status} ${await res.text()}`)
    }
    return res.json()
  }

  const semanticChecks = []
  for (const file of files) {
    const result = await qdrantSearch(file.query, 3)
    semanticChecks.push({
      query: file.query,
      topFile: result.result?.[0]?.payload?.filePath || null,
      top3: (result.result || []).map((r) => r.payload?.filePath),
    })
  }

  const rerankResult = await rerank(
    '1C сумма function add',
    files.map((f) => f.content),
    3,
  )

  const neoCountResp = await fetch('http://localhost:7474/db/neo4j/tx/commit', {
    method: 'POST',
    headers: {
      Authorization: `Basic ${neoPair}`,
      'Content-Type': 'application/json',
    },
    body: JSON.stringify({ statements: [{ statement: 'MATCH (n:CodeEntity) RETURN count(n) AS count' }] }),
  })
  const neoCountJson = await neoCountResp.json()

  console.log(JSON.stringify({
    workspaceRoot,
    vectorSize,
    indexedFiles: files.map((f) => f.filePath),
    semanticChecks,
    rerankTop: rerankResult.results,
    neo4jEntityCount: neoCountJson.results?.[0]?.data?.[0]?.row?.[0] ?? null,
  }, null, 2))
}

main().catch((error) => {
  console.error(error)
  process.exit(1)
})
