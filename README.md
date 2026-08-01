# Coffee Blend Lab

Coffee Blend Lab is a React/Vite web app for designing coffee blends and managing recipe history.

It supports:

- Coffee bean master data
- Brew method master data
- Blend ratio design
- Roast level notes per blend bean
- Cost, profile, dose, target brew amount, and pour schedule calculations
- RecipeSeries and RecipeVersion history
- Bean and brew method snapshots for saved recipes
- JSON / CSV export

## Current Runtime

Coffee Blend Lab now uses Supabase as its persistence layer.

```text
Frontend: React + Vite
Hosting:  Vercel-compatible static frontend
Data:     Supabase Auth + Supabase Postgres + RLS
RPC:      Supabase PostgreSQL functions
```

The old Node API, file-based persistence, and browser fallback storage are no longer part of the runtime path. The old local version should be referenced from Git history or the local release tag if needed.

## Requirements

- Node.js 24 recommended
- npm
- Supabase project
- Supabase publishable key

`package.json` does not currently define an `engines` field. CI uses Node.js 24.

## Install

```bash
npm install
```

## Environment Variables

Create a local environment file such as `.env.local` and set:

| Variable | Description |
| --- | --- |
| `VITE_SUPABASE_URL` | Supabase project URL |
| `VITE_SUPABASE_PUBLISHABLE_KEY` | Supabase publishable client key |

Do not put Supabase service role keys, database passwords, or other secrets in frontend environment variables.

Example:

```powershell
$env:VITE_SUPABASE_URL = "https://your-project.supabase.co"
$env:VITE_SUPABASE_PUBLISHABLE_KEY = "your-publishable-key"
npm run dev
```

## Development

Start the Vite frontend:

```bash
npm run dev
```

The app usually runs at:

```text
http://127.0.0.1:5173
```

Vite may choose another port if the default port is already in use.

## Scripts

| Command | Description |
| --- | --- |
| `npm run dev` | Start the Vite development server |
| `npm test` | Run the Vitest suite |
| `npm run build` | Build the production frontend into `dist/` |
| `npm run preview` | Preview the built frontend locally |

`npm run preview` is a Vite static preview server. It does not create or manage Supabase resources.

## Testing and CI

Local checks:

```bash
npm test
npm run build
```

GitHub Actions runs:

- `npm ci`
- `npm test`
- `npm run build`

## Supabase

Supabase is the source of truth for:

- Auth sessions
- Beans
- BrewMethods
- RecipeSeries / RecipeVersions / RecipeVersionBeans
- App settings, including `selectedBrewMethodId`

Database schema and RPC changes are managed as SQL migrations under `supabase/migrations/`.

The frontend uses the Supabase JavaScript client with the publishable key only. It does not use `service_role`, secret keys, or database passwords.

## Architecture

```text
src/
  components/  UI components
  hooks/       React state and app orchestration
  domain/      Pure business rules, calculations, defaults, snapshots, export data
  data/        Supabase repository and mapper implementations
  lib/         Shared infrastructure clients
  services/    Browser-side side effects such as file download
supabase/
  migrations/ PostgreSQL schema, RLS, and RPC migrations
```

Responsibilities:

- `domain/` has no React, browser API, repository, or Supabase dependency.
- `hooks/` manages React state and connects app operations to repositories.
- `data/` maps between app data shapes and Supabase rows/RPC payloads.
- `main.jsx` composes the application UI and wires handlers.

## Recipe Data Model

Recipes are stored as `RecipeSeries` with multiple versions.

- `RecipeSeries` has `active` or `archived` status.
- `RecipeVersion` is immutable history for a saved recipe version.
- Saved recipe versions include bean snapshots and brew method snapshots.
- Master beans or brew methods can be deleted without deleting historical recipe information.
- `currentVersionId` is derived in the repository mapper from the latest version.

## Export

Saved recipes can be exported as JSON or CSV.

| Format | Filename | Notes |
| --- | --- | --- |
| JSON | `coffee-blend-recipes.json` | Includes archived series and snapshots |
| CSV | `coffee-blend-recipes.csv` | Includes archived series, snapshots, and roast level |

CSV is UTF-8 with BOM so Windows Excel can open Japanese text directly.

## Deployment

The current architecture is suitable for a static frontend deployment such as Vercel with Supabase as the backend.

Deployment requirements:

- Configure `VITE_SUPABASE_URL`
- Configure `VITE_SUPABASE_PUBLISHABLE_KEY`
- Apply Supabase migrations to the target project
- Configure Supabase Auth settings for the deployment URL
- Keep RLS enabled on public user-owned tables

## Known Limitations

- Browser E2E tests are not yet present.
- Import/migration from old local data is not automated in the runtime.
- Offline editing fallback is not implemented.
- Supabase Auth email settings depend on project configuration.

## Manual Smoke Test

Use [docs/release-smoke-test.md](docs/release-smoke-test.md) before release.
