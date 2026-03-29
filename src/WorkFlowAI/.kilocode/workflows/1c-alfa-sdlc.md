# 1C (firm): SDLC from request to done (`1c-alfa-sdlc`)

## Purpose
Provide the minimum repeatable lifecycle for 1C work so tasks stay auditable, releasable, and supportable.

## Source of truth
- SDLC stages: [`REG`](../sources/1c-alfa/reg.md#sdlc)

## Task class
- support: small change, usually under 1 hour
- project work: larger scoped change requiring analysis and agreement

## Stages
1. Request
   - clear requirement
   - business approval if required
   - attached source materials
2. Analysis
   - agreed final requirements
   - test scenarios for project work
3. Architecture
   - design review and implementation approach for project work
4. Development
   - changed objects recorded for `<TICKET>`
5. Testing
   - IT testing completed
   - business confirms expected behavior or returns task for rework
6. Code review
   - release only after successful review
7. Documentation
   - user or operational docs updated if needed
8. Release
   - only reviewed and traceable code goes to production
9. Done
   - production confirmation received

## Mandatory gates
- changed objects are recorded
- testing evidence exists
- code review passed
- release notes / operational notes exist when needed

## Related
- `.kilocode/workflows/1c-alfa-traceability.md`
- `.kilocode/workflows/1c-testing-workflow.md`
