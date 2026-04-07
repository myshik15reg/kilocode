# Workflow: risk-tier-review

## Goal

Классифицировать изменение по уровню риска и выбрать глубину review/verification path.

Связанные документы: [`protocol-new.md`](protocol-new.md:1), [`protocol-review-merge.md`](protocol-review-merge.md:1), [`pre-action-check.md`](pre-action-check.md:1), [`../rules/security-rules.md`](../rules/security-rules.md:1).

## Risk tiers

| Tier       | Use when                                                                | Required path                                                              |
| ---------- | ----------------------------------------------------------------------- | -------------------------------------------------------------------------- |
| `low-risk` | docs-only, small local change, no auth/data/external systems            | minimal applicable checks + review by repo policy                          |
| `standard` | normal repo change without high-blast-radius surface                    | normal protocol + applicable checks + review                               |
| `critical` | security/auth/data/compliance/external systems/deploy/high blast radius | deeper protocol + explicit security sanity + human-grade verification note |

## Classification hints

`critical` SHOULD be used when change touches:

1. authentication / authorization;
2. secrets / credentials / tokens;
3. network-facing or external-service behavior;
4. data integrity, migrations, destructive actions;
5. compliance-sensitive or production-release paths.

## Steps

|   # | Step               | INPUT                  | OUTPUT                | VERIFY                                            |
| --: | ------------------ | ---------------------- | --------------------- | ------------------------------------------------- |
|   1 | Classify risk      | task + touched surface | chosen tier           | tier rationale observable                         |
|   2 | Select review path | chosen tier            | required review/gates | path matches table above                          |
|   3 | Record review note | protocol / execution   | explicit rationale    | critical tasks have human-grade verification note |

## Notes

1. Risk tier дополняет trivial/non-trivial classification; не заменяет её.
2. Safe default: если сомневаешься между `standard` и `critical`, выбирать `critical`.
