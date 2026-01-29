# OpenAI + LiteLLM Integration Map for AlfaCode assistant Agent

Purpose
- Provide a precise, code-backed description of how the current agent integrates with OpenAI (openai and openai-native providers).
- Specify the exact LiteLLM backend contract required to work with the current agent (AlfaCode assistant).
- Include enough field-level detail to feed Codex to implement a compatible LiteLLM backend.

Scope and terminology
- Agent = Task + API handler + tool execution pipeline in the extension core.
- Provider = API handler selected by apiProvider in ProviderSettings.
- OpenAI provider = Chat Completions API compatible handler (OpenAiHandler).
- OpenAI Native provider = OpenAI Responses API handler (OpenAiNativeHandler).
- LiteLLM provider = OpenAI-compatible Chat Completions proxy (LiteLLMHandler).
- Internal message format = Anthropic-style MessageParam with content blocks, used throughout Task.

1) High-level data flow (UI -> Core -> Provider -> Core -> UI)
1. User input in webview UI.
2. ClineProvider creates Task with ProviderSettings (selected profile).
3. Task builds system prompt + conversation history + tool definitions.
4. Task calls api.createMessage() on the selected provider.
5. Provider streams ApiStreamChunk values (text, reasoning, tool_call_partial, usage).
6. Task processes chunks, updates UI messages (say: text, say: reasoning), parses tool calls and executes tools.
7. Task stores assistant message + reasoning in apiConversationHistory for the next turn.

Key code references:
- Task streaming loop: src/core/task/Task.ts:2600+
- ApiHandler interface + buildApiHandler: src/api/index.ts:9
- Tool protocol selection: src/utils/resolveToolProtocol.ts:17

2) Provider settings (OpenAI, OpenAI Native, LiteLLM, reasoning)
ProviderSettings fields used by OpenAI/OpenAI Native/LiteLLM:
- openai:
  - openAiApiKey, openAiBaseUrl, openAiModelId
  - openAiLegacyFormat, openAiR1FormatEnabled
  - openAiUseAzure, azureApiVersion
  - openAiStreamingEnabled
  - openAiHeaders (custom headers)
- openai-native:
  - openAiNativeApiKey, openAiNativeBaseUrl
  - openAiNativeServiceTier (default, flex, priority)
- litellm:
  - litellmBaseUrl, litellmApiKey, litellmModelId
  - litellmUsePromptCache
- reasoning:
  - enableReasoningEffort (boolean)
  - reasoningEffort (disable|none|minimal|low|medium|high|xhigh)
  - modelMaxThinkingTokens (budget-based reasoning)
  - verbosity (low|medium|high)

Source references:
- Provider settings schema: packages/types/src/provider-settings.ts:204,294,347,425
- Reasoning effort enums: packages/types/src/model.ts:5

3) Internal message format and OpenAI conversion
Task uses Anthropic-style messages internally, then converts to OpenAI format for Chat Completions:
- User messages can contain text, image, and tool_result blocks.
- Assistant messages can contain text and tool_use blocks.
- Conversion to OpenAI (convertToOpenAiMessages):
  - user tool_result -> OpenAI role=tool, tool_call_id, content (string)
  - assistant tool_use -> OpenAI tool_calls with function.name + function.arguments (JSON string)
  - images -> content parts with type "image_url" and image_url.url (base64 or URL)
  - reasoning_details (Gemini 3 style) preserved as additional property

Source references:
- Message conversion: src/api/transform/openai-format.ts:4

4) OpenAI provider (Chat Completions) behavior
Handler: OpenAiHandler (src/api/providers/openai.ts)

Auth and base URL
- baseURL defaults to https://api.openai.com/v1
- Azure OpenAI:
  - AzureOpenAI client when host ends with .azure.com or openAiUseAzure = true
  - apiVersion from azureApiVersion (default in types)
- Azure AI Inference:
  - uses OpenAI client with "api-version" query param and a special path
- Custom headers:
  - DEFAULT_HEADERS (HTTP-Referer, X-Title, X-KiloCode-Version, User-Agent)
  - plus openAiHeaders override/add

Request building (streaming path)
- model = openAiModelId
- messages:
  - default: system message + convertToOpenAiMessages()
  - openAiLegacyFormat or ark (volces) -> convertToSimpleMessages()
  - deepseekReasoner or openAiR1FormatEnabled -> convertToR1Format()
- stream = true
- stream_options.include_usage = true (except Grok/XAI)
- temperature:
  - modelTemperature (or DEEP_SEEK default) unless model disables temperature
- reasoning effort:
  - getModelParams() -> getOpenAiReasoning() -> reasoning_effort
  - injected via "...(reasoning && reasoning)" into request
- tools/tool_choice/parallel_tool_calls:
  - included only when toolProtocol is native
- max tokens:
  - if includeMaxTokens is true, use max_completion_tokens

Special path for o1/o3/o4 (handleO3FamilyMessage)
- Uses developer role for system prompt.
- Forces reasoning_effort from modelInfo.
- Omits temperature.
- Uses max_completion_tokens for GPT-5, max_tokens otherwise.

Streaming response handling
- text:
  - chunk.choices[0].delta.content -> ApiStreamChunk { type: "text" }
- reasoning:
  - delta.reasoning_content or delta.reasoning -> ApiStreamChunk { type: "reasoning" }
  - <think>...</think> via XmlMatcher also mapped to reasoning
- tool calls:
  - delta.tool_calls -> ApiStreamChunk { type: "tool_call_partial", index, id, name, arguments }
- usage:
  - chunk.usage captured and emitted as ApiStreamChunk { type: "usage" }

Non-streaming response handling
- message.reasoning (if present) -> reasoning chunk
- message.content -> text chunk
- message.tool_calls -> tool_call chunks
- usage -> ApiStreamChunk { type: "usage" }

Source references:
- OpenAI handler: src/api/providers/openai.ts:32
- O3 family handling: src/api/providers/openai.ts:365
- getOpenAiModels for model list: src/api/providers/openai.ts:543
- DEFAULT_HEADERS: src/api/providers/constants.ts:4

5) OpenAI Native provider (Responses API) behavior
Handler: OpenAiNativeHandler (src/api/providers/openai-native.ts)

Auth and base URL
- baseURL default: https://api.openai.com
- apiKey: openAiNativeApiKey
- uses OpenAI SDK responses.create() with fallback to SSE fetch

Request building (Responses API)
- model: openAiNative model id
- input: array of items (user/assistant messages + tool calls + tool results + reasoning items)
- stream: true
- store: false (stateless)
- instructions: system prompt (system role not used in input for Responses API)
- temperature: only if supportsTemperature
- max_output_tokens: from getModelParams()
- service_tier: openAiNativeServiceTier if supported by model tiers
- prompt_cache_retention: "24h" when model supports prompt cache retention
- tools/tool_choice/parallel_tool_calls: only when toolProtocol is native
- reasoning:
  - effort: from getReasoningEffort()
  - summary: "auto" if enableResponsesReasoningSummary is true
- include: ["reasoning.encrypted_content"] only when reasoningEffort is set

Input item mapping (formatFullConversation)
- user text -> { role: "user", content: [{ type: "input_text", text }] }
- user image -> { type: "input_image", image_url: "data:..." or URL }
- tool_result -> { type: "function_call_output", call_id, output }
- assistant text -> { role: "assistant", content: [{ type: "output_text", text }] }
- assistant tool_use -> { type: "function_call", call_id, name, arguments }
- reasoning history item -> { type: "reasoning", encrypted_content, id?, summary? }

Streaming response handling (processEvent)
- response.output_text.delta -> text chunk
- response.reasoning*.delta -> reasoning chunk
- response.tool_call_arguments.delta -> tool_call_partial chunk
- response.completed/response.done -> usage chunk + capture response.id, response.output, response.service_tier
- response.output_item.done (tool_call) -> tool_call chunk
- response.refusal.delta -> text chunk prefixed with "[Refusal]"

Encrypted reasoning persistence
- On completion, first reasoning item with encrypted_content is captured.
- Task stores encrypted reasoning in conversation history.
- Next request includes reasoning item in input (stateless continuity).

Source references:
- OpenAI native handler: src/api/providers/openai-native.ts:29
- buildRequestBody: src/api/providers/openai-native.ts:179
- formatFullConversation: src/api/providers/openai-native.ts:363
- processEvent: src/api/providers/openai-native.ts:1042

6) Reasoning effort end-to-end
Settings -> model params -> provider request -> UI

Where the setting lives
- ProviderSettings.enableReasoningEffort (boolean)
- ProviderSettings.reasoningEffort (enum: disable|none|minimal|low|medium|high|xhigh)
- ProviderSettings.modelMaxThinkingTokens (budget-based reasoning)

Resolution logic
- shouldUseReasoningEffort() and shouldUseReasoningBudget() in src/shared/api.ts
- getModelParams() in src/api/transform/model-params.ts
- getOpenAiReasoning() in src/api/transform/reasoning.ts

OpenAI (Chat Completions)
- reasoning_effort included when shouldUseReasoningEffort() is true.
- For o1/o3/o4: reasoning_effort sourced from modelInfo (custom model info).

OpenAI Native (Responses API)
- getReasoningEffort() uses options.reasoningEffort or model.info.reasoningEffort.
- Does not check enableReasoningEffort; model defaults can still enable reasoning.
- When present, request includes reasoning.effort and include: reasoning.encrypted_content.

UI output
- reasoning chunks are aggregated and sent as say: "reasoning" (partial updates).
- reasoning is stored in history:
  - plain text reasoning stored as a "reasoning" content block
  - encrypted reasoning stored separately and used only for OpenAI Native requests

Source references:
- reasoning selection: src/shared/api.ts:52
- reasoning mapping: src/api/transform/reasoning.ts:115
- model params: src/api/transform/model-params.ts:48
- Task reasoning display: src/core/task/Task.ts:2680

7) Tool calling (native vs XML) and how chunks are processed
Tool protocol selection
- resolveToolProtocol(providerSettings, modelInfo)
- native is used only when model supports native tools
- fallback to XML otherwise

Native tool request
- buildNativeToolsArray() builds OpenAI tool definitions
- providers include tools only when toolProtocol is native
- tool_choice = "auto" by default
- parallel_tool_calls usually false (disabled)

Native tool response
- Provider emits tool_call_partial chunks (index, id, name, arguments)
- Task uses NativeToolCallParser:
  - processRawChunk() -> tool_call_start / tool_call_delta / tool_call_end
  - parseStreamingChunk() does partial JSON parsing
  - finalizeStreamingToolCall() builds ToolUse for execution

XML tool response
- Assistant text contains XML tool calls
- AssistantMessageParser extracts tool calls from text chunks

Source references:
- resolveToolProtocol: src/utils/resolveToolProtocol.ts:17
- TOOL_PROTOCOL enum: packages/types/src/tool.ts:69
- NativeToolCallParser: src/core/assistant-message/NativeToolCallParser.ts:39
- buildNativeToolsArray: src/core/task/build-tools.ts:22

8) Token usage and caching
OpenAI Chat Completions
- usage.prompt_tokens and usage.completion_tokens emitted in stream
- cache tokens:
  - cache_creation_input_tokens
  - cache_read_input_tokens

OpenAI Native (Responses API)
- usage.input_tokens / output_tokens
- input_tokens_details.cached_tokens / cache_miss_tokens
- output_tokens_details.reasoning_tokens (optional)
- cost computed via calculateApiCostOpenAI()

LiteLLM provider usage handling
- accepts multiple possible cache field names:
  - cache_creation_input_tokens or prompt_cache_miss_tokens
  - prompt_tokens_details.cached_tokens or cache_read_input_tokens or prompt_cache_hit_tokens

Source references:
- ApiStream usage fields: src/api/transform/stream.ts:27
- LiteLLM usage mapping: src/api/providers/lite-llm.ts:166
- OpenAI native usage normalization: src/api/providers/openai-native.ts:50

9) LiteLLM backend contract (what must be implemented)
The current LiteLLM handler expects OpenAI-compatible Chat Completions plus a model list endpoint.

9.1 Model list endpoint (required)
HTTP
- GET {baseUrl}/v1/model/info
- Authorization: Bearer {litellmApiKey}

Model list fields (agent usage + limits hints)
| Field | Type | Required | Notes |
| --- | --- | --- | --- |
| data[].model_name | string | yes | Model id used by the agent. |
| data[].litellm_params.model | string | yes | Required or the model is ignored. |
| data[].model_info.max_output_tokens or max_tokens | number | yes | Output limit used for max_tokens or max_completion_tokens. |
| data[].model_info.max_input_tokens | number | yes | Context window limit. |
| data[].model_info.supports_prompt_caching | boolean | no | Enables cache_control fields. |
| data[].model_info.supports_vision | boolean | no | Enables image content. |
| data[].model_info.input_cost_per_token | number | no | Cost display (per token). |
| data[].model_info.output_cost_per_token | number | no | Cost display (per token). |
| data[].model_info.cache_creation_input_token_cost | number | no | Cache write cost (per token). |
| data[].model_info.cache_read_input_token_cost | number | no | Cache read cost (per token). |
| data[].model_info.supports_reasoning_effort | boolean or array | no | Enables reasoning_effort in UI/requests. |
| data[].model_info.reasoning_effort | string | no | Default reasoning effort when UI is unset. |
| data[].model_info.required_reasoning_effort | boolean | no | Marks reasoning effort as required by the model. |
| data[].model_info.rate_limits | object | no | Optional per-model limits/remaining (see 9.4). |

Response shape (required fields)
{
  "data": [
    {
      "model_name": "codex-foo",
      "model_info": {
        "max_output_tokens": 8192,
        "max_tokens": 8192,
        "max_input_tokens": 200000,
        "supports_vision": true,
        "supports_prompt_caching": true,
        "input_cost_per_token": 0.000001,
        "output_cost_per_token": 0.000002,
        "cache_creation_input_token_cost": 0.0000001,
        "cache_read_input_token_cost": 0.00000005
      },
      "litellm_params": {
        "model": "provider-specific-id"
      }
    }
  ]
}

Codex example (/v1/model/info)
{
  "data": [
    {
      "model_name": "gpt-5.1-codex-max",
      "model_info": {
        "max_output_tokens": 128000,
        "max_input_tokens": 400000,
        "supports_vision": true,
        "supports_prompt_caching": true,
        "supports_reasoning_effort": ["low", "medium", "high", "xhigh"],
        "reasoning_effort": "xhigh",
        "input_cost_per_token": 0.00000125,
        "output_cost_per_token": 0.00001,
        "cache_read_input_token_cost": 0.000000125
      },
      "litellm_params": {
        "model": "openai/gpt-5.1-codex-max"
      }
    }
  ]
}

Notes
- model_name becomes the modelId used by the agent.
- litellm_params.model must be present or the model is ignored.
- supports_prompt_caching toggles whether the agent sends cache_control fields.
- supports_reasoning_effort / reasoning_effort let the UI expose reasoning effort and pass reasoning_effort in requests.
- pricing fields are optional but used for cost display.
- rate_limits is optional and not consumed by the agent today.

Source references:
- LiteLLM model fetcher: src/api/providers/fetchers/litellm.ts:14

9.2 Chat Completions endpoint (required)
HTTP
- POST {baseUrl}/v1/chat/completions
- Authorization: Bearer {litellmApiKey}
- Content-Type: application/json
- Accept: text/event-stream (for streaming)

Request fields used by the agent
{
  "model": "codex-foo",
  "messages": [
    { "role": "system", "content": "system prompt" },
    { "role": "user", "content": "user message" }
  ],
  "stream": true,
  "stream_options": { "include_usage": true },
  "temperature": 0,
  "max_tokens": 8192,
  "max_completion_tokens": 8192,
  "tools": [
    {
      "type": "function",
      "function": { "name": "read_file", "description": "...", "parameters": { ... } }
    }
  ],
  "tool_choice": "auto",
  "parallel_tool_calls": false
}

Notes
- messages[].content can be a string OR an array of content parts:
  - { type: "text", text: "..." }
  - { type: "image_url", image_url: { url: "data:image/png;base64,..." } }
  - content parts may include cache_control: { type: "ephemeral" }
- max_completion_tokens is used for GPT-5 models (detected by name).
- If tools are present, tool call streaming must follow OpenAI format.

Streaming response (SSE, OpenAI format)
data: {
  "choices": [
    { "delta": { "content": "..." }, "index": 0 }
  ]
}

Tool calls (streaming)
data: {
  "choices": [
    {
      "delta": {
        "tool_calls": [
          {
            "index": 0,
            "id": "call_abc",
            "type": "function",
            "function": { "name": "read_file", "arguments": "{\"path\":\"...\"}" }
          }
        ]
      }
    }
  ]
}

Final usage chunk (include_usage=true)
data: {
  "choices": [ { "delta": {} } ],
  "usage": {
    "prompt_tokens": 123,
    "completion_tokens": 456,
    "prompt_tokens_details": { "cached_tokens": 10 },
    "cache_creation_input_tokens": 5
  }
}

data: [DONE]

Non-streaming response (if stream=false)
{
  "choices": [
    {
      "message": {
        "content": "final answer",
        "tool_calls": [ ... ]
      }
    }
  ],
  "usage": { "prompt_tokens": 123, "completion_tokens": 456 }
}

9.2.1 Codex JSON templates (LiteLLM Chat Completions)
Codex request (tools + reasoning effort)
{
  "model": "gpt-5.1-codex-max",
  "messages": [
    { "role": "system", "content": "system prompt" },
    { "role": "user", "content": "implement foo()" }
  ],
  "stream": true,
  "stream_options": { "include_usage": true },
  "temperature": 0,
  "max_completion_tokens": 8192,
  "reasoning_effort": "medium",
  "tools": [
    {
      "type": "function",
      "function": { "name": "read_file", "description": "...", "parameters": { ... } }
    }
  ],
  "tool_choice": "auto",
  "parallel_tool_calls": false
}

Codex streaming response (reasoning + tool calls + text)
data: {
  "choices": [
    { "delta": { "reasoning_content": "Analyzing the codebase..." }, "index": 0 }
  ]
}

data: {
  "choices": [
    {
      "delta": {
        "tool_calls": [
          {
            "index": 0,
            "id": "call_abc",
            "type": "function",
            "function": { "name": "read_file", "arguments": "{\"path\":\"src/foo.ts\"}" }
          }
        ]
      }
    }
  ]
}

data: {
  "choices": [
    { "delta": { "content": "Here is the update..." }, "index": 0 }
  ]
}

data: [DONE]

Codex non-streaming response
{
  "choices": [
    {
      "message": {
        "content": "final answer",
        "reasoning": "Brief reasoning text (optional)",
        "tool_calls": [
          {
            "id": "call_abc",
            "type": "function",
            "function": { "name": "read_file", "arguments": "{\"path\":\"src/foo.ts\"}" }
          }
        ]
      }
    }
  ],
  "usage": { "prompt_tokens": 123, "completion_tokens": 456 }
}

Notes
- reasoning_effort is only sent when the model supports reasoning effort and the UI has it enabled.
- LiteLLM may emit reasoning in delta.reasoning_content or delta.reasoning; both are accepted by the handler.

9.3 Error handling
- Return OpenAI-style error JSON with HTTP status codes.
- The client surfaces error.message to the UI; include useful text.

9.4 Limits/remaining (optional, keep in both tables)
If you want to expose limits/remaining to the agent or external logs, add a per-model
rate_limits object and/or standard rate limit headers. The agent does not parse these
today, but they are useful for debugging and quota visibility.

rate_limits object (recommended for /v1/model/info)
| Field | Type | Example | Meaning |
| --- | --- | --- | --- |
| rate_limits.limit_requests | number | 60 | Request limit per window. |
| rate_limits.remaining_requests | number | 12 | Remaining requests in window. |
| rate_limits.limit_tokens | number | 120000 | Token limit per window. |
| rate_limits.remaining_tokens | number | 24000 | Remaining tokens in window. |
| rate_limits.reset_seconds | number | 45 | Window reset time (seconds). |

Rate limit headers (OpenAI-style, optional)
| Header | Meaning |
| --- | --- |
| x-ratelimit-limit-requests | Request limit per window. |
| x-ratelimit-remaining-requests | Remaining requests in window. |
| x-ratelimit-reset-requests | Reset time for requests window. |
| x-ratelimit-limit-tokens | Token limit per window. |
| x-ratelimit-remaining-tokens | Remaining tokens in window. |
| x-ratelimit-reset-tokens | Reset time for tokens window. |

10) Compatibility notes and gaps
- ChatGPT Plus/Pro subscriptions are not used by this agent. It uses API keys (openAiApiKey/openAiNativeApiKey) or Azure credentials.
- OpenAI Native uses Responses API (not Chat Completions). LiteLLM handler does NOT call Responses API.
- LiteLLM handler emits reasoning chunks when the backend returns delta.reasoning_content or delta.reasoning, and forwards reasoning_effort in requests when enabled.
- Encrypted reasoning continuity (Responses API) is only supported by openai-native, not LiteLLM.

11) Quick implementation checklist for LiteLLM backend
- [ ] GET /v1/model/info returns data[] with model_name, model_info, litellm_params.model.
- [ ] POST /v1/chat/completions supports streaming SSE with include_usage.
- [ ] Supports messages with content arrays (text + image_url + cache_control).
- [ ] Supports tools, tool_choice, parallel_tool_calls.
- [ ] Streams tool_calls with id, index, function.name, function.arguments JSON.
- [ ] If reasoning is used, expose supports_reasoning_effort in model_info and accept reasoning_effort in requests.
- [ ] If reasoning is used, stream reasoning_content or reasoning in delta so the UI can display it.
- [ ] Emits usage (prompt_tokens, completion_tokens) and cache token fields.
- [ ] Accepts max_tokens and max_completion_tokens.
- [ ] Accepts temperature (unless the model does not support it).

12) Source map (key files)
- src/api/providers/openai.ts:32
- src/api/providers/openai-native.ts:29
- src/api/providers/lite-llm.ts:22
- src/api/providers/fetchers/litellm.ts:14
- src/api/transform/openai-format.ts:4
- src/api/transform/reasoning.ts:115
- src/api/transform/model-params.ts:48
- src/shared/api.ts:52
- src/core/task/Task.ts:2600
- src/utils/resolveToolProtocol.ts:17
- packages/types/src/provider-settings.ts:204
- packages/types/src/model.ts:5
