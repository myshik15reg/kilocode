# Code Index Storage Model

## Overview

Code indexing now follows a `Qdrant-first` model:

- `Qdrant` + embeddings is the base layer for semantic search.
- `Neo4j` is optional and adds graph relationships on top of the semantic index.
- A `reranker` is optional and can improve result ordering independently of Neo4j.
- When enabled together, semantic search, graph enrichment, and reranking work collaboratively.

## Required Base Configuration

The code index does not start unless the project is configured manually.

Required for indexing:

- code index feature enabled
- embedder configured
- vector store target configured
- `codebaseIndexVectorStoreName` set manually for the current project

The vector store name is project-scoped and must not be auto-generated. If the name is empty, indexing stays disabled even if the rest of the settings are valid.

## Optional Layers

### Neo4j

- Enables graph extraction and relationship indexing.
- Remains optional and does not replace semantic search.
- Uses its own cache so already indexed graph files are not re-sent unnecessarily.

### Reranker

- Remains optional.
- Can work with semantic-only search.
- Can also work together with Neo4j-enhanced retrieval.

## Cache Model

Semantic and graph indexing caches are independent:

- semantic cache tracks files indexed into the vector store
- Neo4j cache tracks files indexed into the graph database

This allows:

- semantic-only indexing without Neo4j
- enabling Neo4j later without rebuilding the whole semantic index
- clearing one cache when its backend target changes

When the semantic target changes, semantic cache must be invalidated. Typical triggers:

- vector store provider change
- vector store name change
- Qdrant URL change
- Qdrant API key change
- LanceDB directory change

When the Neo4j connection target changes, Neo4j cache must be invalidated.

## Clear Index Behavior

`Clear Index` clears all project index state:

- vector collection data
- Neo4j graph data
- semantic cache
- Neo4j cache

This keeps the semantic and graph layers consistent after a reset.

## Tree-sitter Grammar Sources

The 1C grammar sources are now stored under:

- `tools/tree-sitter-grammars`

Runtime parsing continues to use packaged WASM binaries from `src/dist/`.
