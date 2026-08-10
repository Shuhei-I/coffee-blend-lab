# Coffee Blend Lab

Coffee Blend Lab は、コーヒーブレンドの設計とレシピ履歴の管理を行う React/Vite web app です。完成レシピを保存するだけでなく、試作、記録、比較、改善の流れを支えることを目的としています。

対応していること:

- コーヒー豆のマスタデータ
- 抽出方法のマスタデータ
- ブレンド比率の設計
- ブレンド内の豆ごとの焙煎度メモ
- コスト、プロファイル、粉量、目標抽出量、注湯スケジュールの計算
- RecipeSeries と RecipeVersion の履歴
- 保存済みレシピ用の豆 snapshot と抽出方法 snapshot
- JSON / CSV export

## 現在の runtime

Coffee Blend Lab は、永続化層として Supabase を使います。

```text
Frontend: React + Vite
Hosting:  Vercel-compatible static frontend
Data:     Supabase Auth + Supabase Postgres + RLS
RPC:      Supabase PostgreSQL functions
```

古い Node API、file-based persistence、browser fallback storage は、現在の runtime path には含まれません。古い local version が必要な場合は、Git history または local release tag を参照してください。

## 必要なもの

- Node.js 24 recommended
- npm
- Supabase project
- Supabase publishable key

`package.json` には現在 `engines` field を定義していません。CI では Node.js 24 を使用します。

## インストール

```bash
npm install
```

## 環境変数

`.env.local` などの local environment file を作成し、次を設定します。

| Variable | Description |
| --- | --- |
| `VITE_SUPABASE_URL` | Supabase project URL |
| `VITE_SUPABASE_PUBLISHABLE_KEY` | Supabase publishable client key |

Supabase service role keys、database passwords、その他の secrets を frontend environment variables に入れないでください。

例:

```powershell
$env:VITE_SUPABASE_URL = "https://your-project.supabase.co"
$env:VITE_SUPABASE_PUBLISHABLE_KEY = "your-publishable-key"
npm run dev
```

## 開発

Vite frontend を起動します。

```bash
npm run dev
```

通常、アプリは次の URL で動作します。

```text
http://127.0.0.1:5173
```

default port が既に使われている場合、Vite は別の port を選ぶことがあります。

## スクリプト

| Command | Description |
| --- | --- |
| `npm run dev` | Vite development server を起動する |
| `npm test` | Vitest suite を実行する |
| `npm run build` | production frontend を `dist/` に build する |
| `npm run preview` | build 済み frontend を local preview する |

`npm run preview` は Vite の static preview server です。Supabase resources の作成や管理は行いません。

## テストと CI

local checks:

```bash
npm test
npm run build
```

GitHub Actions は次を実行します。

- `npm ci`
- `npm test`
- `npm run build`

## Supabase

Supabase は次の情報の source of truth です。

- Auth sessions
- Beans
- BrewMethods
- RecipeSeries / RecipeVersions / RecipeVersionBeans
- `selectedBrewMethodId` を含む App settings

Database schema と RPC の変更は、`supabase/migrations/` 配下の SQL migrations として管理します。

frontend は publishable key のみで Supabase JavaScript client を使います。`service_role`、secret keys、database passwords は使いません。

## アーキテクチャ

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

責務:

- `domain/` は React、browser API、repository、Supabase に依存しません。
- `hooks/` は React state を管理し、アプリ操作を repositories へ接続します。
- `data/` は app data shape と Supabase rows/RPC payloads を相互に map します。
- `main.jsx` は application UI を組み立て、handlers を接続します。

## レシピデータモデル

Recipes は、複数 version を持つ `RecipeSeries` として保存されます。

- `RecipeSeries` は `active` または `archived` status を持ちます。
- `RecipeVersion` は保存済み recipe version の immutable history です。
- 保存済み recipe versions には bean snapshots と brew method snapshots が含まれます。
- Master beans や brew methods を削除しても、historical recipe information は削除されません。
- `currentVersionId` は、repository mapper が latest version から導出します。

## エクスポート

保存済みレシピは JSON または CSV として export できます。

| Format | Filename | Notes |
| --- | --- | --- |
| JSON | `coffee-blend-recipes.json` | archived series と snapshots を含む |
| CSV | `coffee-blend-recipes.csv` | archived series、snapshots、roast level を含む |

CSV は UTF-8 BOM 付きのため、Windows Excel で日本語テキストを直接開けます。

## デプロイ

現在の architecture は、Supabase を backend とする Vercel などの static frontend deployment に適しています。

deployment requirements:

- `VITE_SUPABASE_URL` を設定する
- `VITE_SUPABASE_PUBLISHABLE_KEY` を設定する
- 対象 project に Supabase migrations を適用する
- deployment URL 用に Supabase Auth settings を設定する
- public user-owned tables で RLS を有効に保つ

## 既知の制限

- Browser E2E tests はまだありません。
- 古い local data からの import/migration は runtime 上で自動化されていません。
- Offline editing fallback は実装されていません。
- Supabase Auth email settings は project configuration に依存します。
- Contact / Feedback の問い合わせ窓口は準備中です。

## 手動スモークテスト

リリース前に [docs/release-smoke-test.md](docs/release-smoke-test.md) を使用してください。
