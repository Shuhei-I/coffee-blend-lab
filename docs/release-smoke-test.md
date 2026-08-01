# Coffee Blend Lab Release Smoke Test

Run this checklist against the Supabase-backed app before release.

## 1. Startup and Auth

- [ ] Configure `VITE_SUPABASE_URL` and `VITE_SUPABASE_PUBLISHABLE_KEY`.
  Expected: frontend can create the Supabase client without configuration errors.
- [ ] Run `npm run dev`.
  Expected: Vite prints a local frontend URL.
- [ ] Open the frontend.
  Expected: unauthenticated users see the auth screen.
- [ ] Sign up with email and password.
  Expected: either a session starts or the app shows the email confirmation message, depending on Supabase project settings.
- [ ] Sign in with email and password.
  Expected: authenticated users reach the Coffee Blend Lab workspace.
- [ ] Sign out.
  Expected: the auth screen is shown again.

## 2. Initial Defaults

- [ ] Sign in as a new user.
  Expected: default beans, default brew methods, and app settings are initialized by Supabase RPC.
- [ ] Reload the browser.
  Expected: the same Supabase-backed data appears after session restore.

## 3. Bean Master

- [ ] Add a bean.
  Expected: the new bean appears and receives a Supabase UUID.
- [ ] Edit bean name, memo, cost, visibility, and roast/profile-related fields.
  Expected: changes are reflected in the UI and persist after saving/reload.
- [ ] Edit profile values outside the allowed range.
  Expected: profile values follow the existing clamp rules.
- [ ] Delete a bean.
  Expected: it disappears after confirmation and successful Supabase delete.
- [ ] Reload after deleting a bean.
  Expected: the deleted bean does not reappear, including default beans.
- [ ] Try to delete the last bean.
  Expected: deletion is blocked by the existing UI rule.

## 4. Brew Method Master

- [ ] Add a brew method.
  Expected: the new method appears, receives a Supabase UUID, and becomes selected.
- [ ] Edit brew method fields.
  Expected: values update and persist after saving/reload.
- [ ] Select a brew method from the blend screen.
  Expected: app settings persist the selected ID in Supabase.
- [ ] Delete a non-selected brew method.
  Expected: selected method remains unchanged.
- [ ] Delete the selected brew method.
  Expected: selection falls back to the existing rule.
- [ ] Reload after deleting a brew method.
  Expected: the deleted brew method does not reappear, including default brew methods.
- [ ] Try to delete the last method.
  Expected: deletion is blocked by the existing UI rule.

## 5. Blend Workflow

- [ ] Change blend ratios.
  Expected: total, cost, profile, dose lines, and brew schedule update.
- [ ] Normalize ratios.
  Expected: ratios normalize according to existing rules.
- [ ] Set bean roast levels in the blend screen.
  Expected: roast level values remain visible while editing.
- [ ] Change dose and brew ratio.
  Expected: target brew amount and schedule update.
- [ ] Enter sensory notes and memo.
  Expected: values remain in editor state until reset or recipe load.

## 6. Recipes

- [ ] Save a new recipe.
  Expected: a new RecipeSeries with version 1 is created through Supabase.
- [ ] Load the saved recipe.
  Expected: editor state is restored from saved recipe and snapshots.
- [ ] Save another version.
  Expected: a new version is added to the same series.
- [ ] Archive the series.
  Expected: it moves to archived status.
- [ ] Restore the series.
  Expected: it returns to active status.
- [ ] Delete a non-final version.
  Expected: version is deleted and remaining versions stay ordered.
- [ ] Try to delete the final version.
  Expected: UI guard prevents deletion.
- [ ] Load a recipe whose master bean or brew method was deleted.
  Expected: snapshot data still displays enough information to reproduce the recipe.

## 7. Export

- [ ] Export JSON.
  Expected: `coffee-blend-recipes.json` downloads and includes archived series and snapshots.
- [ ] Export CSV.
  Expected: `coffee-blend-recipes.csv` downloads and includes roast level data.
- [ ] Open CSV in a text editor.
  Expected: file is UTF-8 with BOM and opens Japanese text correctly in Windows Excel.

## 8. Regression

- [ ] Run `npm test`.
  Expected: all tests pass.
- [ ] Run `npm run build`.
  Expected: production frontend build succeeds.
