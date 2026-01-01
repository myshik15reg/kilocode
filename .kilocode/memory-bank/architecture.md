# Architecture

## System Overview
Kilo Code is a VS Code extension built as a monorepo using `pnpm` workspaces and `TurboRepo`. It consists of a core extension, a webview UI, and several supporting packages.

## Monorepo Structure
-   `apps/`: Application-level packages.
-   `packages/`: Shared libraries and utilities.
-   `cli/`: Command-line interface tools.
-   `src/`: Main extension source code (likely legacy structure being migrated or core extension logic).
-   `webview-ui/`: React-based UI for the extension side panel.

## Key Components

### 1. Extension Core (`src/`)
-   **Entry Point**: `extension.ts` (assumed).
-   **Responsibility**:
    -   Interfacing with VS Code API.
    -   Managing the agent lifecycle.
    -   Handling file system operations.
    -   Executing terminal commands.
    -   Communicating with the Webview UI.

### 2. Webview UI (`webview-ui/`)
-   **Tech Stack**: React, Vite, Tailwind CSS.
-   **Responsibility**:
    -   Rendering the chat interface.
    -   Displaying messages, code blocks, and tool outputs.
    -   Managing user input and state.
    -   Communicating with the Core Extension via message passing.

### 3. AI Integration
-   **Providers**: OpenRouter, Anthropic, Google Gemini, OpenAI, etc.
-   **Mechanism**: API calls to LLM providers using standardized prompts and context management.

### 4. MCP Integration
-   **Role**: Extends agent capabilities by connecting to external tools.
-   **Implementation**: Client implementation of the Model Context Protocol to discover and invoke tools from connected servers.

### 5. Browser Automation
-   **Tech Stack**: Puppeteer / Playwright.
-   **Role**: Executing browser-based tasks defined by the agent.

## Data Flow
1.  **User Input**: User types a prompt in the Webview UI.
2.  **Message Passing**: Webview sends the message to the Extension Core.
3.  **Context Assembly**: Core gathers relevant file context, open tabs, and project structure.
4.  **LLM Request**: Core sends the prompt + context to the selected AI model.
5.  **Tool Execution**: If the LLM requests a tool use (e.g., `read_file`), Core executes it and feeds the result back.
6.  **Response**: The final response or code change is sent back to the Webview UI for display.

## Design Patterns
-   **Message Passing**: Strict separation between UI and Core logic using VS Code's `postMessage` API.
-   **Dependency Injection**: Services and providers are injected to allow easy mocking and testing.
-   **State Management**: Local state in React for UI, persistent state in Extension Core (global state, workspace state).

## Security
-   **Sandboxing**: Tool execution is sandboxed where possible.
-   **User Approval**: Critical actions (shell commands, file writes) require explicit user confirmation.
-   **Secret Management**: API keys are stored securely using VS Code's `SecretStorage`.