# Tailwind CSS pattern

## Purpose
Use Tailwind for fast, consistent styling without turning markup into unreadable utility soup.

## Rules
1. Configure `content` paths correctly so unused CSS is removed.
2. Prefer design tokens in `theme.extend` for repeated colors, spacing, and typography.
3. Use utilities directly for simple layout and spacing.
4. Extract repeated UI into components before class lists become hard to read.
5. Use `@apply` sparingly for stable component primitives.
6. Include responsive, focus, and dark-state classes intentionally.

## Checklist
- class lists are still readable
- repeated patterns extracted
- dark mode strategy is defined
- build removes unused utilities
- tests focus on behavior and variants, not fragile full class snapshots
