# Coffee Blend Lab Supabase Migration Plan

作成日: 2026-07-27
対象ブランチ: `feature/supabase-web`

この文書は、Coffee Blend Labを現在のローカル構成からSupabaseを利用するWebアプリケーションへ移行するための設計書です。

今回は設計のみを行います。アプリケーションコード、`package.json`、`package-lock.json`、データベース、環境変数、CI設定は変更しません。

## 1. 移行の目的

現在のCoffee Blend Labは、ローカルNode API、SQLite、localStorage fallbackを使う単一ユーザー向けアプリです。Supabase移行の目的は、Web公開に向けて次の状態へ移行することです。

- Supabase PostgreSQLを永続化の正本にする。
- Supabase Authでユーザー認証を行う。
- ユーザーごとにデータを分離する。
- Row Level Securityにより、ブラウザから安全にアクセスできるテーブル設計にする。
- Vercelへfrontendをデプロイできる構成にする。
- 移行完了後にNode API、SQLite、localStorage fallbackを廃止する。

## 2. 現在の構成

```text
frontend: React + Vite
API:      Node.js HTTP server
DB:       SQLite via node:sqlite
fallback: browser localStorage
deploy:   local operation
```

現在の主なディレクトリ責務:

- `src/domain`: 純粋なビジネスロジック、計算、RecipeSeries操作、exportデータ生成
- `src/hooks`: React state、初期ロード、recipe editor state
- `src/data`: API client、localStorage repository、coffee repository
- `src/components`: UI components
- `src/services`: browser副作用
- `src/main.jsx`: composition、画面全体の調整、UI orchestration
- `server/index.js`: Node HTTP API
- `server/db.js`: SQLite schema、migration、seed、persistence

現在の主なデータ:

- `beans`
- `brew_methods`
- `recipe_series`
- `recipe_versions`
- `recipe_version_beans`
- `app_settings`

RecipeSeriesとRecipeVersionが正本です。レシピ保存時にはBeanとBrewMethodのsnapshotを保持しています。

## 3. 移行後の構成

```text
frontend: React + Vite
auth:     Supabase Auth
DB:       Supabase PostgreSQL
client:   Supabase JavaScript client in browser
deploy:   Vercel
```

移行後の方針:

- ReactとViteは維持する。
- domainロジックとUI componentは可能な限り維持する。
- repository境界を使って保存層をSQLite/localStorageからSupabaseへ差し替える。
- ブラウザにはSupabase anon/public keyのみを配置する。
- `service_role` keyなどの秘密鍵はブラウザへ配置しない。
- 公開テーブルはRLSを有効にする。
- `auth.uid()` と各行の `user_id` によりユーザー所有データを分離する。

## 4. 移行対象と非対象

### 移行対象

- 永続化先をSupabase PostgreSQLへ変更する。
- Supabase Authを導入する。
- ユーザーごとのデータ分離を導入する。
- Supabase repositoryを追加する。
- 初期ロード、保存、エラー表示をWeb運用向けに調整する。
- SQLiteデータまたはJSON exportからSupabaseへ移行する手順を用意する。
- Vercel Preview Deploymentで検証できる構成にする。

### 非対象

- React/Viteから別frameworkへの移行。
- domain計算仕様の変更。
- UI全面刷新。
- RecipeSeries / RecipeVersionの概念変更。
- 旧ローカル版の長期保守。
- Supabase以外のDB導入。

## 5. 最終的に削除するもの

移行完了後、動作確認とデータ移行が完了してから削除します。

- `server/index.js`
- `server/db.js`
- SQLite関連テスト
- Node API用script `dev:server`
- `src/data/apiClient.js`
- SQLite API repository実装
- localStorage fallbackを永続化手段として使う処理
- SQLite DB運用ドキュメント
- `data/` を前提にしたbackup手順

削除前に、旧ローカル版をGitタグ `local-v0.1.0` から参照できる状態にします。

## 6. 移行中は残すもの

Supabase版の動作確認が終わるまでは、既存実装を削除しません。

- Node API
- SQLite
- localStorage fallback
- 既存repository
- 既存テスト
- READMEのローカル運用記述

移行中は、Supabase repositoryを追加し、feature flagまたは明示的なrepository選択で段階的に切り替える方針を検討します。

## 7. Supabase Authの設計方針

Supabase Authをユーザー識別の正本にします。

基本方針:

- 未認証ユーザーはアプリデータを読み書きできない。
- ログイン後、`auth.uid()` を所有者IDとして使う。
- frontendはSupabase clientでsessionを取得する。
- sessionがない場合は未認証画面を表示する。
- logout時はeditor stateをクリアし、認証画面へ戻す。

認証方式は未確定です。候補:

- email + password
- magic link
- OAuth provider

最初の実装では、運用の簡単さとテスト容易性を優先して方式を決めます。

## 8. ユーザー所有データの考え方

ユーザーが作成・編集する全データは `user_id` を持ちます。

対象:

- beans
- brew_methods
- recipe_series
- recipe_versions
- recipe_version_beans
- app_settings

データ取得時は、RLSによりログイン中ユーザーの行だけが見えます。frontend側でも自分のデータだけを扱う前提にしますが、セキュリティ境界はRLSです。

## 9. PostgreSQLテーブル案

SQLiteを機械的に写すのではなく、現在のdomain modelを維持しつつPostgreSQL向けに整理します。

### beans

```sql
beans (
  id uuid primary key,
  user_id uuid not null references auth.users(id) on delete cascade,
  name text not null,
  note text not null default '',
  color text not null default '#12656b',
  visible_in_recipes boolean not null default true,
  cost_per_kg numeric not null default 0,
  acidity integer not null default 50,
  sweetness integer not null default 50,
  bitterness integer not null default 50,
  body integer not null default 50,
  aroma integer not null default 50,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
)
```

SQLiteの `ratio` はbean masterの正本としては使わないため、PostgreSQLでは原則持たせません。互換性が必要な場合だけmigration時に検討します。

### brew_methods

```sql
brew_methods (
  id uuid primary key,
  user_id uuid not null references auth.users(id) on delete cascade,
  name text not null,
  note text not null default '',
  bloom_percent integer not null default 0,
  pour1_percent integer not null default 0,
  pour2_percent integer not null default 0,
  pour3_percent integer not null default 0,
  bloom_seconds integer not null default 0,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
)
```

### recipe_series

```sql
recipe_series (
  id uuid primary key,
  user_id uuid not null references auth.users(id) on delete cascade,
  name text not null,
  goal text not null default '',
  status text not null default 'active',
  current_version_id uuid,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
)
```

`status` は `active` / `archived` を想定します。check constraintを追加する方針です。

### recipe_versions

```sql
recipe_versions (
  id uuid primary key,
  user_id uuid not null references auth.users(id) on delete cascade,
  series_id uuid not null references recipe_series(id) on delete cascade,
  version integer not null,
  name text not null,
  change_note text not null default '',
  tasting_note text not null default '',
  dose_gram numeric not null default 0,
  brew_ratio numeric not null default 0,
  target_brew_gram numeric not null default 0,
  blend_cost numeric not null default 0,
  brew_method_id uuid,
  brew_method_snapshot jsonb,
  sensory jsonb not null default '{}'::jsonb,
  saved_at timestamptz not null default now(),
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  unique (series_id, version)
)
```

### recipe_version_beans

```sql
recipe_version_beans (
  id uuid primary key,
  user_id uuid not null references auth.users(id) on delete cascade,
  version_id uuid not null references recipe_versions(id) on delete cascade,
  bean_id uuid,
  ratio numeric not null default 0,
  roast_level text not null default '',
  bean_snapshot jsonb,
  created_at timestamptz not null default now()
)
```

`bean_id` はmaster beanが削除される可能性を考慮し、nullableにするか外部キー制約を弱めるかを実装前に決めます。過去recipe表示の正本はsnapshotです。

### app_settings

```sql
app_settings (
  user_id uuid not null references auth.users(id) on delete cascade,
  key text not null,
  value jsonb not null,
  updated_at timestamptz not null default now(),
  primary key (user_id, key)
)
```

## 10. 主キーと外部キーの方針

主キー:

- PostgreSQLでは `uuid` を基本にする。
- frontendでID生成するかDBで生成するかは未確定。
- Supabase/PostgreSQL側で `gen_random_uuid()` defaultを使う案が自然。

外部キー:

- `recipe_versions.series_id` は `recipe_series.id` へ `on delete cascade`。
- `recipe_version_beans.version_id` は `recipe_versions.id` へ `on delete cascade`。
- `beans.user_id`、`brew_methods.user_id`、`recipe_series.user_id`、`recipe_versions.user_id`、`recipe_version_beans.user_id` は `auth.users.id` へ `on delete cascade`。

snapshotとの関係:

- master削除後も過去recipeを表示するため、snapshotを正本として残す。
- recipe versionが参照する `brew_method_id` / `bean_id` は補助情報として扱う。
- masterへの外部キーを厳密に張ると削除済みmasterを含む過去recipeとの相性が悪いため、nullableまたは制約なしも検討する。

## 11. user_idの配置方針

すべてのユーザー所有テーブルに `user_id` を持たせます。

理由:

- RLS policyを単純にできる。
- join先の所有者確認を毎回複雑にしなくてよい。
- repository実装でデータ境界を明示できる。

注意:

- 子テーブルにも `user_id` を持つため、親子間で `user_id` が一致するconstraintまたはtrigger/RPCでの保証が必要。
- insert時にfrontendから `user_id` を送るより、DB側で `auth.uid()` を使って補完する方が安全。

## 12. created_atとupdated_atの方針

基本:

- `created_at timestamptz not null default now()`
- `updated_at timestamptz not null default now()`

更新:

- `updated_at` はtriggerで自動更新する方針。
- RecipeSeries保存時は、seriesと新しいversionの更新時刻を一貫させる。
- 現在の `savedAt` はrecipe versionの意味を持つため、`recipe_versions.saved_at` として保持する。

## 13. Row Level Securityの方針

全公開テーブルでRLSを有効にします。

対象:

- `beans`
- `brew_methods`
- `recipe_series`
- `recipe_versions`
- `recipe_version_beans`
- `app_settings`

基本ルール:

- ログインユーザーは自分の `user_id = auth.uid()` の行だけSELECTできる。
- ログインユーザーは自分の `user_id = auth.uid()` の行だけINSERTできる。
- ログインユーザーは自分の `user_id = auth.uid()` の行だけUPDATEできる。
- ログインユーザーは自分の `user_id = auth.uid()` の行だけDELETEできる。
- 未認証ユーザーはアクセス不可。

## 14. SELECT、INSERT、UPDATE、DELETEポリシーの考え方

各テーブルで概ね次の方針にします。

SELECT:

```sql
using (user_id = auth.uid())
```

INSERT:

```sql
with check (user_id = auth.uid())
```

UPDATE:

```sql
using (user_id = auth.uid())
with check (user_id = auth.uid())
```

DELETE:

```sql
using (user_id = auth.uid())
```

子テーブルの安全性:

- `recipe_versions.series_id` が同じユーザーのseriesを指すことを保証する。
- `recipe_version_beans.version_id` が同じユーザーのversionを指すことを保証する。
- この保証はRLSだけでは見落としやすいため、RPCまたはDB function/triggerで補強する。

## 15. repository interfaceの移行方針

現在の`createCoffeeRepository`の責務を正本として、Supabase版repositoryを追加します。

維持したい公開契約:

- `loadInitialState`
- `getStorageMode`
- `saveSelectedBrewMethod`
- `saveRecipeSeries`
- `saveBeansMaster`
- `saveBrewMethodsMaster`

変更が必要な点:

- storage modeは `sqlite/local` ではなく `supabase/offline/error` のような表現へ見直す。
- localStorage fallbackは廃止するため、API失敗時は保存不可状態または再試行可能なエラーとしてUIへ出す。
- Supabase Auth sessionがない場合、repositoryはデータを読み込まない。

## 16. SQLite repositoryとSupabase repositoryの対応表

| 現在の処理 | SQLite/localStorage実装 | Supabase実装案 |
| --- | --- | --- |
| 初期ロード | `GET /api/state`、失敗時localStorage | session確認後、Supabaseからユーザー所有データを取得 |
| beans保存 | `PUT /api/beans`、master save | `beans` tableへupsert/delete |
| brewMethods保存 | `PUT /api/brew-methods`、master save | `brew_methods` tableへupsert/delete |
| RecipeSeries保存 | `PUT /api/recipes`、localStorage互換保存 | RPCまたはtransaction相当処理でseries/version/beansを保存 |
| selectedBrewMethod保存 | `PUT /api/settings/selected-brew-method` | `app_settings` の `selectedBrewMethodId` をupsert |
| fallback | localStorage | 廃止。エラー表示と再試行 |
| storageMode | `sqlite` / `local` | 未確定。例: `supabase` / `offline` |

## 17. RecipeSeriesとRecipeVersionの保存方式

現在のdomain modelは維持します。

保存時の考え方:

- `recipe_series` がseriesの親。
- `recipe_versions` がversion履歴。
- `recipe_version_beans` がversionごとの豆比率、焙煎度、bean snapshot。
- `recipe_series.current_version_id` で代表versionを示す。
- version番号はseries内で連番として維持する。

重要:

- 現在のSQLite実装は全件置換に近い保存方式です。
- Supabaseでは全件置換より、差分保存またはRPCによる一貫した保存を優先する。
- 複数テーブル保存の途中失敗を避けるため、RecipeSeries保存にはPostgreSQL function/RPCを検討する。

RPC候補:

- `save_recipe_version(payload jsonb)`
- `replace_user_masters(payload jsonb)`
- `import_recipe_series(payload jsonb)`

RPCを使う場合も、RLSと `auth.uid()` を前提にします。

## 18. snapshotデータの保存方式

snapshotはJSONBで保存します。

対象:

- `recipe_versions.brew_method_snapshot jsonb`
- `recipe_version_beans.bean_snapshot jsonb`

方針:

- master削除後も過去recipeを表示できるようにsnapshotを保持する。
- snapshotは保存時点の表示・計算に必要な情報を持つ。
- snapshot内のschemaはdomainの現在仕様を維持する。
- JSONBに保存するが、頻繁に検索する項目としては扱わない。

## 19. app_settingsの保存方式

ユーザーごとの設定を `app_settings` に保存します。

初期対象:

- `selectedBrewMethodId`

形式:

- `user_id`
- `key`
- `value jsonb`

理由:

- 設定項目が少ない。
- 将来設定が増えてもテーブル追加なしで対応できる。
- RLSを `user_id = auth.uid()` で単純化できる。

## 20. 初回ログイン時のデフォルトデータ生成方針

初回ログイン時に、そのユーザー用のdefault beansとdefault brew methodsを作成します。

候補:

1. frontend repositoryが初回ロード時にデータなしを検知し、default dataをinsertする。
2. Supabase RPC `initialize_user_defaults()` を呼び、DB側でdefault dataを作成する。
3. Auth signup hook相当の仕組みで作成する。

推奨:

- Phase 5まではfrontend repositoryから初期化して実装を単純にする。
- 公開運用前にRPC化を検討する。

注意:

- default dataにも必ず `user_id` を付与する。
- 複数回呼んでも重複しないようにする。

## 21. SQLiteデータからSupabaseへの移行方針

旧ローカル版のSQLiteデータをSupabaseへ移す場合は、直接DB間コピーではなく、現在のdomain modelに合わせて変換します。

候補手順:

1. 旧ローカル版をGitタグ `local-v0.1.0` で起動する。
2. JSON exportを取得する。
3. Web版へログインする。
4. import機能または移行scriptでRecipeSeriesをSupabaseへ登録する。
5. 件数、version数、snapshot、焙煎度、試飲メモを確認する。

SQLiteファイルを直接読み込む移行scriptを作る場合:

- `recipe_series`
- `recipe_versions`
- `recipe_version_beans`
- `beans`
- `brew_methods`
- `app_settings`

を読み取り、Supabase schemaへ変換する必要があります。

## 22. JSON exportからのimportを利用する代替案

JSON exportを移行の標準ルートにする案です。

利点:

- 既存UIから取得できる。
- SQLite内部schemaに依存しない。
- RecipeSeries/version/snapshotを現在のアプリ表現で移行できる。

課題:

- 現在はimport機能が未実装。
- beans/brewMethods masterをどう復元するか決める必要がある。
- JSON exportはflatten済みexport dataであり、保存用RecipeSeriesそのものとは完全に同じではない可能性がある。

判断:

- 旧ローカル版ユーザーの移行要件があるなら、JSON import仕様を先に確定する。
- 旧データ移行が少量なら、手動再登録も選択肢。

## 23. localStorage fallback廃止時のエラー表示方針

Supabase版では、永続化手段としてのlocalStorage fallbackを廃止します。

代わりに必要なUI:

- 未認証時: ログイン画面を表示する。
- Supabase接続失敗時: 読み込み失敗を明示し、再試行できるようにする。
- 保存失敗時: 保存されていないことを表示する。
- session期限切れ: 再ログインを促す。

重要:

- 「保存できたように見えるがSupabaseへ保存されていない」状態を避ける。
- オフライン編集を提供する場合は別機能として設計する。今回の移行では対象外。

## 24. 環境変数一覧

Vercel/frontendで使う想定:

| Variable | 用途 | secretか |
| --- | --- | --- |
| `VITE_SUPABASE_URL` | Supabase project URL | no |
| `VITE_SUPABASE_ANON_KEY` | Browser用anon/public key | no |

ローカル開発で使う可能性:

| Variable | 用途 | secretか |
| --- | --- | --- |
| `SUPABASE_ACCESS_TOKEN` | Supabase CLIや管理操作 | yes |
| `SUPABASE_DB_URL` | migrationやローカル管理用DB接続 | yes |

禁止:

- `SUPABASE_SERVICE_ROLE_KEY` をfrontendへ置かない。
- `VITE_` prefix付き環境変数にsecretを入れない。

`.env.example` はPhase 1で追加予定です。今回は作成しません。

## 25. ローカル開発環境

候補:

1. hosted Supabase projectを開発用として使う。
2. Supabase CLIでローカルSupabaseを起動する。

推奨:

- schema/RLS/migration検証を重視するならSupabase CLIを導入する。
- 初期実装の速度を優先するなら開発用hosted projectでも開始できる。

必要になるもの:

- `@supabase/supabase-js`
- Supabase project
- `VITE_SUPABASE_URL`
- `VITE_SUPABASE_ANON_KEY`
- migration管理手順

今回は依存追加も環境変数追加も行いません。

## 26. Supabase migration管理

DB変更はmigrationファイルとしてGit管理します。

方針:

- SQL Editorだけでschemaを変更しない。
- migration fileにschema、constraints、indexes、RLS policiesを含める。
- migrationはreview可能な単位に分ける。
- 開発環境と本番環境へ同じmigrationを適用する。

想定配置:

```text
supabase/
  migrations/
    202607270001_initial_schema.sql
```

この配置はPhase 1以降で作成します。今回は作成しません。

## 27. 開発用環境と本番環境の分離

Supabase projectは開発用と本番用を分けます。

理由:

- migration検証で本番データを壊さない。
- Preview Deploymentから本番DBへ誤接続しない。
- RLS policy変更を安全に検証する。

方針:

- local/dev: 開発Supabase project
- preview: 開発またはpreview専用Supabase project
- production: 本番Supabase project

環境変数はVercel Environmentごとに分けます。

## 28. Vercel Preview Deploymentの利用方針

Preview Deploymentは、main merge前のSupabase接続確認に使います。

確認すること:

- Auth login/logout
- RLSにより他ユーザーデータが見えないこと
- beans/brewMethods/RecipeSeriesの保存と読み込み
- RecipeSeries version追加
- archive/restore/delete
- export
- refresh後の復元

注意:

- Previewが本番Supabaseへ接続しないようにする。
- Preview用環境変数を明確に設定する。
- migration適用先を間違えない。

## 29. テスト戦略

既存テストは維持します。

追加するテスト:

- Supabase repository単体テスト
- Supabase client mockを使った成功/失敗テスト
- Auth sessionあり/なしのhookテスト
- RLS policy SQLテスト
- migration適用テスト
- import/migrationテスト
- 主要ブラウザフローのE2E

既存domainテストはSupabase移行後もほぼ維持できる想定です。

## 30. RLSテスト

RLSは実装後に必ず検証します。

最低限確認すること:

- 未認証ではSELECTできない。
- user Aはuser AのbeansをSELECTできる。
- user Aはuser BのbeansをSELECTできない。
- user Aはuser Bのseries/version/beansをINSERT/UPDATE/DELETEできない。
- 子テーブルに別userの親IDを指定できない。
- RPCを使う場合、RPC内でも `auth.uid()` を基準に所有者を固定する。

可能ならSupabase CLIのローカルDBまたは専用test projectで実行します。

## 31. 手動スモークテスト

Supabase版の手動確認項目:

- 未ログイン時にアプリデータが表示されない。
- signup/login/logoutできる。
- 初回ログイン時にdefault beans/brewMethodsが作成される。
- browser reload後もsessionが維持される。
- beansを追加、編集、削除、保存できる。
- brewMethodsを追加、編集、選択、削除、保存できる。
- blend ratioと焙煎度を編集できる。
- recipe v1を保存できる。
- version追加保存できる。
- saved recipeを読み込める。
- archive/restore/version deleteができる。
- master削除後もsnapshot付きrecipeを表示できる。
- JSON/CSV exportできる。
- 別ユーザーでログインするとデータが分離される。
- Supabase接続失敗時に保存不可またはエラーが表示される。
- Vercel Previewでも同じ動作を確認できる。

## 32. ロールバック方針

移行中:

- 既存Node API/SQLite/localStorage fallbackを削除しない。
- Supabase repositoryを追加して段階的に切り替える。
- 問題があれば既存repositoryへ戻せる状態を保つ。

移行完了後:

- 旧ローカル版はGitタグ `local-v0.1.0` から参照する。
- Web版リリース時に別タグを作成する。
- Supabase migration適用後のDB rollbackは慎重に扱う。破壊的migrationはbackup後に実行する。

## 33. 段階的な実装順序

### Phase 0: 現状確認と設計

- 現状の確認
- 移行設計
- 既存テストの確認

### Phase 1: Supabase基盤

- Supabase project設定
- Supabase client追加
- `.env.example` 追加
- migration環境追加

### Phase 2: PostgreSQL schema

- PostgreSQL schema作成
- constraints作成
- indexes作成
- RLS policies作成

### Phase 3: Auth

- Supabase Auth接続
- session管理
- login
- logout
- 未認証画面

### Phase 4: Supabase repository

- Supabase repository実装
- repository単体テスト
- Auth/sessionなしの挙動テスト

### Phase 5: アプリ接続

- Supabase repositoryをアプリへ接続
- データ読み込み
- データ保存
- エラー処理
- localStorage fallback廃止準備

### Phase 6: 既存データ移行

- SQLiteまたはJSON exportからの移行
- データ件数検証
- 内容検証
- snapshot検証

### Phase 7: Vercel Preview Deployment

- Preview環境変数設定
- Preview環境で検証
- RLS/ユーザー分離確認

### Phase 8: 旧実装削除

- Node API削除
- SQLite削除
- localStorage fallback削除
- 不要依存関係整理
- ドキュメント整理

### Phase 9: main mergeと本番

- mainへのマージ
- Web版タグ付け
- 本番Supabase migration適用
- Vercel production deploy

## 34. 各段階の完了条件

| Phase | 完了条件 |
| --- | --- |
| Phase 0 | 設計書が作成され、既存テストが通ることを確認 |
| Phase 1 | Supabase clientと環境変数例、migration配置が用意される |
| Phase 2 | schema、constraints、indexes、RLSがmigrationとして適用可能 |
| Phase 3 | login/logout/session復元/未認証画面が動作 |
| Phase 4 | Supabase repository単体テストが通る |
| Phase 5 | アプリがSupabaseから読み込み、保存できる |
| Phase 6 | 旧データ移行後、件数と主要内容が一致 |
| Phase 7 | Vercel Previewで主要スモークテストが通る |
| Phase 8 | 旧Node API/SQLite/localStorage fallbackを削除してテストが通る |
| Phase 9 | main merge、tag、本番deploy、smoke testが完了 |

## 35. 想定リスク

- RLS policyの漏れにより他ユーザーデータが見える。
- 子テーブルinsert時に別userの親IDを参照できてしまう。
- RecipeSeries保存中に一部テーブルだけ更新される。
- JSONB snapshotのschemaが曖昧になり、将来の互換性が落ちる。
- localStorage fallback廃止により、オフライン時のユーザー体験が変わる。
- UUID移行により既存ID文字列との互換処理が必要になる。
- Vercel Previewが誤って本番Supabaseへ接続する。
- `service_role` keyを誤ってfrontend環境変数へ入れる。
- SQLite export/importの仕様差で過去データが欠落する。

## 36. 未確定事項

- Supabase Authの認証方式。
- ID生成をfrontendで行うかDB defaultに任せるか。
- `bean_id` / `brew_method_id` に外部キーを張るか、snapshot優先でnullableにするか。
- RecipeSeries保存をRPCにするか、clientから複数queryで行うか。
- JSON importを正式機能にするか、移行scriptだけにするか。
- 初回ログイン時default data生成をfrontendで行うかRPCで行うか。
- Preview用Supabase projectを本番と完全分離するか。
- `storageMode` 表示をSupabase版でどう表現するか。
- 旧localStorageデータをWeb版へ移行対象にするか。

## 37. 実装開始前に判断が必要な事項

実装前に決めるべきこと:

1. 認証方式。
2. Supabase projectを開発用/本番用でどう分けるか。
3. Supabase CLIを使うか。
4. ID生成方針。
5. RecipeSeries保存にRPCを使うか。
6. 旧データ移行の正式ルートをSQLite directにするかJSON importにするか。
7. `bean_id` / `brew_method_id` の外部キー制約方針。
8. localStorage fallback廃止後の保存失敗UI。
9. Vercel Previewが接続するSupabase環境。
10. Web版の初回リリースタグ名。
