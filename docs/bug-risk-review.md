# Coffee Blend Lab バグリスクレビュー

最終更新: 2026-08-03

この文書は、広範なプロジェクトレビューで見つかった可能性の高いバグリスクを記録します。特に、次のコアプロダクトサイクルに影響し得るリスクに焦点を当てます。

Create -> Taste -> Record -> Compare -> Refine

実施した検証:

- `npm.cmd run build`
- `npm.cmd run test`

レビュー時点の結果:

- Production build は成功。
- 29 test files passed。
- 256 tests passed。

## 高優先度のリスク

### 1. 未完成のブレンドを保存できる

リスク:

レシピ保存経路では、ブレンドが未完成でも保存できる可能性があります。フロントエンドは比率合計が100%でない保存をブロックしておらず、database RPC も豆リストが空でないことと比率が負数でないことだけを確認しています。

関連箇所:

- `src/main.jsx` の `saveRecipe`
- `supabase/migrations/20260730024617_save_recipe_version_rpc.sql` の `save_recipe_version`

影響:

ユーザーが、比較や再現が難しい recipe version を作成できてしまいます。保存済み version が有効なブレンドを表さない可能性があり、実験履歴の価値を弱めます。

推奨対応:

- 保存前のフロントエンドバリデーションを追加する:
  - 少なくとも1つの豆が正の比率を持つ
  - 比率合計が正確に100
  - dose と brew ratio が有効な正の値
- レシピが無効な場合は save button を disabled にする。
- 直接 API 呼び出しで無効な payload が挿入されないよう、`save_recipe_version` にも同じ validation を追加する。
- 無効な保存試行のテストを追加する。

### 2. Supabase の読み込み・保存エラーがメインアプリで十分に見えない

リスク:

`useCoffeeData` は `loading`, `loadError`, `saveError` を公開していますが、メイン UI がそれらを表示していません。部分的な読み込み失敗時に、豆、抽出方法、recipe series が空になっても、ユーザーが明確な説明を見られない可能性があります。

関連箇所:

- `src/hooks/useCoffeeData.js`
- `src/main.jsx`

影響:

ユーザーは、読み込みや権限の問題をデータ消失と誤解する可能性があります。保存失敗も沈黙した失敗のように感じられる可能性があります。

推奨対応:

- Supabase data の読み込み中は workspace-level loading state を表示する。
- `loadError` または `saveError` がある場合は明確な error banner を表示する。
- 「まだデータがない」状態と「データ読み込みに失敗した」状態を区別する。
- 実用的な範囲で読み込み失敗に retry action を提供する。

### 3. 古いレシピを読み込むと、削除済みの豆が編集可能なブレンドから落ちる

リスク:

Recipe version は bean snapshot を保存しており、履歴は保持されています。しかし、レシピを editor に読み込むとき、比率は現在の bean master list から再構築されます。recipe snapshot にだけ存在する削除済みの豆は、編集可能な blend entry として復元されません。

関連箇所:

- `src/domain/coffee/recipeLoad.js`
- `src/domain/coffee/recipeSeries.js`
- `src/components/RecipeLibrary.jsx`

影響:

過去 version は表示できても、historical version から実験を続けると、重要なブレンド構成要素が失われる可能性があります。これは、時間をかけて比較・改善するというプロダクト目標と衝突します。

推奨対応:

- snapshot にだけ存在する豆を、一時的な recipe bean として読み込めるようにする。
- それらの豆を「保存時点の情報」などとして明確に表示する。
- ユーザーが明示的に戻さない限り、snapshot-only beans は bean master と分離して扱う。
- 削除済みの豆を参照するレシピの読み込み・再保存テストを追加する。

## 中優先度のリスク

### 4. 現在の Record UI で version change note を記録できない

リスク:

editor state と save payload は `changeNote` をサポートしていますが、現在の Record screen では入力欄が公開されていません。

関連箇所:

- `src/hooks/useRecipeEditor.js`
- `src/main.jsx`
- `src/components/RecipeNamePanel.jsx`
- `src/components/SensoryPanel.jsx`

影響:

version history から「何を味わったか」は分かっても、「何を変えたか」が分かりにくくなります。これにより、比較と改善の体験が弱くなります。

推奨対応:

- Record flow に「この version で変更したこと」欄を追加する。
- History の version row で change note を目立つように表示する。
- tasting memo と change note を分けて扱う:
  - change note: 何を変えたか
  - tasting memo: 何が起きたか

### 5. 同時に発生した master edit が、より新しい UI state を上書きする可能性がある

リスク:

`updateBeanMaster` と `updateBrewMethodMaster` は、repository call を await した後に hook closure から next state を作っています。ネットワークが遅い場合や短時間に連続編集した場合、古い response が新しい state を上書きする可能性があります。

関連箇所:

- `src/hooks/useCoffeeData.js`

影響:

ユーザーには、編集内容が戻ったり、master row が保存完了後に古い内容へ跳ね戻ったように見える可能性があります。

推奨対応:

- async call 後は functional state update を使う:
  - `setBeans((current) => ...)`
  - `setBrewMethods((current) => ...)`
- per-row saving state を検討する。
- request id または updated timestamp comparison で stale response を無視する。
- repository response が順不同で返るケースのテストを追加する。

### 6. database-level の自動 smoke test がない

リスク:

JavaScript unit tests と production build は通りますが、Supabase migrations を local database に適用し、RLS/RPC flow 全体を検証する自動チェックはありません。

関連箇所:

- `supabase/migrations`
- CI configuration

影響:

SQL regression、RLS boundary のミス、RPC permission 問題が、手動デプロイや production smoke test まで見つからない可能性があります。

推奨対応:

- CI に Supabase local database smoke test を追加する。
- 次をカバーする:
  - migrations が正常に適用される
  - 新規 authenticated user に対して `initialize_user_defaults()` が動作する
  - RLS が cross-user access を防ぐ
  - `save_recipe_version()` が version と beans を atomic に保存する
  - master beans や brew methods を削除しても historical snapshots が保持される

## 推奨修正順

1. 完成したブレンドだけを保存できるよう validation を追加する。
2. メイン workspace に `loading`, `loadError`, `saveError` を表示する。
3. historical recipe を読み込むときに snapshot-only beans を保持する。
4. `changeNote` 入力と History 表示を追加する。
5. async master update state handling を堅牢化する。
6. Supabase migration/RLS/RPC smoke tests を追加する。
