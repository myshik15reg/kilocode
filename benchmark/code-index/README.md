# Code Index Benchmark (BGE + Qdrant + Neo4j)

Этот каталог содержит воспроизводимый бенчмарк пайплайна индексации кодовой базы:

1. ingest исходников
2. разбиение на чанки
3. получение эмбеддингов (BGE-family через OpenAI-compatible endpoint)
4. запись в Qdrant
5. извлечение сущностей/связей и запись в Neo4j
6. поиск и навигация (semantic + hybrid)

## Важно про модели BGE

Текущий embeddings endpoint `http://localhost:4001` (по результатам `/v1/models`) **экспонирует только один embedding model**:

- `alfaleasing/bge-m3`

А также модель реранкера:

- `alfaleasing/bge-reranker-v2-m3`

Требование сравнить `bge-small / bge-base / bge-large` можно выполнить только если gateway начнёт отдавать эти модели (или алиасы) в `/v1/models` и принимать их в `/v1/embeddings`.

Бенчмарк-CLI в этом каталоге **поддерживает матрицу моделей**, но фактически сможет прогнать только те model IDs, которые реально доступны на endpoint.

## Endpoints

- Embeddings: `http://localhost:4001/v1/embeddings`
- Qdrant: `http://localhost:6333`
- Neo4j HTTP UI: `http://localhost:7474/` (Bolt обычно `bolt://localhost:7687`)

## Планируемые команды CLI

- `index`: построить индекс с нуля
- `update`: инкрементальное обновление (add/delete/rename)
- `eval`: прогон набора запросов, метрики Recall@k / nDCG@k / MRR
- `report`: агрегация результатов в `report.md` и `report.json`

## Детализация метрик

Бенчмарк будет собирать:

- throughput: files/sec, chunks/sec
- embedding latency: p50/p95 per batch
- Qdrant upsert latency: p50/p95 per batch
- Qdrant storage/index size: collection info + docker volume size (если доступно)
- Neo4j write latency and graph stats (#entities, #relationships by type)
- retrieval quality: Recall@k, nDCG@k, MRR
- incremental robustness: correctness and time for add/delete/rename/diff-index
- end-to-end hybrid latency: Qdrant top-k + Neo4j refine (+ optional rerank)

## Детерминизм

- fixed seed для генератора датасетов и запросов
- фиксированные параметры чанкинга/батчинга/конкурентности
- детерминированные ids в Qdrant (`uuidv5(segmentHash, namespace)`)
