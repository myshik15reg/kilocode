# Architecture

## Overview

- `WorkFlowAI` остаётся document-centric workflow-pack: стабильный SoT живёт в `.kilocode/`, task-local state и execution trail живут в `.protocols/`.
- Для runtime-контекста зафиксирована трёхслойная модель:
    1. `Memory Bank` — только долгоживущие факты и решения;
    2. `workspace context snapshot` — свежий task-local снимок репозитория и среды;
    3. `session checkpoint` — resume/handoff state для длинных задач.
- Источник исследования: [`../sources/agent-runtime-research-2026-04-09.md`](../sources/agent-runtime-research-2026-04-09.md:1).

## Key decisions

- D1: `Memory Bank` не используется как журнал сессий; transient execution state туда не пишется.
- D2: При пустом, общем или устаревшем `Memory Bank` SHOULD использоваться task-local `workspace-context-bootstrap`.
- D3: Для длинных или compaction-prone задач SHOULD сохраняться явный `session checkpoint`.
- D4: Более крупные runtime инициативы идут backlog-first и валидируются поэтапно.
