# FAQ

## Что такое WorkFlowAI?

WorkFlowAI - это workflow pack для Kilo Code на методологии AlfaFlow: Memory Bank + протоколы + специализированные агенты.

## Когда нужен протокол?

Любая задача требует протокола в `.protocols/`. Тривиальность влияет только на глубину плана и логов.

## Нужно ли обновлять Memory Bank?

Да. После закрытия протокола обновляй `context.md` и при необходимости `index.md`, `architecture.md`, `tech.md`.

## Почему 100% coverage обязательно?

Это требование Zero Tolerance: без тестов - нет кода. Coverage по lines/branches/functions = 100%.

## Как выбрать правильного агента?

Сначала ищи узкого специалиста. См. `~/.kilocode/rules/orchestrator-guide.md` и `AGENTS.md`.

## Что делать если нет субагентов?

Используй role loop в одном агенте (architect -> implementer -> tester -> reviewer) и зафиксируй в `execution.md`.

## Где хранить артефакты?

Task-артефакты храни в `.protocols/<protocol>/artifacts/`. См. `~/.kilocode/rules/artifacts-and-storage.md`.

## Как быстро найти нужный workflow?

Начни с `~/.kilocode/workflows/quickref.md` или `~/.kilocode/workflows/index.md`.
