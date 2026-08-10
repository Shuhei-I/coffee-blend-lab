# Coffee Blend Lab ロードマップ

## 現在の状態

アプリケーションは Supabase への移行を完了しています。

完了済み:

- Authentication
- Supabase repositories
- 豆データの永続化
- 抽出方法データの永続化
- Recipe series と version の永続化
- App settings の永続化
- SQLite runtime の削除
- localStorage fallback の削除
- レガシー Node API の削除
- 自動テスト
- Production build

## v1.0 の目標

新規ユーザーが、混乱せずに次のことを行える状態にします。

1. 豆を登録する
2. 抽出方法を登録する
3. ブレンドを作成する
4. レシピとして保存する
5. 別バージョンを作成する
6. 以前のバージョンを比較し、再利用する

## リリース優先度

### P0 — 公開前に必須

- Production smoke test
- レスポンシブナビゲーション
- モバイルレイアウト
- 明確な loading / error state
- 信頼できる保存確認
- Privacy policy
- Terms of use
- Contact or feedback route

Contact route のメモ:

- 非公開のフィードバック窓口が利用可能になるまでは、初期ルートで「準備中」状態を表示してよい。
- 個人メールアドレスを frontend source や built assets に含めない。
- 将来の feedback/contact は、Supabase Edge Function などの server-side relay を使い、宛先アドレスを client bundle の外に置く。

### P1 — コアプロダクト体験

- テイスティングノート
- 評価または好みの記録
- バージョン比較
- 前バージョンからの変更点の明確化
- 実験を続ける action
- ホーム画面の最近の実験

### P2 — 共有

- 公開またはリンクベースのレシピ共有
- バージョン履歴の共有
- 共有レシピのコピー
- Attribution
- Branch または remix の概念

### P3 — 後続の探索

- AI blend suggestions
- Inventory management
- PDF export
- Images
- Community features
- `docs/future-home-ui-structure.md` に基づく app-home structure
