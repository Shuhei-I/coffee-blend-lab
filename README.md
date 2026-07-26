# Coffee Blend Lab

Coffee Blend Labは、コーヒーのブレンド設計をローカルで管理するWebアプリです。

主な用途は次のとおりです。

- コーヒー豆マスタの管理
- ブレンド比率の設計
- 豆ごとの焙煎度の記録
- 抽出方法マスタの管理
- 原価、味プロファイル、粉量、抽出量の計算
- RecipeSeriesとversionによるレシピ履歴管理
- JSON / CSV export

## 現在の運用範囲

現在の実装は、ローカル利用または信頼できる閉じた環境での利用を想定しています。

- 公開インターネット向けの認証は未実装です。
- APIはCORS `*`です。
- frontendのAPI URLは `http://127.0.0.1:4174` 固定です。
- 複数ユーザーによる同時編集や競合解決は想定していません。
- SQLiteファイルを使うため、serverless環境の一時ファイルシステムには適していません。

公開Webアプリとして運用するには、認証、CORS制限、API URL設定、永続ディスク、backup、validation強化が別途必要です。

## Requirements

- Node.js 24推奨
- npm
- `node:sqlite` が利用可能なNode.js環境

`package.json`には `engines` 指定はありません。GitHub ActionsのCIはNode.js 24で実行されています。

## Install

```bash
npm install
```

repository URLを使ってcloneする場合:

```bash
git clone https://github.com/Shuhei-I/coffee-blend-lab
cd coffee-blend-lab
npm install
```

## Development

frontendとAPI serverは別terminalで起動します。

Terminal 1: SQLite API server

```bash
npm run dev:server
```

Terminal 2: Vite frontend

```bash
npm run dev
```

通常のURL:

```text
frontend: http://127.0.0.1:5173
API:      http://127.0.0.1:4174
```

Viteのportは使用状況により変わることがあります。frontendからAPIへの接続先は `src/data/apiClient.js` の `http://127.0.0.1:4174` です。

API serverが起動している場合はSQLite modeになります。API初期取得に失敗した場合はLocal modeになり、browserのlocalStorageへ保存します。

## Data Modes

### SQLite mode

API serverが利用可能な場合、アプリはSQLite modeとして動作します。

- 初期データは `GET /api/state` から取得します。
- 豆、抽出方法、RecipeSeries、選択中抽出方法はAPI経由で保存されます。
- レシピと選択中抽出方法は、localStorageにも互換用データとして保存されます。
- SQLite DBの既定保存先は `data/coffee-manager.sqlite` です。
- `COFFEE_MANAGER_DB_PATH` でDB保存先を変更できます。
- process再起動後もDBファイルが残っていればデータは保持されます。

### Local mode

API初期取得に失敗した場合、アプリはLocal modeとして動作します。

- browserのlocalStorageへ保存します。
- SQLiteとは別データです。
- SQLiteとの自動mergeや同期はありません。

Local modeで編集したデータは、API復旧時にSQLiteへ自動的に統合されません。

## Environment Variables

| Variable | Default | Description |
| --- | --- | --- |
| `PORT` | `4174` | API server port |
| `COFFEE_MANAGER_DB_PATH` | `data/coffee-manager.sqlite` | SQLite DB path |

`.env`の自動読み込みは実装していません。環境変数はshellから設定してください。

PowerShell:

```powershell
$env:PORT = "4174"
npm run dev:server
```

```powershell
$env:COFFEE_MANAGER_DB_PATH = "C:\path\to\coffee-manager.sqlite"
npm run dev:server
```

Unix系shell:

```bash
PORT=4174 npm run dev:server
```

```bash
COFFEE_MANAGER_DB_PATH=/path/to/coffee-manager.sqlite npm run dev:server
```

## Scripts

| Command | Description |
| --- | --- |
| `npm run dev` | Vite frontend development serverを `127.0.0.1` で起動 |
| `npm run dev:server` | Node.js API serverを起動 |
| `npm test` | Vitest test suiteを実行 |
| `npm run build` | frontend production buildを作成 |
| `npm run preview` | build済みfrontendをVite previewで確認 |

`npm run preview` はAPI serverを含みません。SQLite modeで確認する場合は、別terminalで `npm run dev:server` も起動してください。

## Testing and CI

ローカル確認:

```bash
npm test
npm run build
node --check server/index.js
node --check server/db.js
```

GitHub ActionsのCIは `.github/workflows/ci.yml` で定義されています。

- trigger: `main` へのpush、`main` 向けpull request、manual trigger
- Node.js: 24
- install: `npm ci`
- checks:
  - `npm test`
  - `npm run build`
  - `node --check server/index.js`
  - `node --check server/db.js`

`git diff --check` はCIには含まれていません。

## Production Build

```bash
npm run build
```

生成先は `dist/` です。

現在のbuildはfrontend静的ファイルのみを生成します。production API serverと静的ファイルを一体配信するscriptはありません。`npm run preview` は本番サーバーではなく、build結果のローカル確認用です。

現時点では、ローカル開発・ローカル運用を主用途としています。

## Data Backup

SQLite modeのDB既定保存先:

```text
data/coffee-manager.sqlite
```

SQLiteはWAL modeを使用します。稼働中は `coffee-manager.sqlite-wal` と `coffee-manager.sqlite-shm` が存在する場合があります。簡単で安全なbackupは、API serverを停止してからDBファイルをcopyする方法です。

backup:

1. API serverを停止する。
2. `data/coffee-manager.sqlite` を別の場所へcopyする。
3. `-wal` / `-shm` が残っている場合は、server停止後に必要に応じて同じ場所へ退避する。

restore:

1. API serverを停止する。
2. 現在のDBファイルを別名で退避する。
3. backupした `coffee-manager.sqlite` を元の場所へ戻す。
4. API serverを起動してデータを確認する。

オンライン中の単純copyは推奨しません。

## API Overview

現在のAPIは認証なしです。public APIとして公開しないでください。

| Endpoint | Description |
| --- | --- |
| `GET /api/state` | beans、brewMethods、selectedBrewMethodId、recipeSeries、legacy recipes互換配列を取得 |
| `PUT /api/beans` | beans全体を保存 |
| `PUT /api/brew-methods` | brewMethods全体を保存 |
| `PUT /api/recipes` | recipeSeries、またはlegacy recipes配列を保存 |
| `PUT /api/settings/selected-brew-method` | 選択中抽出方法IDを保存 |
| `OPTIONS` | CORS preflightへ204で応答 |

PUTは現在のstate全体を保存する形式です。単一ユーザー利用を想定しています。request validationは限定的で、不正JSONなどは現在500 responseになります。

## Architecture

```text
src/
  components/  UI components
  hooks/       React state and editor state
  domain/      Pure business rules, calculations, defaults, export data
  data/        API client and repository implementations
  services/    Browser-side side effects such as file download
server/
  index.js     HTTP API
  db.js        SQLite schema, migration, seed, persistence
docs/
  production-readiness-plan.md
  release-smoke-test.md
```

責務の分け方:

- `domain/` はReact、browser API、repositoryに依存しない純粋処理を置きます。
- `hooks/` はReact state、初期ロード、editor stateを管理します。
- `data/` はAPI/localStorage/repositoryの保存先差分を扱います。
- `services/` はdownloadなどのbrowser副作用を扱います。
- `main.jsx` は画面構成、props接続、UI orchestrationを担当します。
- `server/` はHTTP APIとSQLite永続化を担当します。

## Recipe Data Model

保存済みレシピはRecipeSeriesとして管理されます。

- RecipeSeriesは複数versionを持ちます。
- `currentVersionId` は現在の代表versionを示します。
- seriesは `active` または `archived` のstatusを持ちます。
- versionには豆比率、焙煎度、抽出方法、試飲評価、メモ、保存日時などが入ります。
- 豆と抽出方法は保存時にsnapshotを持ちます。
- masterから豆や抽出方法を削除しても、過去recipeはsnapshotにより表示・exportできます。

## Export

保存済みRecipeSeriesはJSONまたはCSVでexportできます。

| Format | Filename | MIME type |
| --- | --- | --- |
| JSON | `coffee-blend-recipes.json` | `application/json` |
| CSV | `coffee-blend-recipes.csv` | `text/csv` |

仕様:

- archived seriesも含みます。
- bean snapshot / brew method snapshotを利用します。
- CSVは全項目quoteされます。
- CSV delimiterは`,`です。
- CSV改行は `\n` です。
- UTF-8で出力されます。
- BOMは付与しません。
- CSV列には `roastLevel` が含まれます。

CSVはUTF-8 BOMなしで出力されます。Windows版Excelで直接開くと、日本語が文字化けする場合があります。その場合はExcelの「データ」からUTF-8として読み込んでください。

## Known Limitations

- 認証なし。
- CORS `*`。
- frontend API URLはlocalhost固定。
- 複数ユーザー競合制御なし。
- API payload validationが限定的。
- SQLite migration履歴テーブルなし。
- SQLiteとlocalStorageの自動同期なし。
- production一体起動scriptなし。
- browser E2Eなし。
- CSVはBOMなし。
- serverless ephemeral filesystem非対応。

## Manual Smoke Test

リリース前の手動確認は [docs/release-smoke-test.md](docs/release-smoke-test.md) を参照してください。

## Deployment Notes

現構成は、persistent volume付きのNode.js環境に向いています。

- Vercel単体は現構成に不向きです。SQLiteの永続化とNode API常駐が前提だからです。
- Render、Railway、Fly.io、VPSなど、永続ディスクを持てるNode環境では構成可能です。
- 公開運用には、API URL設定、CORS制限、認証、backup、監視が必要です。
- 現在はdeployment手順を保証していません。
