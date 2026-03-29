# Safety Rules (SoT)

Назначение: минимальные safety-ограничения, которые MUST применяться всегда.

## Core rules

| Rule | Requirement |
|---|---|
| Memory Bank protection | `.kilocode/memory-bank/` MUST NOT удаляться без явного подтверждения |
| Protocol presence | Любые repo changes MUST иметь активный протокол |
| Stable evidence | Rules/SoT MUST NOT ссылаться на `temp/` или исторические протоколы |
| Secrets | Secrets MUST NOT быть коммитнуты или залогированы |

## Change discipline

1. Перед изменением ключевых SoT файлов SHOULD фиксироваться риск и план отката в протоколе.
2. При конфликте правил MUST приоритет иметь документы SoT из [`rules/index.md`](index.md:1).

