# 将来の Home UI 構造

この文書は、`docs/reference/future-home-ui.png` に着想を得た長期的な UI 方針を記録します。

これは直近の v1.0 実装対象ではありません。現在の v1.0 navigation は、次の実験 workflow に集中します。

Create -> Brew -> Record -> Review -> Refine

ここで説明する将来構造は、core workflow、release stability、version comparison experience が十分に信頼できる状態になってから検討します。

## Design intent / 設計意図

理想的な UI は、単一の workbench screen ではなく、app-like な home experience です。

目的は、ユーザーが文脈を持ってコーヒー探索に戻れるようにすることです。

- 最近の実験を続ける
- 最近の blend records を確認する
- blend ideas や testing themes を見つける
- recording flow に素早く入る
- メイン workflow を混雑させずに、beans、brew methods、settings、account information へアクセスする

この方向性は、次の product promise を保つ必要があります。

Coffee Blend Lab は、見える化され、比較でき、共有できる実験を通じて、ユーザーが自分の好みに合うコーヒーを見つけることを支援します。

## 目標とする top-level structure

将来の top-level navigation では、次の primary sections を使う可能性があります。

1. Home
2. Record
3. Library
4. Discover
5. My Page

日本語ラベル:

1. ホーム
2. 記録する
3. ライブラリ
4. 見つける
5. マイページ

これは現在の v1.0 phase navigation より広い information architecture です。

各 section に、それを正当化できるだけの実際の product surface が揃うまでは、この構造に切り替えないでください。

## Home

目的:

進行中のブレンド作業へ、文脈を持って入れる入口を提供する。

期待する内容:

- featured または recommended blend idea
- 最近の blend records
- continue experiment action
- 最新の active series への shortcuts
- optional product announcements または prompts

Home は一般的な marketing page になってはいけません。次の問いに答えるべきです。

- 何に取り組んでいたのか
- 最近何が変わったのか
- 次に何を試すべきか

## Record

目的:

active experiment workflow に入る。

この section は、現在の v1.0 structure に基づいた内部 step flow を持つ可能性があります。

1. 配合
2. 抽出
3. 記録

現在の `Blend`, `Brew`, `Record` screens は、最終的にはすべて top-level destinations ではなく、この section 内の steps になるべきです。

## Library

目的:

再利用できる情報と履歴を整理する。

期待する内容:

- Recipe history
- Bean library
- Brew method library
- Saved blend versions
- Archived series

この section は、単なる storage ではなく、comparison と reuse を支えるべきです。

## Discover

目的:

ユーザーが次に何を試すかを決める助けになる ideas を提示する。

将来考えられる内容:

- Shared experiments
- Public blend histories
- Testing themes
- Brewing technique articles
- Community または curated blend examples

この section は sharing と discovery features に依存します。空の shell として導入しないでください。

## My Page

目的:

account-level と personal context をまとめる。

期待する内容:

- Profile
- Settings
- Statistics
- Preferences
- Privacy and account controls

## Visual direction / 視覚方針

`docs/reference/future-home-ui.png` から得た理想的な visual direction には、次の要素が含まれます。

- 強い centered brand header を持つ light app shell
- notifications や account などの明確な icon-based top utilities
- 控えめな border を持つ rounded content cards
- Home 上部付近の大きな visual feature area
- 実際の coffee imagery を使った recent blend cards
- 将来の community や learning surfaces のための topic/discovery cards
- モバイルでの persistent bottom navigation

この visual direction は inspiration として使い、文字どおりの要件としては扱いません。

Coffee Blend Lab は、実用的な blending notebook の感覚を保つべきです。視覚的な豊かさは、experimentation と comparison を支えるために使います。

## 現在の v1.0 との橋渡し

将来の Home structure を正当化できるまでは、現在の top-level workflow navigation を維持します。

1. 配合
2. 抽出
3. 記録
4. 履歴
5. 管理

この現在の structure は、次を直接支えるため v1.0 に適しています。

- ブレンドを作る
- 抽出する
- 結果を記録する
- 過去の version を確認する
- beans と brew methods を管理する

将来構造は、release readiness を遅らせる理由ではなく、後続の product evolution として扱います。

## Migration path / 移行手順

実用的な移行手順:

1. 現在の five-phase workflow navigation を安定させる。
2. History に version comparison と continue-experiment actions を追加する。
3. recent experiments を軽量な Home-like panel または section として追加する。
4. recent experiments、featured prompts、shortcuts に十分な価値が出た段階で、実際の Home screen を導入する。
5. 配合、抽出、記録を `記録する` の内部 flow に移す。
6. 履歴、豆マスタ、抽出方法マスタを、適切な範囲で `ライブラリ` の下に再編成する。
7. sharing または curated discovery が存在する場合にのみ、`見つける` を追加する。

## Decision rule / 判断ルール

将来の Home structure は、次の exploration cycle を強める場合にのみ採用します。

Create -> Taste -> Record -> Compare -> Refine

見た目がより完成している、または app-like に見えるという理由だけで採用しないでください。
