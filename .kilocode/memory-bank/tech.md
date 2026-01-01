# Tech Stack

## Core Technologies
-   **Runtime**: Node.js (v20.x recommended)
-   **Language**: TypeScript (v5.x)
-   **Package Manager**: pnpm (v10.x)
-   **Build System**: TurboRepo
-   **Bundler**: esbuild / Vite (for Webview)

## VS Code Extension
-   **Framework**: VS Code Extension API
-   **Packaging**: @vscode/vsce

## Webview UI
-   **Framework**: React
-   **Styling**: Tailwind CSS
-   **Build Tool**: Vite

## Testing
-   **Unit/Integration**: Vitest / Jest
-   **E2E**: Playwright (for browser automation features)
-   **Mocking**: Built-in mocks or simple dependency injection

## Linting & Formatting
-   **Linter**: ESLint
-   **Formatter**: Prettier
-   **Hooks**: Husky + lint-staged

## AI & LLM
-   **Providers**: OpenRouter, Anthropic, Google Gemini, OpenAI
-   **Models**: Gemini 3 Pro, Claude 3.5 Sonnet, GPT-4o, etc.

## Dependencies (Key Libraries)
-   `@modelcontextprotocol/sdk`: For MCP integration.
-   `puppeteer-core` / `playwright`: For browser automation.
-   `zod`: For schema validation.
-   `axios` / `fetch`: For API requests.

## Development Tools
-   **VS Code**: Primary IDE.
-   **Docker**: For running evaluation environments (`packages/evals`).
-   **Changesets**: For versioning and changelog management.