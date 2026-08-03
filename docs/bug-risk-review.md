# Coffee Blend Lab Bug Risk Review

Last updated: 2026-08-03

This document records likely bug risks found during a broad project review. It focuses on risks that could affect the core product cycle:

Create -> Taste -> Record -> Compare -> Refine

Validation performed:

- `npm.cmd run build`
- `npm.cmd run test`

Result at review time:

- Production build passed.
- 29 test files passed.
- 256 tests passed.

## High Priority Risks

### 1. Incomplete blends can be saved

Risk:

The recipe save path allows saving a blend even when the blend is incomplete. The frontend does not currently block saves when the ratio total is not 100%, and the database RPC only checks that the bean list is non-empty and ratios are nonnegative.

Relevant areas:

- `src/main.jsx` `saveRecipe`
- `supabase/migrations/20260730024617_save_recipe_version_rpc.sql` `save_recipe_version`

Impact:

Users can create recipe versions that are difficult to compare or reproduce. This weakens the experiment history because saved versions may not represent a valid blend.

Recommended actions:

- Add frontend validation before save:
  - at least one bean has a positive ratio
  - ratio total is exactly 100
  - dose and brew ratio are valid positive values
- Disable the save button when the recipe is invalid.
- Add the same validation to `save_recipe_version` so invalid payloads cannot be inserted through direct API calls.
- Add tests for invalid save attempts.

### 2. Supabase load and save errors are not visible enough in the main app

Risk:

`useCoffeeData` exposes `loading`, `loadError`, and `saveError`, but the main UI does not currently render them. On partial load failure, beans, brew methods, or recipe series may become empty without the user seeing a clear explanation.

Relevant areas:

- `src/hooks/useCoffeeData.js`
- `src/main.jsx`

Impact:

Users may interpret a loading or permission problem as lost data. Failed saves may also feel like silent failures.

Recommended actions:

- Render a workspace-level loading state while Supabase data is loading.
- Render a clear error banner when `loadError` or `saveError` exists.
- Distinguish "no data yet" from "data failed to load."
- Provide retry actions for loading failures where practical.

### 3. Loading older recipes can drop deleted beans from the editable blend

Risk:

Recipe versions store bean snapshots, which preserves history. However, when a recipe is loaded into the editor, ratios are rebuilt from the current bean master list. Deleted beans that exist only in the recipe snapshot are not restored as editable blend entries.

Relevant areas:

- `src/domain/coffee/recipeLoad.js`
- `src/domain/coffee/recipeSeries.js`
- `src/components/RecipeLibrary.jsx`

Impact:

Past versions can be displayed, but continuing an experiment from a historical version may lose important blend components. This conflicts with the product goal of comparing and refining versions over time.

Recommended actions:

- Allow snapshot-only beans to be loaded as temporary recipe beans.
- Mark those beans clearly as "saved at the time" or equivalent.
- Keep snapshot-only beans separate from the bean master unless the user explicitly adds them back.
- Add tests for loading and resaving recipes that reference deleted beans.

## Medium Priority Risks

### 4. Version change notes are not captured in the current Record UI

Risk:

The editor state and save payload support `changeNote`, but the current Record screen does not expose an input for it.

Relevant areas:

- `src/hooks/useRecipeEditor.js`
- `src/main.jsx`
- `src/components/RecipeNamePanel.jsx`
- `src/components/SensoryPanel.jsx`

Impact:

Version history may explain what the user tasted, but not what changed. This makes comparison and refinement weaker.

Recommended actions:

- Add a "change made this version" field to the Record flow.
- Show change notes prominently in History version rows.
- Keep tasting memo and change note separate:
  - change note: what changed
  - tasting memo: what happened

### 5. Concurrent master edits can overwrite newer UI state

Risk:

`updateBeanMaster` and `updateBrewMethodMaster` build the next state from the hook closure after awaiting repository calls. With slow network responses or rapid consecutive edits, an older response may overwrite a newer state.

Relevant areas:

- `src/hooks/useCoffeeData.js`

Impact:

Users may see edits revert or master rows jump back after saves complete out of order.

Recommended actions:

- Use functional state updates after async calls:
  - `setBeans((current) => ...)`
  - `setBrewMethods((current) => ...)`
- Consider per-row saving state.
- Ignore stale responses using a request id or updated timestamp comparison.
- Add tests for out-of-order repository responses.

### 6. No database-level automated smoke test

Risk:

The JavaScript unit tests and production build pass, but there is no automated check that applies Supabase migrations to a local database and verifies the full RLS/RPC flow.

Relevant areas:

- `supabase/migrations`
- CI configuration

Impact:

SQL regressions, RLS boundary mistakes, or RPC permission problems may only be found during manual deployment or production smoke testing.

Recommended actions:

- Add a Supabase local database smoke test in CI.
- Cover:
  - migrations apply cleanly
  - `initialize_user_defaults()` works for a new authenticated user
  - RLS prevents cross-user access
  - `save_recipe_version()` saves a version and beans atomically
  - deleting master beans or brew methods preserves historical snapshots

## Suggested Fix Order

1. Add save validation for complete blends.
2. Surface `loading`, `loadError`, and `saveError` in the main workspace.
3. Preserve snapshot-only beans when loading historical recipes.
4. Add `changeNote` input and History display.
5. Harden async master update state handling.
6. Add Supabase migration/RLS/RPC smoke tests.

