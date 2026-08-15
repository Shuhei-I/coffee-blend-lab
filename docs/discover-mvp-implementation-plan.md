# Discover MVP 実装計画

## 目的

Discover MVP は、Coffee Blend Lab の個人ブレンド記録を公開可能な知見として扱い、他ユーザーが自分の実験へ取り込める導線を作る。

優先する循環は次の通り。

```text
Blend
Version
Publish Snapshot
Discover
Copy
New Blend
Experiment
```

SNS 的な投稿機能を広げるより、公開済みブレンドスナップショットを安全に閲覧・コピーできることを優先する。

## 現在の構造

### ブレンド関連テーブル

現在の Supabase schema は、ユーザー所有の作業データを中心に構成されている。

- `beans`
- `brew_methods`
- `recipe_series`
- `recipe_versions`
- `recipe_version_beans`
- `app_settings`

`recipe_series` がブレンド単位、`recipe_versions` が履歴の各バージョン、`recipe_version_beans` がバージョン内の豆構成を持つ。

主な制約は次の通り。

- `recipe_versions(user_id, series_id, version_number)` が UNIQUE
- `recipe_version_beans(user_id, recipe_version_id, position)` が UNIQUE
- `recipe_versions.series_id` は同じ `user_id` の `recipe_series` のみ参照可能
- `recipe_version_beans.bean_id` は削除時に NULL になり、`bean_snapshot` は残る
- `recipe_versions.brew_method_id` は削除時に NULL になり、`brew_method_snapshot` は残る

既に snapshot の考え方があるため、Discover の公開 snapshot とは相性が良い。

### バージョン管理方式

レシピ保存は `save_recipe_version(payload jsonb)` RPC で行われる。

- 認証済みユーザーのみ実行可能
- 新規 series の場合は `recipe_series` と version 1 を作成
- 既存 series の場合は最大 `version_number + 1` で新しい version を作成
- version と豆構成は同一 RPC 内で保存
- 既存 version の上書きではなく、常に新規 version を追加する

Discover の公開単位は `recipe_versions.id` に対応させるのが自然。

### Supabase Auth とユーザー情報

現在は Supabase Auth の session を `useAuth` で取得し、ログイン後に `initialize_user_defaults()` RPC を実行して初期データを作成している。

公開プロフィール用の `profiles` table はまだ存在しない。

メールアドレスや認証 provider 情報を公開 UI に使わないため、Discover では `auth.users` とは別に `profiles` を追加する。

### Storage

現時点でアプリコード内に Supabase Storage の upload / public URL / signed URL 利用はない。

写真対応は完全に新規基盤になるため、公開投稿の前提機能にせず、次のどちらかで段階化する。

- 推奨: 先に画像なしの公開 snapshot と Discover 導線を作り、その後に version 写真と公開用画像 copy を追加する
- 代替: Phase 2 で private/public bucket を同時に導入する

MVP 計画では写真を含めるが、実装リスクを下げるため最初の DB/RLS PR では画像カラムだけ予約し、Storage 操作は後続 PR に分ける。

### RLS

既存 table はすべて RLS 有効で、`authenticated` が自分の `user_id` の行だけ select/insert/update/delete できる。

Discover では初めて `anon` から read できる公開データが必要になる。

既存の個人作業データは公開しない。公開用 table を別レイヤーに追加し、公開対象は snapshot table と post table に限定する。

### UI とルーティング

現在の UI は `src/main.jsx` の `activePage` state で以下のページを切り替える。

- `blend`
- `brew`
- `record`
- `history`
- `manage`

React Router は使っていない。

また、`Root` が `AuthGate` で `App` 全体を囲んでいるため、未ログインユーザーはアプリ内のどのページにも入れない。

未ログイン Discover 閲覧を MVP に含める場合、`AuthGate` を「アプリ全体の入口」から「認証が必要な操作の入口」へ移す必要がある。これは Discover の重要な前提変更になる。

## 推奨 DB 追加案

### `profiles`

公開用プロフィール。

```text
profiles
- user_id uuid primary key references auth.users(id) on delete cascade
- username text not null
- display_name text not null default ''
- bio text not null default ''
- avatar_path text
- created_at timestamptz not null default now()
- updated_at timestamptz not null default now()
```

制約:

- `lower(username)` の一意性を保証
- username は `^[a-z0-9_]{3,20}$`
- DB 保存時は小文字に正規化

### `published_blend_snapshots`

公開時点の immutable recipe snapshot。

```text
published_blend_snapshots
- id uuid primary key default gen_random_uuid()
- owner_user_id uuid not null references auth.users(id) on delete cascade
- source_series_id uuid
- source_version_id uuid
- source_version_number integer not null
- blend_name text not null
- version_name text not null default ''
- snapshot jsonb not null
- image_path text
- created_at timestamptz not null default now()
```

`snapshot` には豆構成、配合比率、保存時点の bean snapshot、抽出関連 snapshot を入れる。検索や制約に使う情報は通常カラムとして分離する。

snapshot は原則 UPDATE しない。

### `posts`

公開投稿の状態とコメント本文。

```text
posts
- id uuid primary key default gen_random_uuid()
- user_id uuid not null references auth.users(id) on delete cascade
- snapshot_id uuid not null references published_blend_snapshots(id)
- source_version_id uuid not null
- content text not null default ''
- status text not null default 'published'
- published_at timestamptz
- created_at timestamptz not null default now()
- updated_at timestamptz not null default now()
```

制約:

- `status in ('published', 'private', 'deleted')`
- `source_version_id` は UNIQUE

1 version 1 post のルールは `source_version_id` の UNIQUE で守る。非公開から再公開する場合は同じ post を `published` に戻す。

### `post_likes`

```text
post_likes
- user_id uuid not null references auth.users(id) on delete cascade
- post_id uuid not null references posts(id) on delete cascade
- created_at timestamptz not null default now()
```

主キーは `(user_id, post_id)`。

### `post_comments`

```text
post_comments
- id uuid primary key default gen_random_uuid()
- post_id uuid not null references posts(id) on delete cascade
- user_id uuid not null references auth.users(id) on delete cascade
- content text not null
- status text not null default 'visible'
- created_at timestamptz not null default now()
- updated_at timestamptz not null default now()
```

`status` は `visible`, `hidden`, `deleted` を想定する。投稿主による非表示は `hidden` で扱い、物理削除しない。

### `reports`

```text
reports
- id uuid primary key default gen_random_uuid()
- reporter_user_id uuid references auth.users(id) on delete set null
- target_type text not null
- target_id uuid not null
- reason text not null
- details text not null default ''
- status text not null default 'open'
- created_at timestamptz not null default now()
```

MVP では authenticated のみ通報可能にする。未ログイン通報は spam 対策が必要になるため後回しにする。

## 推奨 RLS

### 公開 read

- `profiles`: anon/authenticated が SELECT 可能
- `posts`: `status = 'published'` のみ anon/authenticated が SELECT 可能
- `published_blend_snapshots`: published post から参照される snapshot のみ anon/authenticated が SELECT 可能
- `post_comments`: published post の `visible` comment のみ anon/authenticated が SELECT 可能
- `post_likes`: 集計用 view または RPC 経由で件数を返す

### 本人操作

- profile は本人のみ INSERT/UPDATE
- post 作成・content/status 更新は本人のみ
- snapshot INSERT は本人のみ、UPDATE/DELETE は原則不可
- like は authenticated の本人のみ INSERT/DELETE
- comment は authenticated の本人のみ INSERT/UPDATE/DELETE
- 投稿主は自分の post に対する comment を `hidden` にできる

## 推奨 RPC

複数 table の整合性が必要な処理は RPC に寄せる。

### `publish_recipe_version(payload jsonb)`

責務:

- `auth.uid()` 必須
- 対象 `recipe_versions.id` が本人所有であることを確認
- series/version/beans を読み込み、公開 snapshot を生成
- `posts.source_version_id` の UNIQUE に従い、未公開 post があれば再利用
- content と status を更新
- post id を返す

写真 copy は Storage 導入後にこの RPC とは別のサーバー処理で扱うか、Edge Function に寄せる。

### `copy_published_blend(post_id uuid)`

責務:

- `auth.uid()` 必須
- post が `published` であることを確認
- snapshot から本人の `recipe_series`, `recipe_versions`, `recipe_version_beans` を作成
- copy 元として `source_post_id` または `source_snapshot_id` を保持
- 作成した series/version id を返す

copy 元 post が削除されても、作成済みの個人ブレンドは残す。

## 変更が必要な既存ファイル

### DB / data

- `supabase/migrations/*`
- `src/data/*Discover*Repository.js`
- `src/data/*Profile*Repository.js`
- `src/data/recipeMapper.js` または Discover 専用 mapper
- `src/hooks/useCoffeeData.js` または Discover 専用 hook

### UI

- `src/main.jsx`
- `src/components/AuthGate.jsx`
- `src/components/RecipeLibrary.jsx`
- 新規 `DiscoverTimeline.jsx`
- 新規 `DiscoverCard.jsx`
- 新規 `PublicBlendDetail.jsx`
- 新規 `PublicProfile.jsx`
- 新規 `PublishBlendDialog.jsx`
- 新規 `ProfileEditor.jsx`

既存 `RecipeLibrary` には version 単位の「公開」導線を追加するのが自然。ただし History は比較・再利用の場なので、公開 action は控えめな secondary action にする。

## 安全な実装単位

### Phase 1: 公開プロフィール基盤

- `profiles` table / RLS / index / trigger
- username 正規化 helper
- 初回ログイン後の profile 初期化
- profile 表示・編集 UI
- tests: username validation, profile repository, AuthGate 既存挙動

この PR は既存 recipe 保存に触れない。

### Phase 2: 公開 shell と未ログイン閲覧入口

- `AuthGate` を全体ゲートから private workbench gate へ変更
- `discover` page を追加
- 未ログインでは Discover / Legal のみ閲覧可
- private 操作時は login へ誘導
- tests: 未ログインで Discover が表示でき、Blend/Record などは login が必要

未ログイン閲覧を入れるなら、この phase を早めに切る。

### Phase 3: snapshot / posts の DB と publish RPC

- `published_blend_snapshots`
- `posts`
- RLS
- `publish_recipe_version`
- `RecipeLibrary` から version 公開
- tests: 同一 version の重複公開不可、非公開から再公開、元 version 変更後も snapshot 不変

写真はこの時点では未対応、`image_path` は NULL 許容で予約する。

### Phase 4: Discover 一覧・詳細

- 新着順 timeline
- 20 件 pagination
- Discover card
- 公開ブレンド詳細
- published 以外は通常ユーザーから見えない
- tests: pagination query, empty/loading/error, unpublished 非表示

### Phase 5: コピー

- `copy_published_blend`
- copy 元参照カラムまたは `recipe_forks`
- 「自分のブレンドに追加」
- 完了後に作成した blend を開く
- tests: copy 後に元 post を削除しても copy が残る、snapshot から作られる豆構成が一致する

### Phase 6: いいね・コメント

- `post_likes`
- `post_comments`
- toggle like
- comment CRUD
- 投稿主による comment hidden
- tests: 1 user 1 like、本人だけ編集削除、投稿主だけ hidden

### Phase 7: 写真・通報・仕上げ

- version 写真 1 枚
- private bucket と public snapshot bucket
- publish 時の public image copy
- reports
- mobile polish
- moderation 運用メモ

写真は価値があるが Storage/RLS/画像最適化の面で独立したリスクがあるため、公開 snapshot の基本導線が動いてから入れる。

## 既存機能への影響範囲

- 既存 recipe table の RLS は変更しない
- 既存保存 RPC `save_recipe_version` は変更しない
- Discover は公開用 table を追加する別レイヤーにする
- 未ログイン閲覧を入れる場合のみ `AuthGate` と `Root` の構造変更が必要
- `RecipeLibrary` に公開 action を追加するため、History UI の密度とモバイル表示を確認する必要がある
- Storage 導入までは bundle や既存データへの影響は小さい

## リスク

### AuthGate の再設計

未ログイン閲覧を MVP に含める場合、現在の app 全体ログイン必須モデルを変える必要がある。最初に小さい PR で public/private shell を分ける。

### 公開 snapshot の漏洩

個人用 recipe table を直接公開しない。公開 UI は必ず `posts` と `published_blend_snapshots` だけを読む。

### snapshot JSON の肥大化

将来拡張に備えて jsonb を使うが、timeline で頻繁に使う `blend_name`, `source_version_number`, `published_at` は通常カラムに置く。

### copy 処理の途中失敗

複数 table 作成なので RPC で transaction 化する。UI 側の複数 insert で実装しない。

### 画像のライフサイクル

private version image と public snapshot image は bucket/path を分ける。元 version の写真差し替えや削除で公開済み画像が消えないようにする。

### moderation

公開 UGC になるため、likes/comments より前に最低限の logical delete と reports の形を決める。管理 UI は MVP 後でよいが、DB には status を持たせる。

## 最初の実装 PR 推奨

最初の実装 PR は Phase 1 の `profiles` に限定する。

理由:

- Discover の全投稿に投稿者表示が必要
- メールアドレスや auth provider を公開しない境界を最初に作れる
- 既存 recipe 保存・履歴機能に触れないため regression risk が低い
- username 制約、RLS、初期化処理を小さく検証できる

次の PR で public/private shell を作り、未ログイン Discover 閲覧の土台を作る。
