# Testing Matrix

This document records the test contours that currently exist in the repository, the commands used to run them, and the latest verified results from the 2026-04-13 audit.

## Coverage of the audit

The repository already contains unit, integration/E2E, and load/performance entry points. Mutation testing was not wired for the whole monorepo, so this audit added a minimal reproducible mutation pipeline for one narrow target in `@kilocode/agent-runtime`.

## Unit tests

| Scope                 | Entry point                   | Command                                          | Audit status                                  |
| --------------------- | ----------------------------- | ------------------------------------------------ | --------------------------------------------- |
| Monorepo aggregate    | root turbo pipeline           | `pnpm test`                                      | Present, not executed end-to-end in this pass |
| CLI package           | `cli/src`                     | `pnpm --dir cli test`                            | Present, not fully re-run in this pass        |
| Agent runtime package | `packages/agent-runtime/src`  | `pnpm --dir packages/agent-runtime test`         | Present, targeted suite re-run                |
| VS Code extension     | `src/**/__tests__`            | `pnpm --dir src test` or root `pnpm test`        | Present, not fully re-run in this pass        |
| Webview UI            | `webview-ui/src/**/__tests__` | `pnpm --dir webview-ui test` or root `pnpm test` | Present, not fully re-run in this pass        |

### Verified unit target

The audit targeted [`packages/agent-runtime/src/utils/safe-stringify.ts`](../packages/agent-runtime/src/utils/safe-stringify.ts) and [`packages/agent-runtime/src/utils/__tests__/safe-stringify.test.ts`](../packages/agent-runtime/src/utils/__tests__/safe-stringify.test.ts).

Verified command:

```bash
pnpm --dir packages/agent-runtime exec vitest run src/utils/__tests__/safe-stringify.test.ts --reporter=verbose
```

Verified result on 2026-04-13:

- 1 file passed
- 29 tests passed

## Integration and E2E tests

| Scope                | Entry point                 | Command                                     | Audit status                            |
| -------------------- | --------------------------- | ------------------------------------------- | --------------------------------------- |
| CLI integration      | `cli/integration-tests`     | `pnpm --dir cli test:integration`           | Present, smoke suite re-run and passing |
| VS Code Electron E2E | `apps/vscode-e2e`           | `pnpm --dir apps/vscode-e2e test:run`       | Present, not re-run in this pass        |
| VS Code CI E2E       | `apps/vscode-e2e`           | `pnpm --dir apps/vscode-e2e test:ci`        | Present, not re-run in this pass        |
| Playwright E2E       | `apps/playwright-e2e/tests` | `pnpm --dir apps/playwright-e2e playwright` | Present, not re-run in this pass        |

### Verified CLI integration smoke

Verified command:

```bash
pnpm --dir cli exec vitest run integration-tests/logo.test.ts integration-tests/simple-file-operations.test.ts --reporter=verbose
```

Verified result on 2026-04-13:

- 2 files passed
- 3 tests passed

The smoke suite is currently healthy for the verified CLI paths. The simple file-operation scenario is stabilized through a deterministic integration-test mode that does not depend on external auth or backend availability.

## Load and performance tests

| Scope                    | Entry point                               | Command                                             | Audit status                                                        |
| ------------------------ | ----------------------------------------- | --------------------------------------------------- | ------------------------------------------------------------------- |
| Neo4j benchmark suite    | `src/services/neo4j/__tests__/benchmarks` | `pnpm --dir src benchmark:neo4j`                    | Present, CLI usage verified; full benchmark not re-run in this pass |
| Code index benchmark CLI | `benchmark/code-index`                    | `pnpm --dir benchmark/code-index run dev -- --help` | Present, CLI help verified in this pass                             |

### Notes

- [`docs/neo4j-performance-benchmarks.md`](./neo4j-performance-benchmarks.md) documents the Neo4j benchmark workflow in more detail.
- [`benchmark/code-index/README.md`](../benchmark/code-index/README.md) describes the standalone code-index benchmark pipeline.

## Coverage measurement

Coverage for the targeted runtime utility is now reproducible with Vitest V8 coverage.

Verified command:

```bash
pnpm --dir packages/agent-runtime exec vitest run src/utils/__tests__/safe-stringify.test.ts --coverage.enabled --coverage.reporter=text --coverage.reporter=json-summary --coverage.include=src/utils/safe-stringify.ts
```

Verified result on 2026-04-13:

| File                | Statements | Branches | Functions | Lines |
| ------------------- | ---------- | -------- | --------- | ----- |
| `safe-stringify.ts` | 100%       | 100%     | 100%      | 100%  |

Implementation details:

- coverage provider: `@vitest/coverage-v8`
- pinned version: `4.0.17`
- reason for pinning: it must match the installed `vitest 4.0.17`; newer `coverage-v8` releases were not compatible in this package during the audit

## Mutation testing

Mutation testing is now wired for a narrow, reproducible target in `@kilocode/agent-runtime`.

Relevant files:

- [`packages/agent-runtime/stryker.config.mjs`](../packages/agent-runtime/stryker.config.mjs)
- [`packages/agent-runtime/src/utils/safe-stringify.ts`](../packages/agent-runtime/src/utils/safe-stringify.ts)
- [`packages/agent-runtime/src/utils/__tests__/safe-stringify.test.ts`](../packages/agent-runtime/src/utils/__tests__/safe-stringify.test.ts)

Verified command:

```bash
pnpm --dir packages/agent-runtime test:mutation
```

Latest verified result on 2026-04-13:

- 61 mutants generated
- 61 killed
- 0 survived
- 0 timed out
- mutation score: 100.00

### Mutation notes

- The audit eliminated the previously surviving mutants around `serializeError` by asserting that `message`, `name`, and `stack` are each read exactly once.
- The current Stryker setup uses the command runner instead of `@stryker-mutator/vitest-runner` because the Vitest runner was not stable in this package during the audit.
- The command runner was stabilized during the audit by setting `concurrency: 1`, `timeoutMS: 10000`, and `timeoutFactor: 2`, which removed the earlier timeout-only mutants in fresh verification.
- The HTML report is generated at `packages/agent-runtime/reports/mutation/mutation.html`.

## What changed in this audit

- Added `test:coverage` and `test:mutation` scripts to `@kilocode/agent-runtime`.
- Added a minimal Stryker configuration for `safe-stringify.ts`.
- Expanded `safe-stringify` tests to cover shared references, nested serialization failures, BigInt fallback behavior, and mutation-sensitive Error serialization behavior.
- Stabilized the CLI integration smoke, including the `--nosplash` first-frame path and a deterministic backend-free file-operation smoke mode for the simple integration scenario.
