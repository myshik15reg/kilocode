# Workflow: pre-action-check

## Goal

Выполнить короткую проверку перед рискованными действиями: deploy, запуск/рестарт сервисов, изменение окружения, commit/push и обращение к внешним сервисам.

Связанные документы: [`risk-tier-review.md`](risk-tier-review.md:1), [`../patterns/orchestration/agent-guardrails.md`](../patterns/orchestration/agent-guardrails.md:1), [`../rules/security-rules.md`](../rules/security-rules.md:1), [`../rules/verification-before-completion.md`](../rules/verification-before-completion.md:1), [`protocol-review-merge.md`](protocol-review-merge.md:1), [`deployment-workflow.md`](deployment-workflow.md:1).

## Triggered actions

Workflow SHOULD запускаться перед:

1. deploy / release / publish;
2. `dev`, `start`, `serve`, рестартом сервиса;
3. изменением окружения: install, migrations, config changes;
4. `git commit` и `git push`;
5. обращением к API, БД, брокерам, очередям и другим внешним системам.

## Minimal procedure

|   # | Step                         | INPUT                                     | OUTPUT                                 | VERIFY                              |
| --: | ---------------------------- | ----------------------------------------- | -------------------------------------- | ----------------------------------- |
|   1 | Detect action type           | planned command/action                    | action type + relevant checks          | type explicit                       |
|   2 | Confirm risk surface         | repo state + touched surface              | low/standard/critical hint             | high-blast-radius actions noted     |
|   3 | Re-read only relevant config | repo state + changed files                | confirmed config surface               | only relevant files re-opened       |
|   4 | Run guardrails               | git status / staged diff / env references | go/no-go decision                      | secrets and unexpected files absent |
|   5 | Execute or stop              | decision                                  | action executed or blocked with reason | reason recorded                     |

## Guardrails

1. If staged or diff contains secrets, action MUST be blocked.
2. If target environment/config is unclear, deploy/start MUST be blocked.
3. If command touches external systems, assumptions MUST be explicit.
4. Commit/push minimum checks: `git status`, staged files, no `.env` or credential-like files.
5. If the action is paired with a `ready`/`done`/`merge` claim, also apply [`verification-before-completion.md`](../rules/verification-before-completion.md:1).

## Notes

1. This workflow is a safety corridor for risky actions.
2. It does not replace close-out verification rules from [`verification-before-completion.md`](../rules/verification-before-completion.md:1).
