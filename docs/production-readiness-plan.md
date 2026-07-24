# Coffee Blend Lab Production Readiness Plan

作成日: 2026-07-24  
対象リポジトリ: `coffee-manager`

この計画は、現在動作している機能を維持しながら、今後の機能追加、データ保全、公開運用に耐えるコードベースへ段階的に改善するためのものです。この段階では実装変更は行わず、調査結果と改善順序を整理します。

## 1. 現状の構造

### ディレクトリ構成

```text
coffee-manager/
  assets/
    coffee-blend-workbench.png     # ヘッダー背景画像
  data/                            # SQLiteローカルデータ。Git管理外
  dist/                            # Viteビルド成果物。Git管理外
  server/
    index.js                       # Node HTTP APIサーバー
    db.js                          # SQLiteスキーマ、マイグレーション、保存/取得処理
  src/
    main.jsx                       # Reactアプリ全体、状態管理、計算、保存、画面コンポーネント
    styles.css                     # 全画面のスタイル
  index.html                       # ViteエントリHTML
  package.json                     # npm scripts と依存関係
  README.md                        # 開発手順と機能説明
```

### 主要ファイルの責務

- `src/main.jsx` 約1222行: Reactエントリ、画面切り替え、全状態管理、localStorage永続化、API通信、ブレンド比率/味覚プロファイル/コスト/抽出量計算、レシピシリーズ管理、JSON/CSVエクスポート、UIコンポーネントをすべて含む。
- `src/styles.css` 約692行: ヘッダー、ナビゲーション、ブレンド作成、レシピ一覧、豆マスタ、抽出方法マスタ、レスポンシブ表示を一括管理する。
- `server/index.js` 約76行: `GET /api/state` と複数の `PUT` APIを提供するローカルHTTPサーバー。CORSは全許可。
- `server/db.js` 約618行: `node:sqlite` を直接使い、テーブル作成、カラム追加、初期データ投入、旧レシピ移行、全件置換保存、データ取得を行う。
- `package.json`: `dev`, `dev:server`, `build`, `preview` のみ。テスト、lint、型チェック、CI用スクリプトはない。

### 現在の画面

- ブレンド作成: レシピ名、変更メモ、豆比率、粉量、抽出比率、抽出方法、味覚プロファイル、試飲メモ。
- レシピ一覧: レシピシリーズ、バージョン展開、最新読込、アーカイブ、復元、バージョン削除、JSON/CSVエクスポート。
- 豆マスタ: 豆の追加、削除、名称、メモ、表示可否、原価、味覚プロファイル編集。
- 抽出方法マスタ: 抽出方法の追加、削除、名称、メモ、蒸らし/注湯比率、蒸らし秒数編集。

### 保存方式

- フロントエンドは常に `localStorage` に保存する。
- 起動時に `http://127.0.0.1:4174/api/state` を取得できた場合のみ SQLite モードへ切り替わる。
- SQLite モードでも `localStorage` への保存は続く。
- 豆マスタと抽出方法マスタは明示的な Save/Revert。
- レシピシリーズと選択中抽出方法は state 変更時に自動で API 保存キューへ入る。

## 2. 依存関係

### 画面と状態

- `App` が全状態を所有し、子コンポーネントへ props とコールバックを渡す。
- `BlendBuilder`, `Dosing`, `ProfilePanel`, `SensoryPanel`, `RecipeLibrary`, `BeanMaster`, `BrewMethodMaster` は画面表示を担当するが、更新ロジックの多くは `App` 内にある。
- 画面切り替えはルーターではなく `activePage` の条件分岐で行う。

### 計算ロジック

- `buildProfile`, `buildBlendCost`, `getPourTotal`, `normalizePercent`, `normalizeRatios` がブレンドや抽出量の計算に関わる。
- 計算関数の一部は純粋関数だが、`normalizeRatios` は React state と `blendBeans/total` に依存しており単体テストしにくい。
- 計算式の仕様がREADME以上には明文化されていない。

### データ変換

- `normalizeBeans`, `normalizeRecipeSeries`, `flattenRecipeSeries`, `saveRecipeVersion`, `snapshotBean`, `snapshotBrewMethod`, `getRecipeBean`, `getRecipeBrewMethod` がデータ互換性を支える。
- 同等の初期データ、スナップショット、レシピ移行ロジックが `src/main.jsx` と `server/db.js` に重複している。

### データ保存

- ブラウザ側: `readStorage`, 複数の `localStorage.setItem`, `fetchJson`, `putJson`, `queuePutJson`。
- サーバー側: `saveBeans`, `saveBrewMethods`, `saveRecipeSeries`, `setSetting`。
- サーバー保存は全件置換が中心。`saveRecipeSeries` は `DELETE FROM recipe_series` 後に全シリーズを再挿入する。

### API通信

- APIベースURLは `src/main.jsx` に `http://127.0.0.1:4174` として固定。
- サーバーは `127.0.0.1` に bind し、CORS は `*`。
- APIはバリデーションなしでJSON本文を受け取り、DB関数へ渡す。

## 3. 問題点一覧

| 分類 | 問題 | 対象 |
| --- | --- | --- |
| ファイル肥大 | `src/main.jsx` にUI、計算、保存、API、データ変換が集中している | `src/main.jsx` |
| ファイル肥大 | DBスキーマ、移行、シード、Repository処理が一体化している | `server/db.js` |
| 重複 | `defaultBeans`, `defaultBrewMethods`, `snapshotBean`, レシピ正規化/移行の考え方がフロントとサーバーで重複 | `src/main.jsx`, `server/db.js` |
| テスト不足 | テストランナー、ユニットテスト、E2E、APIテストがない | `package.json` |
| 公開環境不備 | API URLがlocalhost固定で、本番ホストやクラウドDBに接続できない | `src/main.jsx`, `server/index.js` |
| データ消失リスク | 全件置換保存で、途中失敗や古いクライアント保存により意図しない削除が起きやすい | `server/db.js` |
| 保存失敗の見落とし | 自動保存キューの失敗が `console.error` のみで、ユーザーに未保存状態を明示しない | `src/main.jsx` |
| 入力検証不足 | 空のID/名称、重複ID、比率合計、上限下限、文字数、データ形状をサーバーで検証していない | `server/index.js`, `server/db.js` |
| API堅牢性不足 | JSON body サイズ制限、Content-Type検証、405/400の使い分け、構造化エラーがない | `server/index.js` |
| セキュリティ | CORS `*`、認証なし、CSRF相当の保護なし。本番公開すると第三者から書き込み可能 | `server/index.js` |
| データ互換性 | localStorage旧キーとSQLite新スキーマの互換処理が分散し、仕様化されていない | `src/main.jsx`, `server/db.js` |
| 未使用/暫定実装 | `saveLegacyRecipes` は現在呼ばれていない。旧 `blend_recipes` 系テーブルも互換目的か不要か判断が必要 | `server/db.js` |
| アクセシビリティ | カスタム開閉ボタンが視覚的には矢印だがテキストなし。`canvas` は代替情報が限定的 | `src/main.jsx` |
| モバイル | マスタ行は多列入力を1列へ畳むが、項目数が多く編集効率が落ちる。操作ボタンの並びも長くなりやすい | `src/styles.css` |
| 国際化/文字列 | 表示文言がコード中に直書きされ、文字化け時の検知や一括修正が困難 | `src/main.jsx`, `server/db.js` |
| 運用 | ログ、監視、バックアップ、ヘルスチェック、マイグレーション管理、CI/CDがない | 全体 |

### バグが発生しやすい処理

- `Date.now()` ベースのID生成: 高頻度操作や複数タブで衝突の可能性がある。
- `saveRecipe` 内で一度作った `id` を後から `versionId` で上書きしており、意図の追跡が難しい。
- `loadRecipe` は現在の豆マスタに存在する豆だけを `blendRatios` に復元するため、削除済み豆のスナップショット比率がブレンド編集画面へ完全には戻らない可能性がある。
- `buildProfile` と `buildBlendCost` は比率合計が0の場合に divisor 1 を使う。0除算は避けられるが、意味上の「未計算」と「0評価」が区別されない。
- `getPourTotal` は100%でない抽出方法も保存できる。UIでは警告表示のみで保存ブロックはない。
- `queuePutJson` は失敗しても保存キューを継続するが、リトライやユーザー通知がない。
- `readJson` はリクエスト本文サイズ制限がなく、大きなJSONでメモリを消費する可能性がある。
- `saveBeans` と `saveBrewMethods` は送信されなかったIDを削除するため、壊れたリクエストや古い状態の保存がデータ削除につながる。
- `saveRecipeSeries` は全シリーズ削除後に再挿入する設計。トランザクションはあるが、同時書き込み、古いクライアント、バリデーション不足に弱い。

### テストしにくい構造

- UIコンポーネントと業務ロジックが同じファイル内にあり、純粋関数だけを import してテストできない。
- `localStorage`, `fetch`, `window.confirm`, `Blob`, `URL.createObjectURL`, `canvas` を直接呼び出しており、テスト時のモック範囲が広い。
- サーバー起動時に `db.js` import だけでDBファイル作成、スキーマ作成、シード、移行が実行されるため、DBテストの初期化を制御しにくい。
- APIハンドラが `createServer` のコールバック内に直書きされ、サーバーを起動せずにルーティングだけをテストしにくい。

### エラーハンドリング不足

- API起動失敗時は localStorage にフォールバックするが、どのデータが正かをユーザーへ明示しない。
- 自動保存失敗時は `console.error` のみ。
- `readStorage` と `parseJson` は失敗時に fallback するだけで、破損データの通知や退避がない。
- サーバーエラーは `{ error: error.message }` を500で返すだけで、クライアント向け分類がない。
- SQLite書き込み失敗、ディスク容量不足、DBロック、スキーマ移行失敗時の復旧手順がない。

### 入力値検証不足

- サーバー側で必須項目、型、範囲、重複ID、配列長、文字数、色コード形式、比率合計を検証していない。
- クライアント側の `min/max` はブラウザUIの補助であり、直接API呼び出しには効かない。
- センサリー評価は0から10の想定だが保存時にサーバー検証されない。
- レシピ名、豆名、抽出方法名の空文字や過長文字列がDBへ入る可能性がある。

### データ消失や保存失敗につながる可能性

- `localStorage` とSQLiteの二重保存で、起動時の取得成功/失敗により見えるデータが切り替わる。
- SQLite APIが一時的に落ちている間にlocalStorageへ保存し、その後APIが復旧した場合のマージ方針がない。
- 複数タブや複数ブラウザで同時編集した場合、最後に保存した全件状態で上書きされる。
- サーバー保存APIは全体配列を信頼しており、部分的に古い配列を送ると削除扱いになる。
- DBバックアップ、エクスポート自動化、復元手順がない。

### セキュリティ上の問題

- 認証・認可がない。
- CORSが全オリジン許可。
- CSRF対策やSameSite Cookie設計がない。
- APIレスポンスに内部エラーメッセージをそのまま返す。
- Rate limit、リクエストサイズ制限、監査ログがない。
- 本番でクラウドDBへ接続する場合の秘密情報管理方式が未定。

### 公開環境で動作しない設定・実装

- フロントのAPI URLが `http://127.0.0.1:4174` 固定。
- サーバーが `127.0.0.1` 固定で listen しており、ホスティング環境のルーティング前提がない。
- `node:sqlite` はNodeバージョン要件が強く、一般的なサーバレス環境では永続ディスクやSQLite利用に制約がある。
- `data/` 配下のローカルDB前提で、クラウドDB、バックアップ、マイグレーション履歴がない。

### 未使用コード・不要依存・暫定実装

- `saveLegacyRecipes` は現状未使用。旧形式保存のために残すか削除するか判断が必要。
- `blend_recipes` と `blend_recipe_beans` は移行元互換として残っているが、今後の扱いが未定。
- `@vitejs/plugin-react` は依存関係にあるが、明示的な `vite.config.*` がない。ViteのReact連携として必要か確認が必要。
- `dist/` と `node_modules/` は存在するがGit管理外。通常は問題ないが、配布物として扱わない方針を明記する。

### モバイル表示とアクセシビリティ

- レスポンシブCSSはあるが、マスタ編集の入力項目が多く、モバイルでは長い縦フォームになる。
- `canvas` は視覚表示が中心で、スクリーンリーダー向けの数値説明はメーター側に依存している。
- icon相当の開閉ボタンは視覚的な矢印のみで、ラベルは `aria-label` と `title` に依存している。
- 保存失敗、未保存、警告が視覚表示中心で、`role="status"` や `aria-live` が十分ではない。
- 色による状態表現が多く、コントラストと色覚多様性の確認が必要。

### 現在の機能を壊す可能性が高い変更箇所

- レシピシリーズ正規化、保存、移行: 既存localStorageとSQLiteデータの互換性に直結する。
- 豆削除とスナップショット: 保存済みレシピの再表示・エクスポートに影響する。
- 抽出方法スナップショットと選択中抽出方法: 保存済みレシピ読込時の表示に影響する。
- 比率、プロファイル、コスト、抽出量計算: 業務ロジックであり、推測変更禁止。
- API URLと保存モード切替: localStorage/SQLiteのどちらを正とするかに影響する。
- DB全件置換保存: 部分更新へ変える際に削除/並び/更新日時の意味が変わる可能性がある。

## 4. 推奨アーキテクチャ

現在のReact + Vite + Node HTTP + SQLite方針は維持し、段階的に責務を分離する。

```text
src/
  app/
    App.jsx
    pages/
    components/
  domain/
    coffee/
      calculations.js        # buildProfile, buildBlendCost, getPourTotal
      recipeSeries.js        # normalize, saveVersion, sorting, snapshots
      validation.js          # クライアント入力検証
      defaults.js            # 初期データ
  services/
    storage/
      localStorageStore.js
      apiClient.js
      repository.js          # local/sqlite/cloud差し替え境界
  styles/
    styles.css

server/
  app.js                     # ルーティングとハンドラ。listenしない
  index.js                   # 起動だけ
  db/
    connection.js
    schema.js
    migrations/
    repositories/
    validation.js
  shared/
    schema.js or contracts.js
```

### 原則

- まずテスト可能な純粋関数を抽出し、計算式を変えずにテストで固定する。
- データ形式は「アプリ内部モデル」「API payload」「DB row」を分ける。
- 保存処理はRepository境界を作り、localStorage、SQLite、将来のクラウドDBを差し替え可能にする。
- APIにはバリデーション、認証、エラー形式、リクエストサイズ制限を追加する。
- DB変更は手続き型の `ensureColumns` から、履歴を持つマイグレーションへ移行する。
- UIは全面変更せず、既存デザインを維持してアクセシビリティとモバイル編集性を改善する。

## 5. 優先順位付き改善ロードマップ

### Phase 1: 安全に変更するためのテスト基盤

| タスク名 | 対象ファイル | 現在の問題 | 実施する変更 | 変更する理由 | 変更によるリスク | 事前に必要な作業 | 完了条件 | 必要なテスト | 規模 |
| --- | --- | --- | --- | --- | --- | --- | --- | --- | --- |
| ビルド・現状動作の基準化 | `package.json`, `README.md`, `docs/` | `npm run build` 以外の品質ゲートがない | 現在の主要操作を手動テスト手順として文書化し、期待結果を固定する | テスト導入前に既存挙動を守る基準が必要 | 文書と実装がずれる | 既存画面の操作確認 | 手順に沿ってブレンド保存、読込、マスタ保存、エクスポートを確認できる | 手動スモークテスト | 小 |
| ユニットテスト導入 | `package.json`, `src/domain/**` | 計算/正規化関数がテストされていない | Vitestを追加し、計算とデータ変換をテスト | リファクタリング時に業務ロジックを守る | 新規依存が増える。代替はNode標準testだがReact/Viteとの親和性は低い | テスト対象関数の抽出方針決定 | `npm test` で計算/正規化テストが通る | `buildProfile`, `buildBlendCost`, `getPourTotal`, `normalizeRecipeSeries`, `saveRecipeVersion` | 中 |
| API/DBスモークテスト | `server/index.js`, `server/db.js`, `server/app.js` | サーバー処理が起動しないとテストしづらい | listenしないhandler/appを分離し、一時DBでAPIを検証 | 保存失敗や移行事故を早期検知する | サーバー構成に小変更が必要 | DBパスを注入可能にする設計 | 一時DBでGET/PUTの基本操作を検証できる | API GET/PUT、初期データ投入、保存後再取得 | 中 |
| E2Eスモークテスト | `package.json`, `tests/e2e/**` | 画面操作の回帰検知がない | Playwright導入を検討し、主要ワークフローを1本作る | UIと保存の結合事故を検知する | ブラウザ依存と実行時間増 | ユニット/APIテストの最低限整備 | CIで主要操作が通る | ブレンド作成、レシピ保存、読込、エクスポートボタン表示 | 中 |

### Phase 2: コード構造のリファクタリング

| タスク名 | 対象ファイル | 現在の問題 | 実施する変更 | 変更する理由 | 変更によるリスク | 事前に必要な作業 | 完了条件 | 必要なテスト | 規模 |
| --- | --- | --- | --- | --- | --- | --- | --- | --- | --- |
| 計算関数の抽出 | `src/main.jsx`, `src/domain/coffee/calculations.js` | 計算がUIファイル内にありテストしにくい | `buildProfile`, `buildBlendCost`, `getPourTotal`, `normalizePercent` を抽出 | 業務ロジックを固定しやすくする | import差し替えミス | Phase 1の計算テスト | UI表示値が変更前と一致 | ユニット、ビルド | 小 |
| レシピシリーズ処理の抽出 | `src/main.jsx`, `src/domain/coffee/recipeSeries.js` | 正規化、保存、スナップショットがUIと混在 | `normalizeRecipeSeries`, `saveRecipeVersion`, `sortVersions`, `snapshot*` を抽出 | 保存互換性を保ちながら再利用する | 既存データ復元を壊す可能性 | 旧localStorageサンプルを用意 | 旧/新形式の読み込み結果が一致 | ユニット、手動読込 | 中 |
| コンポーネント分割 | `src/main.jsx`, `src/app/**` | 1222行に全画面が集中 | 画面単位と共通部品へ分割 | 変更範囲を狭くする | props受け渡しミス | 計算/レシピ抽出完了 | 画面表示と操作が現状同等 | E2Eスモーク、ビルド | 中 |
| ストレージサービス分離 | `src/main.jsx`, `src/services/storage/**` | localStorageとAPI呼び出しがApp内に直書き | `apiClient`, `localStorageStore`, `coffeeRepository` を作る | 保存方式変更の影響を閉じ込める | 保存タイミングの変化 | レシピ処理抽出完了 | local/SQLite両モードが同じAPIで扱える | APIモックテスト、手動保存 | 中 |
| CSS整理 | `src/styles.css`, `src/styles/**` | 全スタイルが1ファイル | 画面単位またはセクション単位に整理。ただし見た目は維持 | UI変更時の影響を限定する | CSS優先順位の変化 | 画面スクリーンショット基準 | 主要画面の見た目差分が意図範囲内 | ビジュアル確認、モバイル確認 | 中 |

### Phase 3: データ保存処理の整理

| タスク名 | 対象ファイル | 現在の問題 | 実施する変更 | 変更する理由 | 変更によるリスク | 事前に必要な作業 | 完了条件 | 必要なテスト | 規模 |
| --- | --- | --- | --- | --- | --- | --- | --- | --- | --- |
| データモデル仕様書作成 | `docs/data-model.md`, `src/domain/**`, `server/db.js` | データ形式がコードからしか分からない | Bean, BrewMethod, RecipeSeries, RecipeVersionの契約を文書化 | 互換性維持の基準にする | 実装と文書の差異 | 現DBとlocalStorageサンプル調査 | 必須/任意/既定値/互換キーが明記される | 文書レビュー | 小 |
| 保存APIの部分更新化検討 | `server/db.js`, `server/index.js` | 全件置換で削除リスクが高い | まず現行全件保存にバリデーションと世代管理を追加し、段階的に部分更新APIへ移行 | 古い状態による上書き削除を減らす | API契約変更 | Phase 1/2完了、モデル仕様 | 既存PUT互換を残しつつ安全な更新APIを追加 | APIテスト、互換テスト | 大 |
| DBマイグレーション管理 | `server/db.js`, `server/db/migrations/**` | 起動時の手続き型ALTERのみ | `schema_migrations` テーブルと番号付きマイグレーションを導入 | 本番DB変更を追跡する | 移行失敗時の復旧が必要 | DBバックアップ手順 | 既存DBから新管理方式へ移行できる | 一時DB/既存DBコピーで移行テスト | 中 |
| 保存失敗の可視化 | `src/services/storage/**`, `src/app/**` | 自動保存失敗がユーザーに伝わらない | 保存状態、最終成功時刻、リトライ操作、競合警告をUIへ追加 | データ消失をユーザーが検知できる | UIが増える | ストレージサービス分離 | 失敗時に明確な未保存状態が出る | API失敗モック、手動確認 | 中 |
| バックアップ/エクスポート強化 | `server/db.js`, `server/index.js`, `src/**` | 手動JSON/CSVのみ | SQLiteバックアップ、全データJSONエクスポート、復元前検証を追加 | 復旧可能性を上げる | 復元機能は誤操作リスク | データモデル仕様 | バックアップと復元ドライランができる | バックアップ/復元テスト | 中 |

### Phase 4: 認証とクラウドデータベース対応

| タスク名 | 対象ファイル | 現在の問題 | 実施する変更 | 変更する理由 | 変更によるリスク | 事前に必要な作業 | 完了条件 | 必要なテスト | 規模 |
| --- | --- | --- | --- | --- | --- | --- | --- | --- | --- |
| 本番API設定化 | `src/services/storage/apiClient.js`, `package.json`, `.env.example` | API URLがlocalhost固定 | `VITE_API_BASE_URL` 等へ切り出し、未設定時は同一オリジンまたはlocal fallback | 本番環境へ接続可能にする | 設定ミスで保存不能 | ストレージサービス分離 | dev/preview/prodのAPI先を切替可能 | ビルド、設定別手動確認 | 小 |
| 認証方式決定 | `docs/auth-design.md`, `server/**` | 認証なし | セッションCookie/JWT/OAuthプロバイダ等の方式を比較し決定 | 公開時の書き込み保護に必須 | UXと実装範囲が変わる | ユーザー/共有要件確認 | 採用方式と代替案が文書化 | 設計レビュー | 小 |
| API認証・認可実装 | `server/index.js`, `server/app.js`, `server/auth/**` | 誰でも書き込み可能 | 認証ミドルウェア、ユーザー単位データ分離、CORS制限 | セキュリティ確保 | 既存ローカル利用が変わる | 認証方式決定 | 未認証書込不可、認証済みのみ自データ操作可 | API認証テスト、E2E | 大 |
| クラウドDB抽象化 | `server/db/**` | SQLiteローカルファイル前提 | Repositoryインターフェースを作り、クラウドDB実装を追加 | 本番運用とバックアップを可能にする | DB移行時の互換性 | データモデル/マイグレーション整備 | SQLiteとクラウドDBを設定で切替可能 | Repository契約テスト | 大 |
| 秘密情報管理 | `.env.example`, deployment config | 秘密情報運用が未定 | `.env.example`、本番環境変数、漏洩チェック方針を整備 | 認証情報混入を防ぐ | 運用手順が増える | ホスティング先決定 | コードに秘密情報がなく設定で注入される | CI secret scan検討 | 小 |

### Phase 5: エラー処理と入力値検証

| タスク名 | 対象ファイル | 現在の問題 | 実施する変更 | 変更する理由 | 変更によるリスク | 事前に必要な作業 | 完了条件 | 必要なテスト | 規模 |
| --- | --- | --- | --- | --- | --- | --- | --- | --- | --- |
| 共通バリデーション追加 | `src/domain/coffee/validation.js`, `server/db/validation.js` | 入力値検証が分散/不足 | 型、範囲、必須、重複ID、文字数、色、比率合計を検証 | 不正データ保存を防ぐ | 既存データが弾かれる可能性 | 既存データ棚卸し | 既存データ互換を維持しつつ新規不正値を拒否 | ユニット、API 400テスト | 中 |
| APIエラー形式統一 | `server/app.js`, `src/services/storage/apiClient.js` | 500中心で分類がない | `{ code, message, details }` 形式、400/401/403/409/413/500を使い分け | UIで適切に表示する | 既存クライアント処理変更 | apiClient分離 | エラー分類がUIに伝わる | APIテスト、UI失敗表示 | 中 |
| リクエスト制限 | `server/index.js` | JSON bodyサイズ制限なし | 最大サイズ、Content-Typeチェック、タイムアウトを追加 | DoS/誤送信対策 | 大量データ移行時に制限へ当たる | 許容量確認 | 上限超過は413で拒否 | APIテスト | 小 |
| クライアント入力UX改善 | `src/app/**` | HTML min/max中心で保存前検証が弱い | エラー表示、保存ボタン制御、比率合計/抽出比率警告の明確化 | 保存前に問題を修正できる | 操作が厳しく感じられる | バリデーション仕様 | 不正入力時に理由が表示される | コンポーネント/E2E | 中 |

### Phase 6: UI・UXとアクセシビリティ

| タスク名 | 対象ファイル | 現在の問題 | 実施する変更 | 変更する理由 | 変更によるリスク | 事前に必要な作業 | 完了条件 | 必要なテスト | 規模 |
| --- | --- | --- | --- | --- | --- | --- | --- | --- | --- |
| 文字列管理と文字化け検知 | `src/domain/coffee/defaults.js`, `src/app/**`, `server/db.js` | 表示文言と初期データが直書き | 文字列/初期データを集約し、UTF-8前提を明記 | 文言修正と検証を容易にする | 文言差分が大きく見える | 既存文言の意図確認 | UI文言が一箇所で管理される | ビルド、画面確認 | 中 |
| 保存状態UI改善 | `src/app/**` | 保存失敗やlocal/SQLite差が分かりにくい | ステータス表示、未保存警告、リトライ導線を追加 | データ消失防止 | UI密度が上がる | 保存サービス分離 | 保存状態が画面上で追える | API失敗E2E | 中 |
| モバイル編集改善 | `src/styles.css`, `src/app/**` | マスタ編集が長い1列フォームになる | セクション分割、折りたたみ、保存バー固定などを検討 | スマホでの編集負担を減らす | UI変更範囲が広い | 現行スクリーンショット | 主要編集が360px幅で破綻しない | レスポンシブ確認 | 中 |
| アクセシビリティ改善 | `src/app/**`, `src/styles.css` | aria-live、キーボード操作、canvas代替が不足 | 状態通知、フォーカス管理、ボタン名、テキスト代替、コントラスト確認 | 公開品質を満たす | DOM構造変更の影響 | コンポーネント分割 | キーボードのみで主要操作可能 | 手動a11y、可能ならaxe | 中 |

### Phase 7: 監視、CI、デプロイ、運用基盤

| タスク名 | 対象ファイル | 現在の問題 | 実施する変更 | 変更する理由 | 変更によるリスク | 事前に必要な作業 | 完了条件 | 必要なテスト | 規模 |
| --- | --- | --- | --- | --- | --- | --- | --- | --- | --- |
| CI導入 | `.github/workflows/**`, `package.json` | 自動検証がない | build/test/lint/E2EスモークをPRで実行 | 回帰を防ぐ | CI時間増 | Phase 1のテスト | PRごとに品質ゲートが走る | CI実行 | 中 |
| Lint/Format導入 | `package.json`, config files | コードスタイルと潜在バグ検知がない | ESLint/Prettier導入を検討 | レビュー負荷を下げる | 初回差分が大きい | リファクタリング前に設定方針 | `npm run lint` が通る | lint | 小 |
| ヘルスチェック | `server/app.js`, deployment config | サーバー状態確認APIがない | `GET /healthz` を追加 | デプロイ/監視で死活確認する | なし | API分離 | 依存DB込み/なしのヘルスが分かる | APIテスト | 小 |
| 構造化ログ | `server/**` | `console.log/error` 中心 | リクエストID、エラーコード、保存失敗を記録 | 障害調査を可能にする | ログに個人情報を出さない配慮 | エラー形式統一 | エラー原因をログで追える | API失敗テスト | 中 |
| デプロイ設計 | `docs/deployment.md`, config | 本番ホスト未定 | 静的フロント、API、DB、バックアップ、環境変数、ロールバックを設計 | リリース可能にする | ホスティング制約 | 認証/DB方針決定 | 手順通りにstagingへデプロイ可能 | stagingスモーク | 中 |
| 監視/バックアップ運用 | deployment config, docs | DBバックアップと障害検知がない | 定期バックアップ、復元テスト、エラー通知を整備 | データ消失を防ぐ | 運用コスト | クラウドDB決定 | 復元手順が実証済み | 復元リハーサル | 中 |

## 6. 最初に着手すべきタスク

最初の実装タスクとしては、Phase 1の「ユニットテスト導入」と、その前提となる最小限の「計算関数の抽出」を1つの小さなPRで行うのが適切です。

ただし、リファクタリングと挙動変更を混ぜないため、最初のPRでは以下に限定します。

- `buildProfile`, `buildBlendCost`, `getPourTotal`, `normalizePercent` を `src/domain/coffee/calculations.js` へ移す。
- 関数の中身と計算式は変更しない。
- Vitestを追加する場合は追加理由をPRに明記する。代替案はNode標準testだが、Vite/ReactプロジェクトではVitestの方が設定と実行体験が自然。
- 既存の代表ケースをテストで固定する。
- `npm run build` と `npm test` が通ることを完了条件にする。

## 7. リスク一覧

| リスク | 影響 | 対策 |
| --- | --- | --- |
| 計算式を誤って変更する | 保存済み/新規レシピの値が変わる | 先にユニットテストで現状値を固定 |
| 旧localStorageデータを読めなくする | ユーザーの既存データが消えたように見える | 旧キーと旧形式の互換テストを作る |
| SQLite全件置換のまま本番化する | 古い状態でデータ削除が起きる | 世代管理、部分更新、競合検知を導入 |
| 認証なしで公開する | 第三者が閲覧/書込できる | 公開前に認証とCORS制限を必須化 |
| API URL固定のままリリースする | 本番フロントから保存できない | 環境変数化と同一オリジン設定 |
| DBマイグレーション失敗 | 起動不能またはデータ破損 | バックアップ、移行テスト、ロールバック手順 |
| 二重保存の正本不明 | localStorageとSQLiteの差分で混乱 | 保存モードと同期方針を明文化 |
| UI分割で操作が変わる | 既存ユーザーの作業導線を壊す | UI全面変更は避け、E2Eで主要導線を固定 |
| 新依存の追加過多 | 保守負荷、脆弱性対応増 | 追加理由と代替案をPRに明記 |

## 8. 確認が必要な仕様

- ブレンド比率の合計は保存時に必ず100%であるべきか、100%未満/超過も試作として保存可能か。
- 抽出方法の注湯比率合計は100%必須か、警告のみで保存可能か。
- 味覚プロファイルの計算は合計比率が100%でない場合も現在の正規化計算で正しいか。
- 比率0の豆をレシピに保存する必要があるか。
- 削除済み豆を含む保存済みレシピを再編集するとき、豆スナップショットを一時的に編集画面へ復元すべきか。
- localStorageとSQLiteのどちらを正本とするか。API復旧時の同期/マージ方針。
- 複数ユーザー、複数端末、複数タブでの同時編集をサポートするか。
- レシピシリーズのアーカイブは論理削除だけでよいか、完全削除機能が必要か。
- クラウドDBではユーザーごとにデータを分離するか、チーム共有するか。
- 認証方式はメール/パスワード、OAuth、既存IdP連携のどれを採用するか。
- 保存データに個人情報や業務上の秘密が含まれる想定があるか。
- 本番ホスティング先、バックアップ保持期間、復元目標時間、監視通知先。

## 9. リリース判定基準

公開リリース前に最低限満たすべき基準:

- `npm run build` がCIで成功する。
- 計算、データ正規化、保存API、DB移行のユニット/APIテストがある。
- ブレンド作成、レシピ保存、レシピ読込、マスタ保存、エクスポートのE2Eスモークが通る。
- 既存localStorageデータと既存SQLiteデータの互換テストが通る。
- API URL、本番DB接続、秘密情報が環境変数で管理され、コードに秘密情報がない。
- 公開APIに認証、認可、CORS制限、リクエストサイズ制限、入力検証がある。
- 保存失敗、競合、オフライン/サーバー停止時のユーザー向け表示がある。
- DBバックアップと復元手順が文書化され、少なくともstagingで復元確認済み。
- ヘルスチェック、エラーログ、最低限の監視通知がある。
- モバイル幅で主要操作が破綻せず、キーボード操作とスクリーンリーダー向け基本情報が確認済み。
- リリース手順、ロールバック手順、データ移行手順が文書化されている。

## 10. 調査時の確認結果

- `npm run build` は成功した。
- `node --check server/index.js` と `node --check server/db.js` は成功した。
- Git作業ツリーは調査開始時点でクリーンだった。
- `data/`, `dist/`, `node_modules/`, `.env*`, SQLiteファイル、ログは `.gitignore` で除外されている。

