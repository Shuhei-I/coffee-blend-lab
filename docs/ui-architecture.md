# Coffee Blend Lab UI アーキテクチャ

## 目的

UI は、モバイルファーストのブレンド作業台を支えるべきです。

Coffee Blend Lab は、保存済みレシピのダッシュボードではありません。ユーザーがブレンドを素早く調整し、抽出し、何が起きたかを記録し、次に何を試すかを決める場所です。

インターフェースは、次の実験サイクルを進めやすくする必要があります。

Create -> Brew -> Record -> Review -> Refine

## 主要ナビゲーション

主要なモバイル体験には、bottom navigation model を使います。

現在の v1.0 workbench では、ナビゲーションは実験フェーズに基づきます。より広い app-home structure は `docs/future-home-ui-structure.md` に別途記録されており、直近のリリース対象ではなく将来方針として扱います。

主要セクション:

1. Blend
2. Brew
3. Record
4. History
5. Manage

日本語 UI ラベル:

1. 配合
2. 抽出
3. 記録
4. 履歴
5. 管理

bottom navigation は軽く保ちます。すべての機能を直接露出するのではなく、ユーザーが作業フェーズを移動するためのものです。

## セクションの責務

### Blend

目的:

ブレンドを設計する。

含むもの:

- Blend name
- Bean selection
- Bean ratio sliders
- ブレンド内の豆ごとの roast level
- Normalize to 100%
- Blend cost
- Flavor/profile preview

含まないもの:

- Brew timer
- レシピ履歴の完全な閲覧
- Manage から意図的に開く場合を除く bean master editing

### Brew

目的:

現在のブレンドを抽出するためにユーザーを支援する。

含むもの:

- Dose
- Brew ratio
- Target brew amount
- Brew method selection
- Pour schedule
- 将来の brew timer
- 将来の step-by-step brew support

含まないもの:

- Bean master editing
- 長い tasting notes
- Recipe version browsing

### Record

目的:

実験結果を記録する。

含むもの:

- Tasting evaluation
- Improvement memo
- Change note
- Save recipe version
- 明確な save confirmation

含まないもの:

- 詳細な master management
- 完全な archive management
- Public sharing controls

### History

目的:

過去の実験を見つけ、確認し、比較し、再利用する。

含むもの:

- RecipeSeries list
- Version list
- Latest version loading
- Specific version loading
- Archive and restore
- Version deletion guard
- 将来の version comparison

含まないもの:

- Primary blend editing controls
- Brew timer
- Master editing

### Manage

目的:

メインの workbench を混雑させず、補助データを整理する。

含むもの:

- Bean master
- Brew method master
- 将来の account または app settings

含まないもの:

- Main blend workflow
- Recipe version comparison
- Tasting workflow

## カードモデル / Card model

機能単位の card を使います。

推奨パターン:

- 1つの card は1つのユーザー意図に対応する
- card の中では密度のある row UI を使う
- 小さな要素ごとに大きな card にしない
- 画面全体を1つの重い card にしない

例:

- Blend screen: blend identity, bean ratios, profile preview, cost summary
- Brew screen: brew parameters, pour schedule, timer
- Record screen: sensory notes, improvement memo, save action
- History screen: compact version rows を含む series cards
- Manage screen: master list sections

## モバイルファーストのルール

- 主要 action は、実用上可能な範囲で片手で届きやすくする。
- bottom navigation は安定して表示する。
- 現在の作業状態は見える状態、または戻りやすい状態にする。
- 長い form は1ページに積み上げず、作業フェーズごとに分割する。
- button と input は横方向にはみ出さないようにする。
- slider は blend ratio の中心的な操作として維持する。
- Normalize to 100% は中心的な command として維持する。

## デスクトップの挙動

デスクトップでは一度により多くの情報を表示してもよいですが、プロダクト構造を決める基準にはしません。

デスクトップ layout では、必要に応じて広い card、横並び summary、persistent panel を使えます。セクションの責務はモバイルと同じままにします。

## プロダクトらしさ

UI は、集中して使えるコーヒーブレンドの workbench のように感じられるべきです。

特徴は次の要素から生まれるべきです。

- Ratio adjustment
- Blend visualization
- Roast level context
- Brew support
- Tasting records
- Version comparison
- Experiment history

装飾的な複雑さや dashboard 風の密度に頼るべきではありません。

## 将来の UI 作業

次の UI refactor は、以下の順序で評価します。

1. ナビゲーションを軽くし、モバイルファーストにする。
2. Blend と Brew の責務を分ける。
3. 専用の Record flow を作る。
4. History を比較と再利用の画面として改善する。
5. Master management を Manage の背後へ移す。
6. Brew の中に timer と brew guidance を追加する。

## 保留中の UI 要望

以下の要望は、次の UI iteration の候補です。実装時は workbench が次の流れに集中できるようにします。

Create -> Brew -> Record -> Review -> Refine

### エディターのリセット / Editor reset

目標:

- 現在の未保存 editor input を reset できるようにする。

現在の案:

- logo click を reset の開始に使う可能性がある。

推奨挙動:

- logo click ですぐに reset しない。
- logo から reset を始める場合は confirmation dialog を使う。
- header を混雑させずに出せるなら、明示的な reset action を優先する。

未決事項:

- reset は現在の blend/record input だけを消すのか、selected brew method も reset するのか。
- reset 後は現在の page に留まるのか、Blend に戻るのか。

### 次へ action / Next actions

目標:

- Blend の右下に `次へ` action を追加する。
- Brew の右下に `次へ` action を追加する。

期待するナビゲーション:

- Blend -> Brew
- Brew -> Record

メモ:

- bottom navigation を置き換えるのではなく補助する。
- モバイルでは fixed bottom navigation と衝突しないようにする。

### Record の保存位置 / Record save placement

目標:

- Record page の `保存` action を page 下部へ移す。

理由:

- ユーザーは tasting notes と memo content を確認してから version を保存するのが自然です。

メモ:

- save disabled message は、save button と近い位置に保ち、意味が伝わるようにする。
- save action は視覚的に明確で、届きやすい状態を保つ。

### History のラベルと export 表示 / History labels and export visibility

要望:

- `Archived` を `アーカイブ` に変更する。
- archive count display を削除する。
- JSON と CSV export button は現時点では非表示にする。

メモ:

- export behavior は将来のために code に残してよい。
- test は JSON と CSV が現在の visible History UI に含まれないことを反映する。

## 将来の Brew data

これらの field は、将来の RecipeVersion または BrewMethod data の候補です。記録、比較、再現性を強める場合にのみ追加します。

### 挽き目 / Grind size

目標:

- grind size を記録する。

候補:

- 細挽き
- 中細挽き
- 中挽き
- 粗挽き

未決事項:

- 固定 options、free text、またはその両方のどれにするか。

### Equipment

目標:

- brewing equipment または device を記録する。

例:

- ペーパードリップ
- フレンチプレス
- サイフォン

未決事項:

- equipment は BrewMethod master data に含めるのか、各 RecipeVersion に直接保存するのか。

### 抽出温度 / Brew temperature

目標:

- brew temperature を記録する。

推奨する初期形:

- 摂氏のみの numeric value。
- optional field。

未決事項:

- brew temperature は Brew のみに表示するのか、History にも summary として表示するのか。

## Brew stopwatch

目標:

- Brew section の下に stopwatch を追加する。

挙動:

- Start で3秒 countdown を開始する。
- countdown 後に計測を開始する。
- Reset で idle に戻る。
- stopwatch は5分で自動 reset する。

期待する state:

- idle
- countdown
- running
- auto-reset

操作:

- Start
- Reset

メモ:

- stopwatch は記録や保存を妨げない。
- step-by-step brew guidance を追加する前に、まず単純に保つ。

## 推奨 UI 実装順

1. History labels を整理し、JSON/CSV を非表示にする。
2. Blend と Brew に `次へ` action を追加する。
3. Record save action を下部へ移す。
4. confirmation 付きの安全な reset action を追加する。
5. Brew stopwatch を追加する。
6. grind size、equipment、brew temperature fields を追加する。
