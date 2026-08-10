# Supabase PostgreSQL スキーマ設計

状態: この文書は、スキーマ設計と migration の参照資料として保持しています。旧 local Node API、SQLite schema、browser fallback への言及は、比較とデータ移行計画のための移行前モデルを説明するものであり、現在の runtime を表すものではありません。

この文書は、Coffee Blend LabをSupabase PostgreSQLへ移行する前のスキーマ設計レポートです。現時点ではmigration SQLは作成せず、現在のdomainモデルと永続化構造を正本として、PostgreSQL化の方針を整理します。

## 1. 現在の永続化構造の概要

現在の正本はローカルNode APIとSQLiteです。フロントエンドは`src/data/coffeeRepository.js`を通じて`GET /api/state`と各PUT endpointへアクセスし、API初期取得に失敗した場合のみlocalStorage modeへfallbackします。

主要データは以下です。

- Bean Master: `beans`
- Brew Method Master: `brew_methods`
- RecipeSeries: `recipe_series`
- RecipeVersion: `recipe_versions`
- RecipeVersion内の豆配合: `recipe_version_beans`
- アプリ設定: `app_settings`

レシピはRecipeSeriesとRecipeVersionが正本です。保存時点のBeanとBrewMethodはsnapshotとして保持され、Master削除後も過去recipeを再現できる構造になっています。

## 2. 現在のSQLiteテーブル一覧

現在のSQLiteには以下のテーブルがあります。

- `beans`
- `brew_methods`
- `blend_recipes`
- `blend_recipe_beans`
- `recipe_series`
- `recipe_versions`
- `recipe_version_beans`
- `app_settings`

`blend_recipes`と`blend_recipe_beans`はlegacy recipe用です。現在のアプリモデルではRecipeSeries/RecipeVersionへ正規化され、Supabase移行後の正規テーブルとしては採用しない方針です。

## 3. 各テーブルのカラムと型

### beans

| Column | SQLite type | 現在の意味 |
| --- | --- | --- |
| `id` | `TEXT` | Bean ID |
| `name` | `TEXT NOT NULL` | 豆名 |
| `note` | `TEXT NOT NULL DEFAULT ''` | メモ |
| `color` | `TEXT NOT NULL DEFAULT '#12656b'` | UI表示色 |
| `ratio` | `INTEGER NOT NULL DEFAULT 0` | 旧/初期比率 |
| `visible_in_recipes` | `INTEGER NOT NULL DEFAULT 1` | レシピで選択可能か |
| `cost_per_kg` | `REAL NOT NULL DEFAULT 0` | kg単価 |
| `acidity` | `INTEGER NOT NULL DEFAULT 50` | 酸味 |
| `sweetness` | `INTEGER NOT NULL DEFAULT 50` | 甘味 |
| `bitterness` | `INTEGER NOT NULL DEFAULT 50` | 苦味 |
| `body` | `INTEGER NOT NULL DEFAULT 50` | ボディ |
| `aroma` | `INTEGER NOT NULL DEFAULT 50` | 香り |
| `created_at` | `TEXT DEFAULT CURRENT_TIMESTAMP` | 作成日時 |
| `updated_at` | `TEXT DEFAULT CURRENT_TIMESTAMP` | 更新日時 |

### brew_methods

| Column | SQLite type | 現在の意味 |
| --- | --- | --- |
| `id` | `TEXT` | BrewMethod ID |
| `name` | `TEXT NOT NULL` | 抽出方法名 |
| `note` | `TEXT NOT NULL DEFAULT ''` | メモ |
| `bloom_percent` | `REAL NOT NULL DEFAULT 20` | 蒸らし比率 |
| `pour1_percent` | `REAL NOT NULL DEFAULT 30` | 1投目比率 |
| `pour2_percent` | `REAL NOT NULL DEFAULT 30` | 2投目比率 |
| `pour3_percent` | `REAL NOT NULL DEFAULT 20` | 3投目比率 |
| `bloom_seconds` | `INTEGER NOT NULL DEFAULT 30` | 蒸らし秒数 |
| `created_at` | `TEXT DEFAULT CURRENT_TIMESTAMP` | 作成日時 |
| `updated_at` | `TEXT DEFAULT CURRENT_TIMESTAMP` | 更新日時 |

### blend_recipes

Legacy tableです。Supabaseの正規schemaには引き継がず、移行時の読み取り元として扱います。

| Column | SQLite type |
| --- | --- |
| `id` | `TEXT` |
| `name` | `TEXT NOT NULL` |
| `dose_gram` | `REAL` |
| `brew_ratio` | `REAL` |
| `target_brew_gram` | `REAL` |
| `blend_cost` | `REAL` |
| `brew_method_id` | `TEXT` |
| `brew_method_snapshot` | `TEXT` |
| `sensory` | `TEXT` |
| `memo` | `TEXT` |
| `saved_at` | `TEXT NOT NULL` |
| `created_at` | `TEXT DEFAULT CURRENT_TIMESTAMP` |
| `updated_at` | `TEXT DEFAULT CURRENT_TIMESTAMP` |

### blend_recipe_beans

Legacy tableです。

| Column | SQLite type |
| --- | --- |
| `recipe_id` | `TEXT NOT NULL` |
| `bean_id` | `TEXT NOT NULL` |
| `ratio` | `REAL NOT NULL DEFAULT 0` |

### recipe_series

| Column | SQLite type | 現在の意味 |
| --- | --- | --- |
| `id` | `TEXT` | Series ID |
| `name` | `TEXT NOT NULL` | Series名 |
| `goal` | `TEXT NOT NULL DEFAULT ''` | 目的/メモ |
| `status` | `TEXT NOT NULL DEFAULT 'active'` | `active`または`archived` |
| `current_version_id` | `TEXT` | 現在version ID |
| `created_at` | `TEXT DEFAULT CURRENT_TIMESTAMP` | 作成日時 |
| `updated_at` | `TEXT DEFAULT CURRENT_TIMESTAMP` | 更新日時 |

### recipe_versions

| Column | SQLite type | 現在の意味 |
| --- | --- | --- |
| `id` | `TEXT` | Version ID |
| `series_id` | `TEXT NOT NULL` | 親series ID |
| `version` | `INTEGER NOT NULL` | version番号 |
| `name` | `TEXT NOT NULL` | recipe名 |
| `change_note` | `TEXT NOT NULL DEFAULT ''` | 変更メモ |
| `tasting_note` | `TEXT NOT NULL DEFAULT ''` | 試飲メモ |
| `dose_gram` | `REAL NOT NULL DEFAULT 15` | 粉量 |
| `brew_ratio` | `REAL NOT NULL DEFAULT 15` | 抽出比 |
| `target_brew_gram` | `REAL NOT NULL DEFAULT 225` | 目標抽出量 |
| `blend_cost` | `REAL NOT NULL DEFAULT 0` | 原価 |
| `brew_method_id` | `TEXT` | BrewMethod参照ID |
| `brew_method_snapshot` | `TEXT` | BrewMethod snapshot JSON |
| `sensory` | `TEXT` | sensory JSON |
| `saved_at` | `TEXT NOT NULL` | 保存日時 |
| `created_at` | `TEXT DEFAULT CURRENT_TIMESTAMP` | 作成日時 |
| `updated_at` | `TEXT DEFAULT CURRENT_TIMESTAMP` | 更新日時 |

### recipe_version_beans

| Column | SQLite type | 現在の意味 |
| --- | --- | --- |
| `version_id` | `TEXT NOT NULL` | 親version ID |
| `bean_id` | `TEXT NOT NULL` | Bean参照ID |
| `ratio` | `REAL NOT NULL DEFAULT 0` | 配合比率 |
| `roast_level` | `TEXT NOT NULL DEFAULT ''` | レシピ保存時点の焙煎度 |
| `bean_snapshot` | `TEXT` | Bean snapshot JSON |

### app_settings

| Column | SQLite type | 現在の意味 |
| --- | --- | --- |
| `key` | `TEXT` | 設定key |
| `value` | `TEXT NOT NULL` | 設定値 |

現在使われているkeyは`selectedBrewMethodId`です。

## 4. 現在の主キー

| Table | Primary key |
| --- | --- |
| `beans` | `id` |
| `brew_methods` | `id` |
| `blend_recipes` | `id` |
| `blend_recipe_beans` | `(recipe_id, bean_id)` |
| `recipe_series` | `id` |
| `recipe_versions` | `id` |
| `recipe_version_beans` | `(version_id, bean_id)` |
| `app_settings` | `key` |

## 5. 現在の外部キー

| Table | Foreign key | 削除時の挙動 |
| --- | --- | --- |
| `blend_recipe_beans` | `recipe_id -> blend_recipes(id)` | `ON DELETE CASCADE` |
| `recipe_versions` | `series_id -> recipe_series(id)` | `ON DELETE CASCADE` |
| `recipe_version_beans` | `version_id -> recipe_versions(id)` | `ON DELETE CASCADE` |

現在のSQLiteでは、`recipe_version_beans.bean_id`と`recipe_versions.brew_method_id`にはMaster tableへの外部キーがありません。そのためMaster削除後も過去recipeはsnapshotで表示できます。

## 6. 現在の削除時挙動

- Bean削除: `beans`から物理削除し、editor stateの`blendRatios`と`blendRoastLevels`から該当keyを削除します。過去RecipeVersionは削除しません。
- BrewMethod削除: `brew_methods`から物理削除します。削除対象が選択中の場合は残った先頭methodを選択します。過去RecipeVersionは削除しません。
- RecipeSeries archive/restore: `status`を`archived`または`active`へ変更するだけです。
- RecipeVersion削除: 複数versionがある場合のみ削除できます。最後の1件は削除不可です。削除後、必要に応じて`currentVersionId`を最新versionへ更新します。
- RecipeSeries物理削除: 現在のUI操作としては中心ではありません。DB上はseries削除時にversionsとversion beansがcascadeされます。

## 7. 現在のID生成方式

現在のUI/domainでは文字列IDをDate seedで生成しています。

- 新規Bean: `bean-${Date.now()}`
- 新規BrewMethod: `brew-${Date.now()}`
- 新規RecipeSeries: `series-${seed}`
- 新規RecipeVersion: `recipe-${seed}`

Supabase移行後は暫定方針どおり、主キーはUUIDにし、原則としてDB側の`gen_random_uuid()`を使います。既存ローカルデータ移行時は、旧IDを保持するか新UUIDへ変換するかをmigration/import方針で決める必要があります。

## 8. repositoryが扱うデータ形状

`coffeeRepository`はアプリ全体の初期状態として以下を扱います。

```js
{
  beans,
  brewMethods,
  recipeSeries,
  selectedBrewMethodId,
  storageMode
}
```

API成功時はSQLite mode、API失敗時はlocalStorage modeです。Repository境界は保存先交換の主要な差し替え点です。Supabase移行では、UI/domainを維持し、Repository実装をSupabase clientへ置き換える方針が自然です。

## 9. domainモデルが扱うデータ形状

domain層はReact、browser API、repositoryに依存しない純粋処理として、主に以下を扱います。

- Bean: UI表示・原価・profile計算用のmaster data
- BrewMethod: 抽出スケジュール計算用のmaster data
- RecipeSeries: version履歴を持つ保存単位
- RecipeVersion: 保存時点のレシピ本体
- Bean snapshot / BrewMethod snapshot: 保存時点のMaster再現用データ
- sensory: 試飲評価
- export用flatten data

## 10. SQLiteとdomainモデルの差異

主な差異は以下です。

- SQLiteは正規化された複数tableで保存し、domainは`RecipeSeries`の中に`versions`配列を持つネスト構造で扱います。
- SQLiteのsnapshotはTEXT JSON、domainではobjectです。
- SQLiteではMaster参照FKがなく、domainではsnapshot fallbackを優先できます。
- SQLiteにはlegacy `blend_recipes`がありますが、domainの正本はRecipeSeriesです。
- SQLiteの`app_settings`はkey-valueですが、domain/repositoryでは`selectedBrewMethodId`として扱います。
- SQLiteの日時はTEXT、Supabaseでは`timestamptz`が自然です。

## 11. RecipeSeriesの完全なデータ構造

現在のdomainが扱うRecipeSeriesの代表形です。

```js
{
  id: "series-...",
  name: "Series name",
  goal: "",
  status: "active",
  currentVersionId: "recipe-...",
  createdAt: "2026-01-01T00:00:00.000Z",
  updatedAt: "2026-01-01T00:00:00.000Z",
  versions: [
    {
      id: "recipe-...",
      version: 1,
      name: "Recipe name",
      changeNote: "",
      tastingNote: "",
      doseGram: 15,
      brewRatio: 15,
      targetBrewGram: 225,
      blendCost: 0,
      brewMethodId: "brew-...",
      brewMethodSnapshot: {},
      sensory: {},
      savedAt: "2026-01-01T00:00:00.000Z",
      beans: []
    }
  ]
}
```

`versions`は通常version番号降順で扱われます。

## 12. RecipeVersionの完全なデータ構造

RecipeVersionは保存時点のレシピ本体です。

```js
{
  id: "recipe-...",
  version: 1,
  name: "Recipe name",
  changeNote: "",
  tastingNote: "",
  doseGram: 15,
  brewRatio: 15,
  targetBrewGram: 225,
  blendCost: 0,
  brewMethodId: "brew-...",
  brewMethodSnapshot: {
    id: "brew-...",
    name: "...",
    note: "",
    bloomPercent: 20,
    pour1Percent: 30,
    pour2Percent: 30,
    pour3Percent: 20,
    bloomSeconds: 30
  },
  sensory: {
    fragrance: 0,
    flavor: 0,
    aftertaste: 0,
    acidity: 0,
    body: 0,
    balance: 0
  },
  memo: "",
  savedAt: "2026-01-01T00:00:00.000Z",
  beans: [
    {
      id: "bean-...",
      value: 50,
      roastLevel: "medium",
      beanSnapshot: {}
    }
  ]
}
```

SQLite上では`memo`は`recipe_versions.tasting_note`へ保存され、domainでは`memo`と`tastingNote`の互換を保っています。

## 13. Bean snapshotの現在の項目

現在のBean snapshotは保存時点のBeanを再現するために保持されます。

```js
{
  id: "bean-...",
  name: "...",
  note: "",
  color: "#12656b",
  visibleInRecipes: true,
  costPerKg: 0,
  profile: {
    acidity: 50,
    sweetness: 50,
    bitterness: 50,
    body: 50,
    aroma: 50
  }
}
```

`recipe_version_beans`側には、snapshotとは別に`ratio`と`roast_level`があります。Supabaseでも`bean_snapshot`はjsonbとして保存し、保存後にMaster変更で書き換えません。

## 14. BrewMethod snapshotの現在の項目

現在のBrewMethod snapshotは以下を基本形とします。

```js
{
  id: "brew-...",
  name: "...",
  note: "",
  bloomPercent: 20,
  pour1Percent: 30,
  pour2Percent: 30,
  pour3Percent: 20,
  bloomSeconds: 30
}
```

読み込み時にはsnapshotがある場合、それを保存済み抽出方法として保持できます。Masterから削除されていても過去recipeの表示に使います。

## 15. app_settingsの現在の項目

現在の設定項目は以下のみです。

| Key | Value |
| --- | --- |
| `selectedBrewMethodId` | 現在選択中のBrewMethod ID |

SQLiteではkey-value形式ですが、Supabaseでは1ユーザー1行のtyped settings tableを推奨します。

## 16. defaultCoffeeDataの現在の項目

`src/domain/defaultCoffeeData.js`は、初回状態生成用のdefault dataを持ちます。

- default beans: 4件
- default brew methods: 2件
- default selected brew method ID: default brew methodsの先頭
- default recipe series: 空配列

各初期状態生成関数はcloneを返し、参照共有による状態汚染を避けています。Supabase初回ログイン時も、同じ値・順序・構造を生成する必要があります。

## 17. PostgreSQLテーブル案

Supabase移行後の推奨tableは以下です。

- `beans`
- `brew_methods`
- `recipe_series`
- `recipe_versions`
- `recipe_version_beans`
- `app_settings`

Legacy tableである`blend_recipes`と`blend_recipe_beans`は新schemaには作りません。必要な場合は移行スクリプトまたはJSON importでRecipeSeriesへ変換します。

## 18. 各テーブルのカラム案

### beans

| Column | 目的 |
| --- | --- |
| `id` | UUID primary key |
| `user_id` | 所有ユーザー |
| `name` | 豆名 |
| `note` | メモ |
| `color` | UI 表示色 |
| `ratio` | 現在の互換用 field |
| `visible_in_recipes` | 選択可能 flag |
| `cost_per_kg` | 原価 |
| `acidity` | Profile |
| `sweetness` | Profile |
| `bitterness` | Profile |
| `body` | Profile |
| `aroma` | Profile |
| `created_at` | 作成 timestamp |
| `updated_at` | 更新 timestamp |

### brew_methods

| Column | 目的 |
| --- | --- |
| `id` | UUID primary key |
| `user_id` | 所有ユーザー |
| `name` | 抽出方法名 |
| `note` | メモ |
| `bloom_percent` | 蒸らし比率 |
| `pour1_percent` | 注湯比率 |
| `pour2_percent` | 注湯比率 |
| `pour3_percent` | 注湯比率 |
| `bloom_seconds` | 蒸らし秒数 |
| `created_at` | 作成 timestamp |
| `updated_at` | 更新 timestamp |

### recipe_series

| Column | 目的 |
| --- | --- |
| `id` | UUID primary key |
| `user_id` | 所有ユーザー |
| `name` | Series 名 |
| `goal` | Series の目的/メモ |
| `status` | `active` or `archived` |
| `current_version_id` | 現在の version |
| `created_at` | 作成 timestamp |
| `updated_at` | 更新 timestamp |

### recipe_versions

| Column | 目的 |
| --- | --- |
| `id` | UUID primary key |
| `user_id` | 所有ユーザー |
| `series_id` | 親 series |
| `version` | version 番号 |
| `name` | recipe 名 |
| `change_note` | 変更メモ |
| `tasting_note` | メモ/tasting note |
| `dose_gram` | 粉量 |
| `brew_ratio` | 抽出比 |
| `target_brew_gram` | 目標抽出量 |
| `blend_cost` | 原価 |
| `brew_method_id` | nullable な live BrewMethod reference |
| `brew_method_snapshot` | 不変の jsonb snapshot |
| `sensory` | jsonb sensory values |
| `saved_at` | 保存 timestamp |
| `created_at` | 作成 timestamp |
| `updated_at` | 更新 timestamp |

### recipe_version_beans

| Column | 目的 |
| --- | --- |
| `id` | UUID primary key |
| `user_id` | 所有ユーザー |
| `version_id` | 親 recipe version |
| `bean_id` | nullable な live Bean reference |
| `ratio` | ブレンド比率 |
| `roast_level` | recipe 保存時点の roast level |
| `bean_snapshot` | 不変の jsonb snapshot |
| `position` | optional な row order |
| `created_at` | 作成 timestamp |
| `updated_at` | 更新 timestamp |

SQLiteでは`(version_id, bean_id)`がprimary keyですが、Supabaseでは`bean_id`をnullableにするため、別UUID primary keyを推奨します。

### app_settings

| Column | 目的 |
| --- | --- |
| `user_id` | UUID primary key 兼 owner |
| `selected_brew_method_id` | nullable な selected BrewMethod |
| `created_at` | 作成 timestamp |
| `updated_at` | 更新 timestamp |

## 19. 各カラムのPostgreSQL型

| 現在の概念 | PostgreSQL type |
| --- | --- |
| IDs | `uuid` |
| user owner | `uuid` |
| names/notes/status | `text` |
| booleans | `boolean` |
| integer scores/seconds/version | `integer` |
| ratios/costs/grams | `numeric` |
| snapshots | `jsonb` |
| sensory | `jsonb` |
| timestamps | `timestamptz` |

計算値はJavaScriptで扱うため、PostgreSQLでは`numeric`を推奨します。精度要件が高くない場合でも、金額相当の`blend_cost`と`cost_per_kg`は`double precision`より`numeric`の方が安全です。

## 20. NOT NULL方針

Master dataとRecipeVersion本体の基本項目はNOT NULLを推奨します。

- `user_id`, `name`, `status`, `version`, `dose_gram`, `brew_ratio`, `target_brew_gram`, `blend_cost`, `saved_at`はNOT NULL。
- `bean_id`と`brew_method_id`はMaster削除後の履歴保持のためnullable。
- `bean_snapshot`と`brew_method_snapshot`は移行互換を考えるとnullableを許容し、新規保存RPCでは必ず埋める方針が現実的です。
- `sensory`は空object defaultを検討できますが、legacy互換のためnullableまたはdefault `{}`を明確に決める必要があります。

## 21. DEFAULT値方針

推奨defaultは以下です。

- `id`: `gen_random_uuid()`
- `user_id`: 原則`auth.uid()`またはRPC内で明示設定
- `status`: `'active'`
- `note`, `goal`, `change_note`, `tasting_note`: `''`
- profile: `50`
- visible flag: `true`
- cost/ratio: `0`
- brew percent: 現在のdefault値
- `created_at`, `updated_at`: `now()`

ただし、default data生成はDB defaultに頼りすぎず、初回default生成RPCで現在の`defaultCoffeeData`と同じ構造を作る方針を推奨します。

## 22. UUID生成方針

暫定方針どおり、Supabase PostgreSQLではDB側の`gen_random_uuid()`を基本にします。

ただしRecipeSeries保存では、series、version、version beansを一括で作る必要があります。ブラウザ側でUUIDを生成するより、RPC内でIDを生成して戻り値として返す方が、RLSとtransactionの観点で安全です。

## 23. user_id配置方針

推奨は、すべてのユーザー所有tableに`user_id`を持たせる案です。

| 案 | RLS | 不整合リスク | 性能 | 実装 |
| --- | --- | --- | --- | --- |
| 親tableだけに`user_id` | 子tableのRLSがjoin/subquery依存 | 低い | policyが重い | insert時の検証が複雑 |
| 全階層に`user_id` | policyが単純 | 複合FK等がないと中 | indexしやすい | repository/RPCが分かりやすい |

推奨は後者です。ただし不整合を防ぐため、以下を併用します。

- 子tableにも`user_id`を持たせる
- `(user_id, id)`のunique制約を親tableに置く
- `(user_id, parent_id)`の複合外部キーで、他ユーザーの親へ接続できないようにする
- RPCではpayloadの`user_id`を信用せず、`auth.uid()`を使用する

## 24. created_at / updated_at方針

- `created_at`: DB default `now()`。
- `updated_at`: DB default `now()`に加え、update triggerで自動更新する方針を推奨します。
- RecipeVersionの`saved_at`: ユーザーの保存イベント時刻として保持し、`created_at`とは分けます。

既存データ移行では、SQLiteのTEXT日時を`timestamptz`へ変換します。変換できない値がある場合は移行前に検出します。

## 25. unique制約

推奨制約は以下です。

- `beans(id)` primary key
- `brew_methods(id)` primary key
- `recipe_series(id)` primary key
- `recipe_versions(id)` primary key
- `recipe_versions(user_id, series_id, version)` unique
- `recipe_version_beans(id)` primary key
- `app_settings(user_id)` primary key
- 各tableでRLS/FK用に`(user_id, id)` unique

Bean名やBrewMethod名のunique制約は推奨しません。同名の新規Beanと過去Recipeを自動再接続しない方針と整合します。

## 26. check制約

推奨check制約は以下です。

- `recipe_series.status in ('active', 'archived')`
- profile scoreは`0 <= value <= 100`
- `recipe_versions.version >= 1`
- `recipe_version_beans.ratio >= 0`
- `dose_gram >= 0`
- `brew_ratio >= 0`
- `target_brew_gram >= 0`
- `blend_cost >= 0`

BrewMethodのpercent値はUI上は比率ですが、現在のdomainは厳密な合計補正やDB制約を持っていません。`0 <= percent <= 100`を入れる場合は、既存データに範囲外がないことを移行前に確認してください。

## 27. 外部キー方針

推奨FKは以下です。

- `recipe_versions(user_id, series_id) -> recipe_series(user_id, id) ON DELETE CASCADE`
- `recipe_version_beans(user_id, version_id) -> recipe_versions(user_id, id) ON DELETE CASCADE`
- `recipe_version_beans(user_id, bean_id) -> beans(user_id, id) ON DELETE SET NULL`
- `recipe_versions(user_id, brew_method_id) -> brew_methods(user_id, id) ON DELETE SET NULL`
- `app_settings(user_id, selected_brew_method_id) -> brew_methods(user_id, id) ON DELETE SET NULL`

`recipe_series.current_version_id`は循環参照になりやすいため、最初はFKなし、またはdeferrable FKとして慎重に扱うことを推奨します。RPCで整合性を保つ設計が現実的です。

## 28. ON DELETE方針

- Bean削除: `recipe_version_beans.bean_id`をNULLにし、`bean_snapshot`は残す。
- BrewMethod削除: `recipe_versions.brew_method_id`をNULLにし、`brew_method_snapshot`は残す。
- RecipeVersion削除: `recipe_version_beans`をcascade削除。
- RecipeSeries削除: `recipe_versions`と`recipe_version_beans`をcascade削除。
- app_settingsの選択中BrewMethod削除: `selected_brew_method_id`をNULLにする。ただしアプリ側では削除後に次のIDへ更新する現行挙動を維持します。

## 29. index方針

推奨indexは以下です。

- 各tableの`user_id`
- `beans(user_id, created_at)`
- `brew_methods(user_id, created_at)`
- `recipe_series(user_id, status, updated_at desc)`
- `recipe_versions(user_id, series_id, version desc)`
- `recipe_version_beans(user_id, version_id, position)`
- `recipe_version_beans(user_id, bean_id)`
- `recipe_versions(user_id, brew_method_id)`

RLS policyと通常queryの両方で`user_id`が頻出するため、`user_id` indexは必須です。

## 30. jsonbとして保存する項目

jsonb推奨項目は以下です。

- `recipe_version_beans.bean_snapshot`
- `recipe_versions.brew_method_snapshot`
- `recipe_versions.sensory`

snapshotは履歴再現用であり、保存後にMaster変更で更新しません。検索・集計が必要になった項目だけ、将来通常カラム化を検討します。

## 31. 通常カラムとして保存する項目

通常カラム推奨項目は以下です。

- Masterの基本項目
- RecipeSeriesの`name`, `goal`, `status`, `current_version_id`
- RecipeVersionの`version`, `name`, `change_note`, `tasting_note`, `dose_gram`, `brew_ratio`, `target_brew_gram`, `blend_cost`, `brew_method_id`, `saved_at`
- RecipeVersionBeanの`bean_id`, `ratio`, `roast_level`, `position`
- `app_settings.selected_brew_method_id`

UI表示や並び替え、RLS、FK、検索条件に使う値は通常カラムにします。

## 32. snapshotを不変にする方針

snapshotは保存時点の履歴です。Master変更、Master削除、同名Master再作成では更新しません。

snapshot内に`id`は残してよいですが、live relationとして解釈しない方針を明確にします。現在のdomain互換のため、snapshot JSON内の`id`は historical source ID として扱い、再接続判定には使いません。現在Masterとの接続は通常カラムの`bean_id`または`brew_method_id`だけで判断します。

## 33. Bean削除時の挙動

推奨は物理削除です。

- `beans`から削除する
- `recipe_version_beans.bean_id`はNULLになる
- `bean_snapshot`は残る
- 過去RecipeVersionは削除しない
- 同名Beanを作り直しても過去RecipeVersionへ自動再接続しない

soft deleteは履歴調査には有利ですが、UIで削除済みMasterを隠す処理、重複名、RLS query条件が増えます。現在の要件ではsnapshotが履歴を担うため、物理削除がシンプルです。

## 34. BrewMethod削除時の挙動

Beanと同様に物理削除を推奨します。

- `brew_methods`から削除する
- `recipe_versions.brew_method_id`はNULLになる
- `brew_method_snapshot`は残る
- 過去RecipeVersionは削除しない
- 削除後の選択中IDはアプリ側の現行domainルールで補正する

## 35. RecipeSeries削除時の挙動

通常のユーザー操作ではarchive/restoreが中心です。物理削除を実装する場合は、`recipe_series`削除で`recipe_versions`と`recipe_version_beans`をcascade削除します。

公開Web版では誤削除リスクが増えるため、物理削除UIを追加する場合は確認UIと復元方針を別途設計します。

## 36. RecipeVersion削除時の挙動

現在仕様に合わせ、最後の1件は削除不可です。削除可能な場合は対象versionを物理削除し、関連する`recipe_version_beans`はcascade削除します。

削除後の`current_version_id`は、残った最新versionへ更新します。この更新は複数tableにまたがるため、RPCまたはtransaction相当処理で行うのが安全です。

## 37. RLS対象テーブル

public schemaのユーザー所有tableすべてでRLSを有効にします。

- `beans`
- `brew_methods`
- `recipe_series`
- `recipe_versions`
- `recipe_version_beans`
- `app_settings`

## 38. 各テーブルの所有者判定方法

すべてのtableで`user_id = auth.uid()`を所有者判定の基本にします。

子tableでは、`user_id`が親tableの所有者と一致することを複合FKまたはRPC内検証で保証します。RLSだけに頼ると、他ユーザーの親IDをpayloadに含める不正insertを見落とす可能性があります。

## 39. auth.uid()とuser_idの関係

- ブラウザのSupabase clientはpublishable keyだけを使います。
- 認証後のuser IDは`auth.uid()`で取得されます。
- INSERT/UPDATEでは`user_id = auth.uid()`のみ許可します。
- RPCではpayloadの`user_id`を信用せず、関数内で`auth.uid()`を使用します。

## 40. anon roleを許可しない方針

RLS policyは`TO authenticated`を明示し、anon roleにはユーザー所有データへのSELECT/INSERT/UPDATE/DELETEを許可しません。

未認証ユーザーはアプリ上でログイン画面へ誘導し、Repositoryからデータ取得しない設計にします。

## 41. authenticated role向けのSELECT方針

基本policy:

- `TO authenticated`
- `USING (user_id = auth.uid())`

子tableでも同じpolicyにし、必要なjoinを単純化します。

## 42. authenticated role向けのINSERT方針

基本policy:

- `TO authenticated`
- `WITH CHECK (user_id = auth.uid())`

さらに、子tableでは複合FKやRPCで親の`user_id`一致を保証します。

## 43. authenticated role向けのUPDATE方針

基本policy:

- `TO authenticated`
- `USING (user_id = auth.uid())`
- `WITH CHECK (user_id = auth.uid())`

`WITH CHECK`を省略すると、更新後に別user_idへ変更するなりすましが可能になるため、明示的に入れます。

## 44. authenticated role向けのDELETE方針

基本policy:

- `TO authenticated`
- `USING (user_id = auth.uid())`

RecipeVersion最終1件削除禁止などの業務制約は、client実装だけでなくRPC側にも置く方針を推奨します。

## 45. RPCが必要な操作

RPC候補は以下です。

- `initialize_user_defaults`: 初回ログイン時にdefault beans、default brew methods、settingsを作成する
- `save_recipe_version`: RecipeSeries新規作成または既存seriesへのversion追加をtransactionで行う
- `delete_recipe_version`: 最終version削除禁止、current version更新、version beans削除を一貫して行う
- `replace_user_beans`: 必要であれば現在のPUT semantics相当の全置換をtransaction化する
- `replace_user_brew_methods`: 必要であれば現在のPUT semantics相当の全置換をtransaction化する

単純なMaster更新は通常のtable操作でも可能ですが、全置換保存を維持する場合はRPC化した方が途中失敗に強くなります。

## 46. RecipeSeries保存transaction案

RecipeSeries保存は以下を1transactionにまとめる必要があります。

1. `auth.uid()`を取得する
2. 新規seriesか既存seriesかを判定する
3. 新規seriesの場合は`recipe_series`を作成する
4. 次version番号を決定する
5. `recipe_versions`を作成する
6. `recipe_version_beans`を複数作成する
7. `recipe_series.current_version_id`と`updated_at`を更新する
8. 保存結果としてseries ID、version ID、version番号を返す

ブラウザから複数insert/updateを順番に実行すると途中失敗時に不整合が残りやすいため、RPCまたはtransaction相当処理を推奨します。

## 47. 初回default data生成RPC案

初回ログイン時に、ユーザーの`beans`、`brew_methods`、`app_settings`が空であればdefault dataを生成します。

推奨RPC:

- 入力: なし、または明示的なseed不要
- 所有者: `auth.uid()`
- 出力: 初期化後のstateまたは作成有無
- 冪等性: 既存dataがある場合は重複作成しない

default dataの値・順序・構造は`defaultCoffeeData`と一致させます。UUIDをDBで生成する場合、現在の固定IDとの互換が必要かは実装前に判断します。

## 48. データ移行時の注意点

- SQLiteの旧文字列IDをUUIDへ変換するか、互換用legacy IDとして保持するかを決める必要があります。
- JSON export/importを移行手段にする場合、snapshotとarchive済みseriesを必ず含めます。
- `recipe_version_beans.bean_id`はnullableに変更するため、削除済みBeanはNULLとsnapshotで表現します。
- BrewMethodも同様に、削除済みMasterはNULLとsnapshotで表現します。
- legacy `blend_recipes`はRecipeSeriesへ変換済みの形で移行します。
- 日時TEXTは`timestamptz`へ変換します。
- SQLite WAL利用中のDBを直接コピーする場合は、サーバー停止中のbackupを推奨します。
- localStorage fallback dataはSQLiteと自動同期されないため、どちらを移行正本にするかユーザーが選ぶ必要があります。

## 49. 未確定事項

- 旧IDをSupabaseでも保持するか、新UUIDへ変換するか。
- default dataのIDを固定互換にするか、ユーザーごとのUUIDにするか。
- `recipe_series.current_version_id`にFKを置くか、RPC管理に留めるか。
- BrewMethod percent値にDB check制約を入れるか。
- `sensory`をjsonbのままにするか、将来集計のため通常カラム化するか。
- JSON exportからのimport UI/APIを作るか。
- localStorage fallback dataを移行対象に含めるか。
- Master削除を物理削除で確定するか、将来監査用途のためsoft deleteを残すか。

## 50. migration作成前に決めるべき事項

1. 既存SQLite IDをUUIDへ変換するか。
2. 初回default dataのIDを固定するか、DB生成UUIDにするか。
3. `app_settings`をtyped 1 row形式で確定するか。
4. Master削除を物理削除で確定するか。
5. Recipe保存RPCの戻り値をどこまで返すか。
6. JSON export importを正式な移行導線にするか。
7. `current_version_id`のFK有無。
8. BrewMethod percentのcheck制約範囲。
9. Preview/ProductionでSupabase projectを分ける運用。
10. 移行対象データをSQLite、localStorage、JSON exportのどれにするか。

## 補足: app_settings形式の比較

| 案 | 内容 | 利点 | 欠点 |
| --- | --- | --- | --- |
| A | 1ユーザー1行で設定カラムを持つ | 型安全、FKを貼りやすい、RLSが単純 | 設定追加ごとにmigrationが必要 |
| B | key-value形式で複数行 | 設定追加が容易 | 型が弱い、FK制約が弱い、queryが増える |

現在の設定は`selectedBrewMethodId`のみです。Supabase版ではAを推奨します。設定追加頻度より、型安全性と所有者分離の明確さを優先します。

## 補足: soft delete比較

| 対象 | 物理削除 | soft delete |
| --- | --- | --- |
| Beans | snapshotと`bean_id NULL`で過去recipeを保持できる | 削除済みMasterの非表示条件が増える |
| BrewMethods | snapshotと`brew_method_id NULL`で過去recipeを保持できる | UI/Repositoryで常に`deleted_at is null`が必要 |
| RecipeSeries | archiveが既にsoft delete相当 | 二重の削除概念になる |
| RecipeVersion | 現在は物理削除仕様 | 復元UIがないと複雑化する |

推奨は、Beans/BrewMethods/RecipeVersionsは物理削除、RecipeSeriesは現在どおり`status`によるarchiveです。
