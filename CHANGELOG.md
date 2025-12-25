# kilo-code

## [Unreleased]

### Added

- **Neo4j Settings UI** - Visual configuration interface for Neo4j integration
  - Secure password storage using VSCode SecretStorage
  - Real-time connection testing with detailed status feedback
  - Full localization support (English/Russian)
  - 82 comprehensive unit tests covering all functionality

### Features

- **Neo4j Integration Controls**
  - Toggle to enable/disable Neo4j integration
  - URI validation for bolt://, neo4j://, neo4j+s:// protocols
  - Username and database name configuration
  - Secure password input with show/hide toggle
  - Connection status indicator with detailed error messages
  - Automatic codebase reindexing trigger on configuration changes

### Technical Implementation

- **React Components**
  - `Neo4jSettings.tsx` - Main settings component with form validation
  - `PasswordField.tsx` - Secure password input with edit/view modes
  - `ConnectionStatus.tsx` - Visual connection status indicator
- **Backend Message Handlers**
  - `setNeo4jPassword` - Secure password storage via SecretStorage API
  - `getNeo4jPasswordStatus` - Password existence verification
  - `neo4jConnectionTest` - Connection validation with 10s timeout
- **Security Features**
  - OS-level password encryption via VSCode SecretStorage
  - No password persistence in component state
  - Secure message passing between webview and extension
- **Testing Coverage**
  - 25+ tests for Neo4jSettings component
  - 20+ tests for PasswordField component
  - 25+ tests for ConnectionStatus component
  - Full coverage of validation, error handling, and user interactions

## 4.140.2

### Patch Changes

- [#4628](https://github.com/Kilo-Org/kilocode/pull/4628) [`ab0085e`](https://github.com/Kilo-Org/kilocode/commit/ab0085ea0ba6226f6adce508965302b101f60233) Thanks [@kiloconnect](https://github.com/apps/kiloconnect)! - Add GLM-4.7 model support to Z.ai provider

- [#4622](https://github.com/Kilo-Org/kilocode/pull/4622) [`25de94b`](https://github.com/Kilo-Org/kilocode/commit/25de94b22fc103ebb9747433444f3fef9a7eeeb8) Thanks [@alvinward](https://github.com/alvinward)! - Added model selection support below prompt for Z.ai

- [#4637](https://github.com/Kilo-Org/kilocode/pull/4637) [`b47994f`](https://github.com/Kilo-Org/kilocode/commit/b47994f0b6186490230c7eac01c5b9b75146d47a) Thanks [@chrarnoldus](https://github.com/chrarnoldus)! - Add MiniMax-M2.1 model for MiniMax provider

## 4.140.1

### Patch Changes

- [#4615](https://github.com/Kilo-Org/kilocode/pull/4615) [`6909640`](https://github.com/Kilo-Org/kilocode/commit/690964040770cd21248e1bea964c995d8620d8e8) Thanks [@marius-kilocode](https://github.com/marius-kilocode)! - Add Agent Manager terminal switching so existing session terminals are revealed when changing sessions.

- [#4586](https://github.com/Kilo-Org/kilocode/pull/4586) [`a3988cd`](https://github.com/Kilo-Org/kilocode/commit/a3988cd201f21f7b7616d68cb2bb2c0387dd91c2) Thanks [@marius-kilocode](https://github.com/marius-kilocode)! - Fix Agent Manager failing to start on macOS when launched from Finder/Spotlight

- [#4561](https://github.com/Kilo-Org/kilocode/pull/4561) [`3c18860`](https://github.com/Kilo-Org/kilocode/commit/3c188603cc4d8375be4abf6e1bb9217b64e9cd2b) Thanks [@jrf0110](https://github.com/jrf0110)! - Introduces AI contribution tracking so users can better understand agentic coding impact

- [#4526](https://github.com/Kilo-Org/kilocode/pull/4526) [`10b4d6c`](https://github.com/Kilo-Org/kilocode/commit/10b4d6c02f5b310dd6e44204fa40675ca4d3d99b) Thanks [@chrarnoldus](https://github.com/chrarnoldus)! - Reduce the incidence of read_file errors when using Claude models.

- [#4560](https://github.com/Kilo-Org/kilocode/pull/4560) [`5bdfe6b`](https://github.com/Kilo-Org/kilocode/commit/5bdfe6b9b68acf345e302791c15291c05a043204) Thanks [@crazyrabbit0](https://github.com/crazyrabbit0)! - chore: update Gemini Cli models and metadata

  - Added gemini-3-flash-preview model configuration.
  - Updated maxThinkingTokens for gemini-3-pro-preview to 32,768.
  - Reordered model definitions to prioritize newer versions.

- [#4596](https://github.com/Kilo-Org/kilocode/pull/4596) [`1c33884`](https://github.com/Kilo-Org/kilocode/commit/1c3388442bd9a06dcb8aed29431c138726dbedc8) Thanks [@hank9999](https://github.com/hank9999)! - Fix duplicate tool use in Anthropic

- [#4620](https://github.com/Kilo-Org/kilocode/pull/4620) [`ae6818b`](https://github.com/Kilo-Org/kilocode/commit/ae6818b5ea2d5504f9ee5eff9bdd963d9d82c51e) Thanks [@chrarnoldus](https://github.com/chrarnoldus)! - Fix duplictate tool call processing in Chutes, DeepInfra, LiteLLM and xAI providers.

- [#4597](https://github.com/Kilo-Org/kilocode/pull/4597) [`e2bb5c1`](https://github.com/Kilo-Org/kilocode/commit/e2bb5c1891b6319954b46fcca3b35807fc1f8f90) Thanks [@marius-kilocode](https://github.com/marius-kilocode)! - Fix Agent Manager not showing error when CLI is misconfigured. When the CLI exits with a configuration error (e.g., missing kilocodeToken), the extension now detects this and shows an error popup with options to run `kilocode auth` or `kilocode config`.

- [#4590](https://github.com/Kilo-Org/kilocode/pull/4590) [`f2cc065`](https://github.com/Kilo-Org/kilocode/commit/f2cc0657870ae77a5720a872c9cd11b8315799b7) Thanks [@kiloconnect](https://github.com/apps/kiloconnect)! - feat: add session_title_generated event emission to CLI

- [#4523](https://github.com/Kilo-Org/kilocode/pull/4523) [`e259b04`](https://github.com/Kilo-Org/kilocode/commit/e259b04037c71a9bdd9e53c174b70a975e772833) Thanks [@markijbema](https://github.com/markijbema)! - Add chat autocomplete telemetry

- [#4582](https://github.com/Kilo-Org/kilocode/pull/4582) [`3de2547`](https://github.com/Kilo-Org/kilocode/commit/3de254757049d08d3c0c100768acc564d6de4888) Thanks [@catrielmuller](https://github.com/catrielmuller)! - Jetbrains - Autocomplete Telemetry

- [#4488](https://github.com/Kilo-Org/kilocode/pull/4488) [`f7c3715`](https://github.com/Kilo-Org/kilocode/commit/f7c3715b4b7fea9fcd363d12bfb9467e9f169729) Thanks [@lifesized](https://github.com/lifesized)! - fix(ollama): fix model not found error and context window display

## 4.140.0

### Minor Changes

- [#4538](https://github.com/Kilo-Org/kilocode/pull/4538) [`459b95c`](https://github.com/Kilo-Org/kilocode/commit/459b95cbf78de10fce597e3467120e52020d1114) Thanks [@chrarnoldus](https://github.com/chrarnoldus)! - Added gemini-3-flash-preview model

### Patch Changes

- [#4530](https://github.com/Kilo-Org/kilocode/pull/4530) [`782347e`](https://github.com/Kilo-Org/kilocode/commit/782347e9ed6cbaf42c88285cb8576801cd178d96) Thanks [@alvinward](https://github.com/alvinward)! - Add GLM-4.6V model support for z.ai provider

- [#4509](https://github.com/Kilo-Org/kilocode/pull/4509) [`8a9fddd`](https://github.com/Kilo-Org/kilocode/commit/8a9fddd8311633c3085516ab6255bb027aff81d6) Thanks [@kevinvandijk](https://github.com/kevinvandijk)! - Include changes from Roo Code v3.36.6

  - Add tool alias support for model-specific tool customization, allowing users to configure how tools are presented to different AI models (PR #9989 by @daniel-lxs)
  - Sanitize MCP server and tool names for API compatibility, ensuring special characters don't cause issues with API calls (PR #10054 by @daniel-lxs)
  - Improve auto-approve timer visibility in follow-up suggestions for better user awareness of pending actions (PR #10048 by @brunobergher)
  - Fix: Cancel auto-approval timeout when user starts typing, preventing accidental auto-approvals during user interaction (PR #9937 by @roomote)
  - Add WorkspaceTaskVisibility type for organization cloud settings to support team visibility controls (PR #10020 by @roomote)
  - Fix: Extract raw error message from OpenRouter metadata for clearer error reporting (PR #10039 by @daniel-lxs)
  - Fix: Show tool protocol dropdown for LiteLLM provider, restoring missing configuration option (PR #10053 by @daniel-lxs)
  - Add: GPT-5.2 model to openai-native provider (PR #10024 by @hannesrudolph)
  - Fix: Handle empty Gemini responses and reasoning loops to prevent infinite retries (PR #10007 by @hannesrudolph)
  - Fix: Add missing tool_result blocks to prevent API errors when tool results are expected (PR #10015 by @daniel-lxs)
  - Fix: Filter orphaned tool_results when more results than tool_uses to prevent message validation errors (PR #10027 by @daniel-lxs)
  - Fix: Add general API endpoints for Z.ai provider (#9879 by @richtong, PR #9894 by @roomote)
  - Remove: Deprecated list_code_definition_names tool (PR #10005 by @hannesrudolph)
  - Add error details modal with on-demand display for improved error visibility when debugging issues (PR #9985 by @roomote)
  - Fix: Prevent premature rawChunkTracker clearing for MCP tools, improving reliability of MCP tool streaming (PR #9993 by @daniel-lxs)
  - Fix: Filter out 429 rate limit errors from API error telemetry for cleaner metrics (PR #9987 by @daniel-lxs)
  - Fix: Correct TODO list display order in chat view to show items in proper sequence (PR #9991 by @roomote)
  - Refactor: Unified context-management architecture with improved UX for better context control (PR #9795 by @hannesrudolph)
  - Add new `search_replace` native tool for single-replacement operations with improved editing precision (PR #9918 by @hannesrudolph)
  - Streaming tool stats and token usage throttling for better real-time feedback during generation (PR #9926 by @hannesrudolph)
  - Add versioned settings support with minPluginVersion gating for Roo provider (PR #9934 by @hannesrudolph)
  - Make Architect mode save plans to `/plans` directory and gitignore it (PR #9944 by @brunobergher)
  - Add ability to save screenshots from the browser tool (PR #9963 by @mrubens)
  - Refactor: Decouple tools from system prompt for cleaner architecture (PR #9784 by @daniel-lxs)
  - Update DeepSeek models to V3.2 with new pricing (PR #9962 by @hannesrudolph)
  - Add minimal and medium reasoning effort levels for Gemini models (PR #9973 by @hannesrudolph)
  - Update xAI models catalog with latest model options (PR #9872 by @hannesrudolph)
  - Add DeepSeek V3-2 support for Baseten provider (PR #9861 by @AlexKer)
  - Tweaks to Baseten model definitions for better defaults (PR #9866 by @mrubens)
  - Fix: Add xhigh reasoning effort support for gpt-5.1-codex-max (#9891 by @andrewginns, PR #9900 by @andrewginns)
  - Fix: Add Kimi, MiniMax, and Qwen model configurations for Bedrock (#9902 by @jbearak, PR #9905 by @app/roomote)
  - Configure tool preferences for xAI models (PR #9923 by @hannesrudolph)
  - Default to using native tools when supported on OpenRouter (PR #9878 by @mrubens)
  - Fix: Exclude apply_diff from native tools when diffEnabled is false (#9919 by @denis-kudelin, PR #9920 by @app/roomote)
  - Fix: Always show tool protocol selector for openai-compatible provider (#9965 by @bozoweed, PR #9966 by @hannesrudolph)
  - Fix: Respect explicit supportsReasoningEffort array values for proper model configuration (PR #9970 by @hannesrudolph)
  - Add timeout configuration to OpenAI Compatible Provider Client (PR #9898 by @dcbartlett)
  - Revert default tool protocol change from xml to native for stability (PR #9956 by @mrubens)
  - Improve OpenAI error messages to be more useful for debugging (PR #9639 by @mrubens)
  - Better error logs for parseToolCall exceptions (PR #9857 by @cte)
  - Improve cloud job error logging for RCC provider errors (PR #9924 by @cte)
  - Fix: Display actual API error message instead of generic text on retry (PR #9954 by @hannesrudolph)
  - Add API error telemetry to OpenRouter provider for better diagnostics (PR #9953 by @daniel-lxs)
  - Fix: Sanitize removed/invalid API providers to prevent infinite loop (PR #9869 by @hannesrudolph)
  - Fix: Use foreground color for context-management icons (PR #9912 by @hannesrudolph)
  - Fix: Suppress 'ask promise was ignored' error in handleError (PR #9914 by @daniel-lxs)
  - Fix: Process finish_reason to emit tool_call_end events properly (PR #9927 by @daniel-lxs)
  - Fix: Add finish_reason processing to xai.ts provider (PR #9929 by @daniel-lxs)
  - Fix: Validate and fix tool_result IDs before API requests (PR #9952 by @daniel-lxs)
  - Fix: Return undefined instead of 0 for disabled API timeout (PR #9960 by @hannesrudolph)
  - Stop making unnecessary count_tokens requests for better performance (PR #9884 by @mrubens)
  - Refactor: Consolidate ThinkingBudget components and fix disable handling (PR #9930 by @hannesrudolph)
  - Forbid time estimates in architect mode for more focused planning (PR #9931 by @app/roomote

- [#4568](https://github.com/Kilo-Org/kilocode/pull/4568) [`b1702cd`](https://github.com/Kilo-Org/kilocode/commit/b1702cd1c3119a89c96edf23c388b84135b8cbd3) Thanks [@marius-kilocode](https://github.com/marius-kilocode)! - Remove redundant "New Agent" and "Refresh messages" buttons from agent manager session detail header.

- [#4228](https://github.com/Kilo-Org/kilocode/pull/4228) [`a128228`](https://github.com/Kilo-Org/kilocode/commit/a128228b3649924ad1fd88d040a79c6963a250bd) Thanks [@lambertjosh](https://github.com/lambertjosh)! - Change the default value of auto-approval for reading outside workspace to false

## 4.139.0

### Minor Changes

- [#4481](https://github.com/Kilo-Org/kilocode/pull/4481) [`61c951c`](https://github.com/Kilo-Org/kilocode/commit/61c951c0ad11d60b07406338b6053cc5d1f01cac) Thanks [@marius-kilocode](https://github.com/marius-kilocode)! - Improved command output rendering in Agent Manager with new CommandExecutionBlock component that displays terminal output with status indicators, collapsible output sections, and proper escape sequence handling.

- [#4483](https://github.com/Kilo-Org/kilocode/pull/4483) [`fd639ab`](https://github.com/Kilo-Org/kilocode/commit/fd639ab78aa4ab62ea2d120bd2844d1160b20067) Thanks [@marius-kilocode](https://github.com/marius-kilocode)! - Add branch picker to Agent Manager for selecting base branch in worktree mode

- [#4539](https://github.com/Kilo-Org/kilocode/pull/4539) [`62a0241`](https://github.com/Kilo-Org/kilocode/commit/62a02418cafa23a733f92a9e14ba904552acdcc4) Thanks [@brianc](https://github.com/brianc)! - Improve managed indexer error handling & backoff.

### Patch Changes

- [#4512](https://github.com/Kilo-Org/kilocode/pull/4512) [`f979b56`](https://github.com/Kilo-Org/kilocode/commit/f979b56b6a631eeeb671caaca276316b63b5fb82) Thanks [@hassoncs](https://github.com/hassoncs)! - Add a tooltip explaining why speech-to-text may be unavailable

- [#4424](https://github.com/Kilo-Org/kilocode/pull/4424) [`cd0cd88`](https://github.com/Kilo-Org/kilocode/commit/cd0cd8833f0e892cc2f1c96bb24ede6254cf12c9) Thanks [@markijbema](https://github.com/markijbema)! - Added a snooze for autocomplete in the settings

- [#4519](https://github.com/Kilo-Org/kilocode/pull/4519) [`a9fd203`](https://github.com/Kilo-Org/kilocode/commit/a9fd2038ecb60fd799d164bcf1b2e4393302d15a) Thanks [@chrarnoldus](https://github.com/chrarnoldus)! - Fix text.startsWith is not a function crash

- [#4536](https://github.com/Kilo-Org/kilocode/pull/4536) [`51f4774`](https://github.com/Kilo-Org/kilocode/commit/51f4774adcb90778826e00e9a50c45bb7bf11bc8) Thanks [@kevinvandijk](https://github.com/kevinvandijk)! - Fix image generation handler not using Kilo Gateway properly

- [#4491](https://github.com/Kilo-Org/kilocode/pull/4491) [`823b86f`](https://github.com/Kilo-Org/kilocode/commit/823b86f196868f12efc60e5acb9b385d014bc644) Thanks [@markijbema](https://github.com/markijbema)! - Prevent autocomplete from showing suggestions duplicating the previous or next line

- [#4531](https://github.com/Kilo-Org/kilocode/pull/4531) [`9413d73`](https://github.com/Kilo-Org/kilocode/commit/9413d730814d88ac67c88e6eec9a66c2c701613e) Thanks [@chrarnoldus](https://github.com/chrarnoldus)! - Fix duplicate tool processing in OpenAI-compatible provider

- [#4533](https://github.com/Kilo-Org/kilocode/pull/4533) [`20b2c29`](https://github.com/Kilo-Org/kilocode/commit/20b2c29140f401ac65d437e35c52b48329e5f52d) Thanks [@mcowger](https://github.com/mcowger)! - Add gemini-3-flash-preview model configuration to vertex models

- [#4520](https://github.com/Kilo-Org/kilocode/pull/4520) [`8342fc4`](https://github.com/Kilo-Org/kilocode/commit/8342fc4fbdc2a83601c706e734ef3377ef114f98) Thanks [@chrarnoldus](https://github.com/chrarnoldus)! - Normalize line endings in search and replace tool

## 4.138.0

### Minor Changes

- [#4472](https://github.com/Kilo-Org/kilocode/pull/4472) [`d2e82a1`](https://github.com/Kilo-Org/kilocode/commit/d2e82a115afac0467787db63d51c696d08ee102d) Thanks [@marius-kilocode](https://github.com/marius-kilocode)! - Interactive agent manager worktree sessions now start without auto-execution, allowing to manually click "Finish to Branch".

- [#4428](https://github.com/Kilo-Org/kilocode/pull/4428) [`8394da8`](https://github.com/Kilo-Org/kilocode/commit/8394da8715fae4eacf416301885eeee840456700) Thanks [@iscekic](https://github.com/iscekic)! - add parent session id when creating a session

### Patch Changes

- [#4425](https://github.com/Kilo-Org/kilocode/pull/4425) [`6f70448`](https://github.com/Kilo-Org/kilocode/commit/6f70448300567b7ded997231b049346aa2718d92) Thanks [@marius-kilocode](https://github.com/marius-kilocode)! - Share kilocode extension authentication directly with agent manager

- [#4475](https://github.com/Kilo-Org/kilocode/pull/4475) [`625561f`](https://github.com/Kilo-Org/kilocode/commit/625561f11669d6458729b01dcbe630a551ecfe04) Thanks [@jrf0110](https://github.com/jrf0110)! - Fixes issue on Windows where kilo code would spawn many cmd.exe windows.

- [#4376](https://github.com/Kilo-Org/kilocode/pull/4376) [`3971db3`](https://github.com/Kilo-Org/kilocode/commit/3971db3215d7339514031e094e87e9c889c9372d) Thanks [@sebastiand-cerebras](https://github.com/sebastiand-cerebras)! - Add Cerebras integration header with "kilocode" identifier to all API requests.

- [#4447](https://github.com/Kilo-Org/kilocode/pull/4447) [`0022305`](https://github.com/Kilo-Org/kilocode/commit/0022305558d71957aeb7468a0e8e3ed829997f93) Thanks [@EamonNerbonne](https://github.com/EamonNerbonne)! - Provide a few tips for when an LLM gets stuck in a loop

- [#4456](https://github.com/Kilo-Org/kilocode/pull/4456) [`85a2e31`](https://github.com/Kilo-Org/kilocode/commit/85a2e31a331157f27bfe1c9823e3326ae58779c6) Thanks [@iscekic](https://github.com/iscekic)! - correctly handle deleted tasks

- [#4476](https://github.com/Kilo-Org/kilocode/pull/4476) [`ea9413d`](https://github.com/Kilo-Org/kilocode/commit/ea9413d4fb01846b1aeb872652c92fa8e844d35f) Thanks [@hassoncs](https://github.com/hassoncs)! - Remove check for ffmpeg if the STT experiment is disabled

## 4.137.0

### Minor Changes

- [#4394](https://github.com/Kilo-Org/kilocode/pull/4394) [`01b968b`](https://github.com/Kilo-Org/kilocode/commit/01b968ba4635a162c787169bffe1809fc1ab973a) Thanks [@hassoncs](https://github.com/hassoncs)! - Add Speech-To-Text experiment for the chat input powered by ffmpeg and the OpenAI Whisper API

- [#4388](https://github.com/Kilo-Org/kilocode/pull/4388) [`af93318`](https://github.com/Kilo-Org/kilocode/commit/af93318e3648c235721ba58fe9caab9429608241) Thanks [@iscekic](https://github.com/iscekic)! - send org id and last mode with session data

### Patch Changes

- [#4412](https://github.com/Kilo-Org/kilocode/pull/4412) [`d56879c`](https://github.com/Kilo-Org/kilocode/commit/d56879c58f65c8da1419c9840816720279bec4e6) Thanks [@quantizoor](https://github.com/quantizoor)! - Added support for xhigh reasoning effort

- [#4415](https://github.com/Kilo-Org/kilocode/pull/4415) [`5e670d1`](https://github.com/Kilo-Org/kilocode/commit/5e670d14047054a2f92a9057391286402076b5a5) Thanks [@kevinvandijk](https://github.com/kevinvandijk)! - Fix: bottom controls no longer overlap with create mode button

- [#4416](https://github.com/Kilo-Org/kilocode/pull/4416) [`026da65`](https://github.com/Kilo-Org/kilocode/commit/026da65fdb9f16d23216197412e06ca2ed208639) Thanks [@marius-kilocode](https://github.com/marius-kilocode)! - fix: resolve AbortSignal memory leak in CLI (MaxListenersExceededWarning)

- [#4392](https://github.com/Kilo-Org/kilocode/pull/4392) [`73681e9`](https://github.com/Kilo-Org/kilocode/commit/73681e9002af4c5aa3fec3bc2a86e8008dc926af) Thanks [@markijbema](https://github.com/markijbema)! - Split autocomplete suggestion in current line and next lines in most cases

- [#4426](https://github.com/Kilo-Org/kilocode/pull/4426) [`fdc0c0a`](https://github.com/Kilo-Org/kilocode/commit/fdc0c0a07d49c4726997121ad540d6c855965e7b) Thanks [@kevinvandijk](https://github.com/kevinvandijk)! - Fix API request errors with MCP functions incompatible with OpenAI strict mode

- [#4373](https://github.com/Kilo-Org/kilocode/pull/4373) [`a80ec02`](https://github.com/Kilo-Org/kilocode/commit/a80ec02db75c061163100ce91d099f4fd3846a99) Thanks [@marius-kilocode](https://github.com/marius-kilocode)! - Handle different cli authentication errors when using agent manager

## 4.136.0