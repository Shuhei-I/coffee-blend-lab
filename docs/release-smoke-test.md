# Coffee Blend Lab Release Smoke Test

リリース前に手動で確認する項目です。期待結果が違う場合は、原因を記録してからリリース判断をしてください。

## 1. 起動

- [ ] `npm run dev:server` を起動する  
  期待結果: `SQLite API server listening at http://127.0.0.1:4174` が表示される。

- [ ] 別terminalで `npm run dev` を起動する  
  期待結果: Viteのfrontend URLが表示される。

- [ ] frontendを開く  
  期待結果: アプリが表示され、保存モードがSQLiteになる。

- [ ] API serverを止めた状態でfrontendをreloadする  
  期待結果: アプリが表示され、保存モードがLocalになる。

## 2. 豆マスタ

- [ ] 豆を追加する  
  期待結果: 新しい豆が一覧に追加され、ブレンド画面にも反映される。

- [ ] 豆名、メモ、原価、表示設定を編集する  
  期待結果: 入力値が画面に反映される。

- [ ] profile値を編集する  
  期待結果: 0から100の範囲で扱われ、味プロファイル表示に反映される。

- [ ] 豆を削除する  
  期待結果: 確認dialog後に削除され、ブレンド比率からも外れる。

- [ ] 最後の1件を削除しようとする  
  期待結果: 削除されない。

- [ ] 豆マスタを保存し、browser reloadする  
  期待結果: 保存した豆が復元される。

## 3. 抽出方法マスタ

- [ ] 抽出方法を追加する  
  期待結果: 新しい抽出方法が一覧に追加され、選択中になる。

- [ ] 名前、メモ、蒸らし量、投湯配分、蒸らし時間を編集する  
  期待結果: 入力値が反映される。

- [ ] ブレンド画面で抽出方法を選択する  
  期待結果: 抽出スケジュールと湯量表示が更新される。

- [ ] 抽出方法を削除する  
  期待結果: 確認dialog後に削除される。選択中のものを削除した場合は既存仕様どおり別methodが選択される。

- [ ] 最後の1件を削除しようとする  
  期待結果: 削除されない。

## 4. ブレンド作成

- [ ] 豆の比率をinput/slider/buttonで変更する  
  期待結果: 比率、合計、原価、味プロファイルが更新される。

- [ ] 合計が100以外になるようにする  
  期待結果: 既存の警告表示が出る。

- [ ] 100%正規化を実行する  
  期待結果: 比率合計が100になる。

- [ ] 豆ごとの焙煎度を選択する  
  期待結果: 選択値が画面に保持される。

- [ ] 粉量を変更する  
  期待結果: 豆ごとの粉量、抽出量、原価が更新される。

- [ ] brew ratioを変更する  
  期待結果: target brew gramと抽出スケジュールが更新される。

- [ ] 試飲評価とメモを入力する  
  期待結果: 入力値が保持される。

## 5. レシピ保存と読み込み

- [ ] 新規レシピを保存する  
  期待結果: RecipeSeries v1として保存され、保存メッセージが表示される。

- [ ] 保存済みレシピを読み込む  
  期待結果: 名前、比率、焙煎度、粉量、brew ratio、抽出方法、試飲評価、メモが復元される。

- [ ] 読み込んだレシピに変更メモを入れてversion追加保存する  
  期待結果: 同じRecipeSeriesに新しいversionが追加される。

- [ ] RecipeSeriesをarchiveする  
  期待結果: archived表示切り替えで確認できる。

- [ ] archived RecipeSeriesをrestoreする  
  期待結果: activeとして戻る。

- [ ] versionを削除する  
  期待結果: 最後の1件でなければ削除され、version順は既存仕様どおり維持される。

- [ ] masterから削除済みの豆または抽出方法を含むrecipeを読み込む  
  期待結果: 保存時snapshotにより過去recipeの情報が表示される。

## 6. Export

- [ ] JSON exportを実行する  
  期待結果: `coffee-blend-recipes.json` がdownloadされ、archived series、snapshot、`ratios[].roastLevel` が含まれる。

- [ ] CSV exportを実行する  
  期待結果: `coffee-blend-recipes.csv` がdownloadされ、`roastLevel` 列が含まれる。

- [ ] CSVをtext editorで開く  
  期待結果: UTF-8として読める。BOMは付与されない。

- [ ] Windows ExcelでCSVを直接開く  
  期待結果: 日本語が文字化けする場合がある。その場合はExcelのデータ取り込みでUTF-8を指定する。

## 7. 永続化

- [ ] browser reloadする  
  期待結果: SQLite modeではDBから、Local modeではlocalStorageからデータが復元される。

- [ ] API serverを再起動する  
  期待結果: `data/coffee-manager.sqlite` が残っていればSQLiteデータが保持される。

- [ ] API停止中にLocal modeで編集する  
  期待結果: localStorageへ保存される。API復旧後にSQLiteへ自動統合されないことを確認する。

## 8. Backup / Restore

- [ ] API serverを停止する  
  期待結果: DBへの書き込みが止まる。

- [ ] `data/coffee-manager.sqlite` を別の場所へcopyする  
  期待結果: backupファイルが作成される。

- [ ] 現在のDBを退避し、backupを元の場所へ戻す  
  期待結果: API server再起動後にbackup時点のデータが表示される。
