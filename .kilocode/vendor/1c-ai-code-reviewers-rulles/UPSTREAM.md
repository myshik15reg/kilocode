# Upstream

- Source repository: `https://gitlab.alfaleasing.ru/1c_devops/1c_ai_code_reviewers_rulles`
- Vendored from commit: `8ee5ee2d8eb880e1e3aa2693051fea60333effcb`
- Integration model: vendor corpus for retrieval-first 1C code review inside `WorkFlowAI`
- Local adaptation lives outside this folder in `WorkFlowAI` skills/workflows/modes

## Update rule

1. Sync this vendor directory from upstream without reshaping internal paths.
2. Keep bridge logic in `WorkFlowAI` files, not inside vendored sources.
3. Preserve `indexes/`, `rules/`, `sources/`, `templates/`, `manifests/` as upstream-owned structure.
