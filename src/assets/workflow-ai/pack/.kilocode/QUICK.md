# WorkFlowAI Quick Start

> **Читай ТОЛЬКО этот файл для старта. Детали — по ссылкам.**

## 1. Подтверди прочтение
```
[MB: OK]
```

## 2. Протокол = Workspace
Любое изменение кода → создай протокол:
```
.protocols/YYYY-MM-DD-название/
├── brief.md       # Что делаем
├── plan.md        # Как делаем
└── artifacts/     # ВСЕ промежуточные результаты
    ├── architecture/
    ├── research/
    └── ...
```
**После завершения:** покажи изменённые файлы → предложи коммит → подтверди → удали протокол.

## 3. Выбери режим (Specialist First!)

| Задача | Режим | НЕ используй |
|--------|-------|--------------|
| React | `react-dev` | ~~code~~ |
| Python | `python-dev` | ~~code~~ |
| Тесты | `unit-tester` | ~~code~~ |
| Review | `reviewer` | — |
| Координация | `orchestrator` | — |
| 1С | `1c-orchestrator` | — |

**Полный список:** `~/.kilocode/modes/REGISTRY.md`

## 4. Качество (Zero Tolerance)

- **Coverage:** 100% (lines, branches, functions)
- **Lint:** 0 errors, 0 warnings
- **TODO:** только `TODO(#123)`
- **TDD:** Red → Green → Refactor

## 5. Делегирование

```xml
<!-- Kilo Code: ТОЛЬКО new_task, switch_mode ЗАПРЕЩЁН -->
<new_task>
<mode>react-dev</mode>
<message>ЗАДАЧА: ...</message>
</new_task>
```

## Когда читать больше

| Ситуация | Читай |
|----------|-------|
| Нужен контекст проекта | `.kilocode/memory-bank/index.md` |
| Пишу тесты | `~/.kilocode/rules/testing-rules.md` |
| Security | `~/.kilocode/rules/security-rules.md` |
| Оркестрация | `~/.kilocode/rules/orchestrator-guide.md` |
| Git/PR | `~/.kilocode/rules/git-workflow-rules.md` |

## Unix/macOS (PowerShell 7)

Для запуска `.ps1` используйте `pwsh`:

```bash
pwsh -File scripts/workflowai-doctor.ps1 -ProjectPath .
```

---

**Готов? Выведи `[MB: OK]` и работай!**
