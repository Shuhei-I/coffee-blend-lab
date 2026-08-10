# Coffee Blend Lab 本番公開準備計画

最終更新: 2026-07-30

この文書は、現在の Supabase web runtime の公開準備状況を追跡します。古い local Node API と file-based persistence の詳細は、現在の active runtime には含まれません。

## 現在の状態

実装済み:

- React + Vite frontend
- Supabase Auth
- Supabase PostgreSQL schema migrations
- user-owned tables に対する Row Level Security
- Beans、BrewMethods、RecipeSeries、App Settings 用の Supabase repositories
- `initialize_user_defaults()` RPC
- `save_recipe_version(payload jsonb)` RPC
- 計算、RecipeSeries 処理、editor state conversion、snapshots、export generation のための domain layer
- JSON / CSV export
- install、tests、frontend build のための GitHub Actions CI

runtime から削除済み:

- Node API
- File-based persistence
- persistence としての browser fallback storage
- Storage mode UI

## Runtime architecture / 実行時アーキテクチャ

```text
Frontend: React + Vite
Data:     Supabase Auth + Supabase Postgres
Security: authenticated user-owned data のための RLS policies
Deploy:   static frontend, Vercel-compatible
```

## リリース準備状況

次の条件を満たす場合、アプリは Supabase-based preview release に進めます。

- Supabase migrations が対象 project に適用されている。
- `VITE_SUPABASE_URL` が設定されている。
- `VITE_SUPABASE_PUBLISHABLE_KEY` が設定されている。
- 対象 frontend URL に対して Supabase Auth redirect/site URLs が設定されている。
- manual smoke test が成功している。

## 残っているリスク

| リスク | 影響 | 推奨対応 |
| --- | --- | --- |
| browser E2E suite がない | login/save/load/export の一連の flow が CI の real browser で検証されていない | release baseline 後に Playwright などを追加する |
| old-data import が自動化されていない | 古い local runtime のユーザーには手動 migration path が必要 | JSON import または one-off migration script が必要か判断する |
| Supabase Auth email behavior が project config に依存する | project によって sign-up flow が email confirmation を要求する場合がある | deployment 時に project Auth settings を確認する |

## CI

現在の CI は次を実行します。

- `npm ci`
- `npm test`
- `npm run build`

現時点で含まれていないもの:

- `git diff --check`
- lint
- browser E2E
- Supabase local database reset/lint

## Deployment notes / デプロイメモ

backend state は Supabase にあるため、frontend には Vercel が適しています。

deployment 前に行うこと:

1. 対象 Supabase project に migrations を適用する。
2. 2つの Vite Supabase environment variables を設定する。
3. Supabase Auth URLs を設定する。
4. smoke test を実行する。
5. frontend environment variables に secret key が含まれていないことを確認する。

## 次に推奨するタスク

1. 実際の Supabase project setup steps を release checklist に反映する。
2. sign-up/login、initial defaults、CRUD、recipe save/load、export の browser E2E を追加する。
3. old local data migration path を決める。
4. チームが Supabase CLI checks を標準化する場合、SQL formatting/linting の CI checks を追加する。
