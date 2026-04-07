# Memory Bank Usage (rules)

Источник структуры Memory Bank: [`memory-bank/index.md`](../memory-bank/index.md:1).

## Session start

1. Агент MUST прочитать [`memory-bank/index.md`](../memory-bank/index.md:1).
2. Агент MUST подтвердить контекст строкой `[MB: OK]`.
3. Агент MUST следовать коридору entrypoints: [`AGENTS.md`](../../AGENTS.md:1) and [`QUICK.md`](../QUICK.md:1).

## Keep it portable

1. Memory Bank MUST содержать проектный контекст consuming project.
2. Workflow-pack MUST NOT хранить проектно-специфичную историю consuming project.
3. Если контекст не помещается или недоступен получателю, MUST использоваться Context Capsule: [`context-capsule.md`](../patterns/orchestration/context-capsule.md:1).

## Protocols

1. Любая `task`, которая меняет репозиторий, MUST иметь протокол в `.protocols/YYYY-MM-DD-name/`.
2. Итоговые знания MUST переноситься в стабильные SoT/evidence пути до удаления протокола. См. [`artifacts-and-storage.md`](artifacts-and-storage.md:1).
