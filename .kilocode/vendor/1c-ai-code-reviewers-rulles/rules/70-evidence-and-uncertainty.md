---
rule_id: evidence-uncertainty
title: Доказательность и неопределённость
scope: evidence
priority: critical
tags: [evidence, uncertainty]
---

# Доказательность и неопределённость

1. В `evidence_refs` сначала указывать Alfa-source, затем task/architecture evidence, затем official 1C, затем tooling.
2. При неполном контексте снижать `confidence`, а не маскировать неопределённость.
3. Если official source только усиливает finding, это должно быть видно из порядка ссылок.
4. Если architecture evidence нет, статус остаётся `unknown`.
5. Если reuse, approved mechanism или лучший source-of-truth не подтверждены, reviewer должен явно сохранить неопределённость.
6. Persona-ярлык, общая "экспертность" модели или benchmark-identity не считаются evidence.
7. Лучше вернуть меньше findings, чем добавить недоказуемые утверждения.
