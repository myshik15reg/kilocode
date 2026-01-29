# AlfaFlow Project Rules (Thin Core)

Этот файл намеренно краткий: здесь только ссылки на первоисточники, чтобы не дублировать правила.

## Единые источники истины

### Quality (CRITICAL)
- `~/.kilocode/rules/quality-gates.md` — **AUTHORITATIVE**: 100% coverage, lint, TDD, security gates.
- `~/.kilocode/rules/anti-patterns.md` — что НЕ делать и почему.

### Process
- `AGENTS.md` — главный манифест: принципы, режимы, quick start.
- `~/.kilocode/rules/testing-rules.md` — детали TDD и тестирования.
- `~/.kilocode/rules/security-rules.md` — OWASP, security checklist.
- `~/.kilocode/patterns/code-standards.md` — SOLID/KISS/DRY/YAGNI.
- `~/.kilocode/rules/git-workflow-rules.md` — Conventional Commits и PR-flow.
- `~/.kilocode/rules/roles.md` — обязанности режимов.

## Оркестрация и multi-model
- `~/.kilocode/workflows/agent-orchestration.md` — стратегия субагентов и model tiers.
- `~/.kilocode/patterns/orchestration/context-capsule.md` — fallback для memory-bank-limited моделей.
- `~/.kilocode/rules/mode-delegation-example.md` — формат делегирования и CAPABILITIES.

## Memory Bank и протоколы
- `.kilocode/memory-bank/index.md` — входная точка, подтверждение `[MB: OK]`.
- `~/.kilocode/rules/memory-bank-instructions.md` — правила работы с Memory Bank.
- `.protocols/` — работаем только в протоколах (`brief.md`, `plan.md`, `execution.md`).

## Skills и Patterns
- `~/.kilocode/rules/skills-index.md` - использование skills.
- `~/.kilocode/patterns/index.md` - каталог паттернов.
- `~/.kilocode/patterns/design-patterns.md` - шаблоны проектирования (Observer, Factory и др.).
- `~/.kilocode/patterns/frameworks.md` - топовые фреймворки и правила выбора.

## Quick Reference
- `~/.kilocode/workflows/quickref.md` — конденсированные чеклисты.
