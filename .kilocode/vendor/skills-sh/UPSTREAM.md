# Upstream

- Source registry: `https://skills.sh/`
- Purpose of this namespace: reserved vendor area for future `skills.sh` syncs when an adopted skill has supporting files that must be preserved unchanged.
- Wave 1 status: no raw upstream skill snapshots stored here; local bridge skills in `.kilocode/skills/skills-sh-*` are the operational layer.

## Update rule

1. Keep local bridge logic in WorkFlowAI skills, workflows, and rules.
2. Vendor upstream materials here only when path preservation or bundled upstream resources are necessary.
3. If vendoring becomes necessary later, record the exact upstream URL, retrieval date, and local bridge that consumes it.
4. Do not reshape vendored upstream content to fit local SoT; keep adaptation outside this folder.
