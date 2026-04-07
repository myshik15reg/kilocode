# FAQ

| Question                          | Answer                                                                 | Source                                                                 |
| --------------------------------- | ---------------------------------------------------------------------- | ---------------------------------------------------------------------- |
| Когда нужен протокол?             | Всегда, если меняется репозиторий.                                     | [`protocol-new.md`](../workflows/protocol-new.md:1)                    |
| Почему 100% coverage обязательно? | Это non-negotiable quality gate.                                       | [`quality-gates.md`](quality-gates.md:1)                               |
| Как выбрать режим?                | Specialist-first, deterministic decision tree.                         | [`mode-selection/SKILL.md`](../skills/mode-selection/SKILL.md:1)       |
| Как делегировать?                 | Через `new_task` + strict handoff.                                     | [`context-handoff.md`](../patterns/orchestration/context-handoff.md:1) |
| Где хранить артефакты?            | В протоколе `artifacts/`, стабильное evidence в `.kilocode/evidence/`. | [`artifacts-and-storage.md`](artifacts-and-storage.md:1)               |
