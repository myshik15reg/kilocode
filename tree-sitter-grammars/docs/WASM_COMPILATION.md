# WASM Compilation Guide

## Overview

This document describes how to compile the tree-sitter-onec grammar into a WebAssembly (WASM) module for use in Kilocode.

## Prerequisites

### Windows

- Visual Studio 2019 or later with C++ Build Tools
- OR MinGW-w64
- Node.js 16+ and npm/pnpm
- Emscripten SDK (optional for web builds)

### Linux/macOS

- GCC or Clang compiler
- Node.js 16+ and npm/pnpm
- Emscripten SDK (optional for web builds)

## Compilation Steps

### Step 1: Install Dependencies

```bash
cd tree-sitter-grammars
npm install
```

### Step 2: Generate Parser

```bash
npm run generate
```

This creates:

- `src/parser.c` - C implementation
- `src/grammar.json` - Grammar metadata
- `src/node-types.json` - AST node types

### Step 3: Build Native Module (Optional)

```bash
node-gyp rebuild
```

### Step 4: Build WASM (Using tree-sitter CLI)

```bash
tree-sitter build-wasm
```

This creates `tree-sitter-onec.wasm` in the project root.

### Step 5: Copy WASM to Kilocode

```bash
cp tree-sitter-onec.wasm ../src/dist/tree-sitter-onec.wasm
```

## Alternative: Pre-built WASM

If compilation fails, you can still iterate on the grammar via `tree-sitter generate/test/parse` (native build). However, Kilocode uses `web-tree-sitter` and requires the `tree-sitter-onec.wasm` binary for runtime parsing.

## Troubleshooting

### "tree-sitter: command not found"

Install tree-sitter CLI globally:

```bash
npm install -g tree-sitter-cli
```

### "node-gyp: not found"

Install node-gyp globally:

```bash
npm install -g node-gyp
```

### Windows: "error MSB8036: The Windows SDK version X.X was not found"

Install Windows SDK through Visual Studio Installer.

### Permission denied errors

Run terminal as Administrator (Windows) or use sudo (Linux/macOS).

## Integration with Kilocode

After successful compilation, the WASM file should be placed in `src/dist/` directory alongside other tree-sitter parsers:

```
kilocode/
└── src/
    └── dist/
        ├── tree-sitter-typescript.wasm
        ├── tree-sitter-python.wasm
        ├── tree-sitter-onec.wasm <- New
        └── ...
```

## Testing

Test the parser with example code:

```bash
tree-sitter parse examples/simple.bsl
```

Expected output should show the parsed AST without errors.
