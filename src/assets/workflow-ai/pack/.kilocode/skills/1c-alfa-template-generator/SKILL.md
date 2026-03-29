---
name: 1c-alfa-template-generator
description: Firm guidance for template-based document generation in 1C, including input contract, optional PDF conversion, and release checklist.
---

# Skill: 1C (firm) — Template generator

## When to use

- building or integrating template-based document generation
- clarifying the expected contract for template rendering

## Source of truth

- [`template-generator.md`](../../sources/1c-alfa/template-generator.md)

## Required contract

- input data structure for template filling
- template name or identifier
- optional PDF conversion flag
- binary file output handled by the caller

## Checklist

- input structure is explicit
- PDF conversion is enabled only when needed
- binary result handling is defined
- sanitized example or ticket evidence exists
