# Waiver Workflow

Purpose: handle rare, explicit, time-bounded exceptions to normal quality or process rules.

A waiver is the exception path, not the default path.

## When a waiver may be justified

- urgent incident containment where full compliance would delay recovery unacceptably
- external tooling or generated code constraints outside the team's immediate control
- legacy migration slices where full policy compliance cannot be reached safely in one step

## When a waiver is not justified

- convenience
- avoiding normal testing effort
- shipping new code without the expected controls
- unclear ownership or no plan to return to compliance

## Required conditions

1. The exception is documented explicitly.
2. Scope is narrow and time-bounded.
3. Risk and mitigation are written down.
4. An owner is assigned.
5. There is a concrete follow-up plan to remove the waiver.
6. Approval follows repository policy.

## Recommended storage

Prefer keeping the waiver near the active protocol:

- `.protocols/YYYY-MM-DD-name/waivers/waiver-<id>.md`

If no protocol exists because of a true incident path, store the waiver in the incident record or equivalent tracked artifact.

## Minimum waiver contents

- rule being relaxed
- affected files or scope
- reason the exception is necessary
- risks introduced
- mitigations in place
- owner
- expiry or review date
- follow-up task to remove the waiver

## References

- Quality rules: [`../rules/quality-gates.md`](../rules/quality-gates.md:1)
- Testing rules: [`../rules/testing-rules.md`](../rules/testing-rules.md:1)
- Security rules: [`../rules/security-rules.md`](../rules/security-rules.md:1)
- Hotfix flow: [`hotfix-emergency.md`](hotfix-emergency.md:1)
