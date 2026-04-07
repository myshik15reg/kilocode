# MCP Usage Guide

Source of Truth: [`mcp-usage/SKILL.md`](../skills/mcp-usage/SKILL.md:1).

Minimal rules:

1. Для context7 MUST вызывать `resolve-library-id` перед `query-docs`.
2. MCP calls SHOULD be limited to 3 per question.
3. Secrets MUST NOT be passed to MCP tool parameters.
4. MCP-related integrations SHOULD быть классифицированы через [`../patterns/orchestration/integration-types.md`](../patterns/orchestration/integration-types.md:1).
