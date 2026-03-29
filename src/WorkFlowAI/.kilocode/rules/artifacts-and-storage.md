# Artifacts and Storage (SoT)

Назначение: стандартизировать, где живут артефакты задач и где должен жить источник истины (SoT/evidence).

Нормативная рамка: [`docs-standards.md`](docs-standards.md:1).

## Core rules

| Type | Location | Lifetime |
|---|---|---|
| Task artifacts | `.protocols/<protocol>/artifacts/` | временно, удаляется с протоколом |
| Stable evidence | `.kilocode/evidence/` | стабильно, ссылаться можно из правил |
| Stable extracts (sanitized sources) | `.kilocode/sources/` | стабильно |
| Scratch | `temp/` | временно |

## Artifact output map (recommended)

| Artifact | Location |
|---|---|
| Architecture decisions (ADR) | `.protocols/<protocol>/artifacts/decisions/ADR-0001-topic.md` |
| Research | `.protocols/<protocol>/artifacts/research/YYYYMMDD-HHMMSS-topic.md` |
| Evidence (logs/screenshots) | `.protocols/<protocol>/artifacts/evidence/` |

## Stability rule

1. Rules/SoT MUST NOT зависеть от `temp/`.
2. Rules/SoT MUST NOT зависеть от исторических протоколов.
3. Любая ссылка из `.kilocode/` на evidence MUST вести в `.kilocode/evidence/`.

