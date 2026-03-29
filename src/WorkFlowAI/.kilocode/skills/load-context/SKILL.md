---
name: load-context
description: Load only the shared context needed for the current protocol step, while keeping context size under control.
version: 2.0.0
---

# Load Context

Use this skill when a protocol or multi-step workflow needs shared context, but loading everything would waste tokens.

## Goal

Gather the smallest relevant shared context before working on a step.

## Rules

1. Prefer step-local context first.
2. Load shared context only when it changes the current decision.
3. Keep context layered: step -> protocol -> broader project context.
4. Do not assume any Claude-specific helper script path.

## Portable approach

1. Read the current step or task file.
2. Look for nearby shared context folders or linked context files.
3. Load only the context that directly affects the current step.
4. Summarize large context into a capsule if needed.

## If automation exists

A consuming project may provide a local helper script for step-context loading.
Use it only if the repository documents the path and behavior explicitly.

## Fallback

If no automation exists, manually read the smallest relevant context files and continue.
