# Workflow: text-normalization

## Goal

Normalize text so it becomes consistent, readable, and easier for agents or humans to process.

## Use when

- text has broken formatting or inconsistent style
- headings, bullets, or terminology drift make navigation harder
- a document needs cleanup without changing its meaning

## Core rules

1. Preserve meaning unless a rewrite is explicitly requested.
2. Prefer small structural cleanup over content expansion.
3. Keep source-of-truth terms consistent with the rules index.
4. Do not mix normalization with unrelated policy changes.

## Typical normalization work

- fix headings and list structure
- standardize naming and terminology
- remove obvious duplication
- simplify noisy prose
- repair broken readability caused by encoding or formatting issues
