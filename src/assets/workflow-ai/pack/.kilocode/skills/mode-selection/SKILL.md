---
name: mode-selection
description: Decision tree for selecting the right mode - specialist-first principle, task type routing, mode capabilities.
---

# Mode Selection Guide

> **Specialist First** — always use the narrowest specialist.

## Decision Tree

```
START: Task type?
|
+--[1] Planning / Protocol closure?
|      -> architect
|
+--[2] Complex multi-step coordination?
|      -> orchestrator
|
+--[3] Question / Research?
|      +-- Internal code? -> planning/research-codebase
|      +-- External docs? -> planning/research-web
|      +-- General? -> ask
|
+--[4] Bug / Problem?
|      +-- Need to find cause? -> debug
|      +-- Cause known, need fix? -> code-fixer
|
+--[5] Testing?
|      +-- Unit? -> unit-tester
|      +-- Integration? -> integration-tester
|      +-- E2E? -> e2e-tester
|      +-- Security? -> security-tester
|
+--[6] Code Review?
|      -> reviewer
|
+--[7] Refactoring?
|      +-- General? -> refactorer
|      +-- Simplify? -> code-simplifier
|
+--[8] Localization?
|      -> translate
|
+--[9] Development (specific tech)?
|      +-- TypeScript/JS? -> ts-dev
|      +-- Python? -> python-dev
|      +-- 1C? -> 1c-developer
|      -> *-dev specialist
|
+--[10] Generic development?
       -> code (last resort)
```

## Quick Selection Table

| Task | Mode |
|------|------|
| New feature planning | architect |
| Multi-step task | orchestrator |
| Write code | *-dev or code |
| Fix bug | code-fixer |
| Write tests | *-tester |
| Review code | reviewer |
| Refactor | refactorer |
| Translate | translate |
