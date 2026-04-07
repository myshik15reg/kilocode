# Agent Guardrails (pattern)

## Purpose

Описать обязательные guardrails вокруг agent-driven work без превращения hooks в обязательную runtime dependency.

## Lifecycle checks

| Phase            | Guardrails                                                                  |
| ---------------- | --------------------------------------------------------------------------- |
| Preflight        | protocol present, scope bounded, forbidden paths excluded, risk tier known  |
| During execution | result contract respected, writes owned, unsupported memory writes blocked  |
| Pre-close        | diff sanity, docs sync, memory decision explicit, applicable gates verified |
| Risky actions    | pre-action check before commit/push/deploy/start/external-service ops       |

## Preflight checklist

1. Есть активный протокол, если есть repo change.
2. Определён owner для write-step.
3. Определён risk tier.
4. Известно, какие stable artifacts ожидаются.

## Postflight checklist

1. Diff соответствует заявленному scope.
2. Structural review выполнен: no subsystem overbuild, no needless reinvention.
3. Memory decision зафиксирован: promote / keep in protocol / discard.
4. Applicable quality/security checks закрыты.

## Hooks policy

1. Hooks MAY использоваться в consuming project как optional automation.
2. Core pack MUST NOT зависеть от hooks для корректности правил.
3. Если hooks применяются, они SHOULD mirror this guardrail lifecycle, not invent a second policy.
