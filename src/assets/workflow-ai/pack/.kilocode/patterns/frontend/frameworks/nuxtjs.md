# Nuxt.js pattern

## Purpose

Keep Nuxt projects predictable, typed, and efficient.

## Prefer

- Nuxt 3 conventions
- file-based routing in `pages/`
- `useFetch` / `useAsyncData` for data loading
- server routes in `server/api/` for backend glue
- `runtimeConfig` for env-driven settings
- Pinia for shared client state

## Rules

1. Keep SSR/client data fetching explicit.
2. Put secrets only in private runtime config.
3. Use route middleware for access rules.
4. Add SEO via `useSeoMeta` where relevant.
5. Lazy-load heavy components or routes.
6. Test composables, stores, and important UI flows.

## Checklist

- routing follows file structure
- data loading is cached or lazy where appropriate
- runtime config is split into private/public
- server routes validate inputs
- tests cover critical flows
