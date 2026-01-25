# Graph Integration Summary

## Overview

The Neo4j graph pipeline is now language-agnostic. Graph extraction uses a single Tree-sitter based extractor and shares the same parser/query infrastructure as semantic search.

## Core Components

### TreeSitterGraphExtractor
- Unified graph extractor for all supported languages.
- Builds `file` entities and `defines` relationships from query captures.
- Adds `calls` relationships when call captures are present.

**Location:** `src/services/neo4j/extractors/tree-sitter-graph-extractor.ts`

### RelationshipExtractor
- Resolves language by extension or explicit languageId.
- Normalizes to canonical Tree-sitter languageId.
- Caches extractors per language.

**Location:** `src/services/neo4j/relationship-extractor.ts`

### RelationshipIndexer
- Writes entities/relationships into Neo4j.

**Location:** `src/services/neo4j/relationship-indexer.ts`

### CodeIndexOrchestrator
- Triggers graph indexing for all supported languages.
- Uses shared language resolution (no language-specific branches).

**Location:** `src/services/code-index/orchestrator.ts`

## Language Normalization

Examples:
- `bsl`, `os`, `1c` -> `onec`
- `js`, `jsx`, `json` -> `javascript`
- `ejs`, `erb` -> `embedded_template`

Normalization is implemented in `src/services/tree-sitter/languageParser.ts`.

## Example Usage

```typescript
import { RelationshipExtractor } from "./services/neo4j/relationship-extractor"

const extractor = new RelationshipExtractor()

// Auto-detect language from extension
const result = await extractor.extract("function sum(a, b) { return a + b }", "sum.ts")

// Explicit language id
const result2 = await extractor.extract("procedure Test() endprocedure", "module.bsl", "onec")
```

## Tests

- `src/services/neo4j/extractors/__tests__/tree-sitter-graph-extractor.spec.ts`
- `src/services/neo4j/__tests__/relationship-extractor.spec.ts`
- `src/services/tree-sitter/__tests__/languageParser.spec.ts`
- `src/services/tree-sitter/__tests__/integration.spec.ts`
- `src/services/code-index/__tests__/orchestrator.spec.ts`

## Known Limitations

- Tree-sitter WASM binaries must be available for runtime parsing.
- Graph extraction depends on available definition queries for each language.

## Files/Directories

- `tree-sitter-grammars/` - grammar sources
- `src/services/tree-sitter/queries/` - definition queries
