# AI execution rules (commands, safety, idempotency) (wrapper)

Источник истины:

| Topic | SoT |
|---|---|
| CLI safety | [`cli-master/SKILL.md`](../skills/cli-master/SKILL.md:1) |
| CLI compatibility | [`cli-compatibility/SKILL.md`](../skills/cli-compatibility/SKILL.md:1) |
| Windows env | [`environment-windows.md`](environment-windows.md:1) |
| Unix env | [`environment-unix.md`](environment-unix.md:1) |

## Minimal rules

1. Команды MUST быть идемпотентными или явно помеченными как неидемпотентные.
2. Команды MUST NOT быть деструктивными без отдельного подтверждения.
3. Команды SHOULD избегать интерактивности (использовать non-interactive flags).

