# Workflow: deep-analysis

## Goal

Perform a deliberate, evidence-based analysis when a quick answer would be risky or shallow.

Use this workflow to understand a problem space before proposing a fix, refactor, or design decision.

## Use when

- the root cause is unclear
- the issue spans several files or layers
- there is a high regression or safety risk
- the user asked for an audit, diagnosis, or deeper reasoning

## Output

A useful deep analysis should return:

- a clear problem statement
- the most relevant evidence
- likely causes or contributing factors
- recommended next action
- explicit unknowns or assumptions

## Process

| Step | Outcome |
|---|---|
| 1 | define the question being answered |
| 2 | gather only the files and evidence needed |
| 3 | separate facts from assumptions |
| 4 | identify likely causes or decision branches |
| 5 | recommend the safest next action |

## Evidence rules

1. Prefer repository evidence over guesswork.
2. Keep claims traceable to files, logs, or commands.
3. Label assumptions explicitly.
4. Avoid pretending to have certainty when evidence is partial.

## Anti-patterns

- reading the whole repository without narrowing scope
- mixing diagnosis with broad implementation too early
- presenting speculation as fact
- producing long narrative without a concrete next action

## Typical follow-up flows

- root cause found -> use a specialist implementation or fix flow
- architecture issue found -> use protocol planning or refactoring flow
- still ambiguous -> ask one precise blocking question or gather one missing source of evidence
