# Coffee Blend Lab Agent Guide

## Product direction

Coffee Blend Lab is not merely a recipe storage application.

Its core purpose is to help users:

1. create a coffee blend
2. test it
3. record the result
4. compare it with previous versions
5. refine it over time
6. discover their personal preferred blend

The product should preserve and support the user's process of exploration.

Before making product, UX, or architecture decisions, read:

- `docs/product-vision.md`
- `docs/roadmap.md`
- `docs/ui-architecture.md` when working on UI

## Product decision rule

Prefer changes that strengthen this cycle:

Create → Taste → Record → Compare → Refine

Do not prioritize features merely because they are technically interesting.

## Current priorities

1. Release stability
2. Responsive UI
3. Clear navigation
4. Recipe version comparison
5. Tasting notes and evaluation
6. Sharing experiments

## Implementation constraints

- Preserve existing Supabase architecture
- Do not reintroduce localStorage, SQLite, or the legacy Node API
- Preserve RLS and authenticated user boundaries
- Keep domain logic independent from UI and persistence where practical
- Add or update tests for behavior changes
- Do not commit or push unless explicitly instructed