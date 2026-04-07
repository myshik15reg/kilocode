# Repo Hygiene (SoT)

Назначение: поддерживать репозиторий чистым, предсказуемым и удобным для ревью.

Нормативная рамка документов: [`docs-standards.md`](docs-standards.md:1).

## Storage rules

| Concern             | MUST location      | MUST NOT location             |
| ------------------- | ------------------ | ----------------------------- |
| Workflow pack docs  | `.kilocode/`       | repo root (кроме entrypoints) |
| Protocol workspaces | `.protocols/`      | `.kilocode/`                  |
| Scratch artifacts   | `temp/`            | `.kilocode/`                  |
| Screenshots         | `temp/screenshot/` | repo root                     |

## Forbidden file types

1. `.doc` / `.docx` MUST NOT быть в репозитории.
2. Содержимое таких файлов MUST быть извлечено и сохранено в `.md`.

## Local-only artifacts (MUST NOT be tracked)

| Category        | Examples                                 |
| --------------- | ---------------------------------------- |
| IDE/workspace   | `*.code-workspace`, `.vscode/`, `.idea/` |
| AI tool configs | `.claude/` and similar                   |

## Naming conventions

| Item            | Convention                    | Example                                |
| --------------- | ----------------------------- | -------------------------------------- |
| Protocol folder | `.protocols/YYYY-MM-DD-name/` | `.protocols/2026-02-10-sot-rewrite/`   |
| Markdown files  | lowercase kebab-case          | `docs-standards.md`                    |
| Screenshots     | date + short name             | `temp/screenshot/2026-02-10-links.png` |

## Clean status checklist

| Check                     | Pass criteria       |
| ------------------------- | ------------------- |
| Unrelated untracked files | отсутствуют         |
| Scratch at repo root      | отсутствует         |
| Large binaries            | отсутствуют без LFS |
