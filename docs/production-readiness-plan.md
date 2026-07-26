# Coffee Blend Lab Production Readiness Plan

作成日: 2026-07-24
最終更新日: 2026-07-26
対象repository: `coffee-manager`

この文書は、Coffee Blend Labのリリース前監査と今後の公開運用に向けた残課題を整理するためのものです。過去の構造リファクタリング計画は完了済みとして扱い、現在はローカルリリースと公開Webリリースを分けて評価します。

## 1. 現在の到達点

構造リファクタリングは完了しています。

完了済み:

- domain計算の分離
- defaultCoffeeDataの分離
- API client / localStorage repository / coffee repositoryの分離
- `useCoffeeData`による初期ロード、保存モード、保存エラー管理の分離
- `useRecipeEditor`によるレシピ編集stateの分離
- RecipeSeries normalization、保存、読み込み、管理操作のdomain分離
- recipe保存用domain処理の分離
- recipe読み込み時のeditor state変換の分離
- JSON / CSV export生成の分離
- browser download副作用の分離
- RecipeLibrary、BeanMaster、BrewMethodMaster、ProfilePanel、Dosing、BlendBuilder、RecipeNamePanel、SensoryPanelのcomponent分離
- SQLite API対応
- RecipeSeries / version対応
- archive / restore / version delete対応
- 焙煎度 `roastLevel` の保存、読み込み、export対応
- GitHub Actions CI導入

現在の主な残課題は、構造ではなく運用、公開、validation、E2Eです。

## 2. 現在の実行構成

```text
frontend: Vite + React
API:      Node.js HTTP server
DB:       SQLite via node:sqlite
fallback: browser localStorage
```

開発時はfrontendとAPI serverを別terminalで起動します。

```bash
npm run dev
npm run dev:server
```

既定:

- frontend: `http://127.0.0.1:5173`
- API: `http://127.0.0.1:4174`
- SQLite DB: `data/coffee-manager.sqlite`

frontendのAPI URLは `http://127.0.0.1:4174` 固定です。

## 3. ローカルリリース判定

ローカル利用または信頼できる閉じた環境であれば、リリース可能な状態です。

理由:

- 主要機能はdomain/component/hooks/repositoryに分離済み。
- RecipeSeries/version管理、SQLite保存、localStorage fallbackが実装済み。
- JSON / CSV exportが実装済み。
- CIでtest、build、server syntax checkを実行済み。
- ローカル運用に必要なREADMEと手動スモークテストを整備済み。

ローカルリリース前に必須:

- `npm test`
- `npm run build`
- `node --check server/index.js`
- `node --check server/db.js`
- 手動スモークテスト
- DB backup / restore手順の実地確認

## 4. 公開Webリリース判定

公開インターネット向けには未対応です。

公開前に必須:

- 認証、認可
- CORS制限
- API URLの環境変数化
- request validation
- payload size制限
- エラー形式の整理
- 永続ディスク付きdeployment設計
- backup / restore運用
- 監視、ログ
- browser E2E
- 複数ユーザーまたは単一ユーザー制限の明文化

## 5. リスク分類

### Blocker

公開Web運用に限り、認証なしとCORS `*` はblockerです。ローカル運用ではblockerではありません。

### High

| 問題 | 影響 | 推奨対応 |
| --- | --- | --- |
| SQLiteとlocalStorageの自動同期なし | API停止中のLocal mode編集がSQLiteへ自動統合されない | READMEで明記済み。将来、import/merge方針を設計 |
| API validationが限定的 | 不正payloadで不整合や500 responseにつながる | server側validationを追加 |
| DB backup運用が未自動化 | 障害時に復旧手順が人依存 | backup/restore手順を運用で確認 |

### Medium

| 問題 | 影響 | 推奨対応 |
| --- | --- | --- |
| production一体起動scriptなし | deployment手順が未確定 | deployment設計時に追加 |
| API URL localhost固定 | 別host運用に不向き | `VITE_API_BASE_URL` 等を検討 |
| browser E2Eなし | 起動から保存までの実ブラウザ保証が弱い | Playwright等の導入を検討 |
| SQLite migration履歴なし | schema変更履歴の追跡が弱い | migration管理方針を決める |

### Low

| 問題 | 影響 | 推奨対応 |
| --- | --- | --- |
| CSV BOMなし | Windows Excelで日本語が文字化けする場合がある | READMEに既知制限として記載。必要なら将来仕様変更 |
| `git diff --check` がCI外 | 空白エラー検出は手動 | CI追加を検討 |
| `.env.example` なし | 環境変数例がREADME依存 | 公開運用設計時に追加検討 |

## 6. 永続化方針

SQLite mode:

- API serverが利用可能な場合に使用。
- DB pathは `COFFEE_MANAGER_DB_PATH` で変更可能。
- `data/coffee-manager.sqlite` はGit管理外。
- SQLiteはWAL mode。
- API server停止中にDBファイルをcopyするbackupを推奨。

Local mode:

- API初期取得に失敗した場合に使用。
- browser localStorageへ保存。
- SQLiteとは別データ。
- 自動mergeなし。

## 7. API方針

現在のendpoint:

- `GET /api/state`
- `PUT /api/beans`
- `PUT /api/brew-methods`
- `PUT /api/recipes`
- `PUT /api/settings/selected-brew-method`
- `OPTIONS`

現在のAPIは単一ユーザーのローカル保存を前提にしています。public APIとして公開しないでください。

今後の改善候補:

- 400 / 413 / 500の使い分け
- request body validation
- Content-Type validation
- payload size制限
- structured error response
- 認証
- CORS origin制限

## 8. Export方針

JSON:

- `coffee-blend-recipes.json`
- `application/json`
- RecipeSeriesをflattenしたexport data
- archived seriesを含む
- snapshotを含む
- `ratios[].roastLevel` を含む

CSV:

- `coffee-blend-recipes.csv`
- `text/csv`
- UTF-8
- BOMなし
- 改行は `\n`
- 全値quote
- `roastLevel` 列を含む

Windows Excelで直接開く場合は、日本語が文字化けする可能性があります。

## 9. CIの状態

`.github/workflows/ci.yml`:

- trigger: `main` push、`main` pull request、manual trigger
- Node.js: 24
- install: `npm ci`
- test: `npm test`
- build: `npm run build`
- server syntax check:
  - `node --check server/index.js`
  - `node --check server/db.js`

不足:

- `git diff --check`
- lint
- browser E2E
- SQLite backup/restore smoke

## 10. Deployment適合性

| 環境 | 評価 |
| --- | --- |
| Vercel単体 | 不向き。SQLite永続化とNode API常駐が前提 |
| Render / Railway / Fly.io | persistent volumeを用意できるなら候補 |
| VPS | 最も単純。Node server、SQLite、backupを直接管理できる |
| ローカル専用運用 | 現在の実装に最も合う |

公開運用では、API URL、CORS、認証、backup、監視を先に設計してください。

## 11. 次の最小タスク

ローカルリリース前:

1. READMEに従ってclean checkout相当で起動確認する。
2. `docs/release-smoke-test.md` を手動実行する。
3. backup / restoreを実DBで確認する。
4. 監査結果をもとにRelease noteを作成する。

公開Web対応へ進む場合:

1. 認証方式とデータ分離方針を決める。
2. API URLとCORSの環境別設計を決める。
3. SQLite継続か外部DB移行かを決める。
4. validationとE2Eを追加する。
