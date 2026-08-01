# Coffee Blend Lab Production Readiness Plan

Last updated: 2026-07-30

This document tracks the current Supabase web runtime. Older local Node API and file-based persistence details are no longer part of the active runtime.

## Current State

Implemented:

- React + Vite frontend
- Supabase Auth
- Supabase PostgreSQL schema migrations
- Row Level Security for user-owned tables
- Supabase repositories for Beans, BrewMethods, RecipeSeries, and App Settings
- `initialize_user_defaults()` RPC
- `save_recipe_version(payload jsonb)` RPC
- Domain layer for calculations, RecipeSeries handling, editor state conversion, snapshots, and export generation
- JSON / CSV export
- GitHub Actions CI for install, tests, and frontend build

Removed from runtime:

- Node API
- File-based persistence
- Browser fallback storage as persistence
- Storage mode UI

## Runtime Architecture

```text
Frontend: React + Vite
Data:     Supabase Auth + Supabase Postgres
Security: RLS policies for authenticated user-owned data
Deploy:   Static frontend, Vercel-compatible
```

## Release Readiness

The app is ready for Supabase-based preview release if the following are true:

- Supabase migrations are applied to the target project.
- `VITE_SUPABASE_URL` is configured.
- `VITE_SUPABASE_PUBLISHABLE_KEY` is configured.
- Supabase Auth redirect/site URLs are configured for the target frontend URL.
- Manual smoke test passes.

## Remaining Risks

| Risk | Impact | Recommended action |
| --- | --- | --- |
| No browser E2E suite | Full login/save/load/export flow is not exercised in a real browser by CI | Add Playwright or equivalent after release baseline |
| No automated old-data import | Users of the old local runtime need a manual migration path | Decide whether JSON import or one-off migration script is required |
| Supabase Auth email behavior depends on project config | Sign-up flow may require email confirmation in some projects | Verify project Auth settings during deployment |

## CI

Current CI runs:

- `npm ci`
- `npm test`
- `npm run build`

Not currently included:

- `git diff --check`
- lint
- browser E2E
- Supabase local database reset/lint

## Deployment Notes

Vercel is suitable for the frontend because backend state is now Supabase.

Before deployment:

1. Apply migrations to the intended Supabase project.
2. Configure the two Vite Supabase environment variables.
3. Configure Supabase Auth URLs.
4. Run the smoke test.
5. Confirm no secret key is present in frontend environment variables.

## Next Recommended Tasks

1. Update release checklist with actual Supabase project setup steps.
2. Add browser E2E for sign-up/login, initial defaults, CRUD, recipe save/load, and export.
3. Decide old local data migration path.
4. Add CI checks for SQL formatting/linting if the team standardizes on Supabase CLI checks.
