# Конфигурация BSL Language Server

Семейство источников:

1. `sources/tooling/bsl-language-server/configuration.md`
2. `sources/tooling/bsl-language-server/codeoutofregion.md`

## Назначение

1. Описывает, как diagnostics включаются, настраиваются и подавляются.
2. Помогает отличать:
    1. реальное нарушение стандарта;
    2. project-specific policy статического анализа;
    3. deliberately suppressed или перенастроенную диагностику.

## Как использовать в ревью

1. Если finding выведен из `bsl-language-server`, нужно указывать релевантный config key, когда он заметно влияет на результат.
2. Нельзя представлять конфигурируемое analyzer-warning как безусловный бизнес-дефект без дополнительного evidence.
3. Если команда осознанно ослабила диагностику конфигурацией, это не отменяет автоматически нарушение `v8std` или локального регламента; оба слоя нужно оценивать отдельно.

## Пример mapping

1. Диагностика: `CodeOutOfRegion`.
2. Ключ конфигурации: `CodeOutOfRegion.checkUnknownModuleType`.
3. Возможные `evidence_refs`:
    1. `sources/tooling/bsl-language-server/configuration.md`;
    2. `sources/tooling/bsl-language-server/codeoutofregion.md`;
    3. локальный фрагмент конфигурации анализатора или task-specific settings.
