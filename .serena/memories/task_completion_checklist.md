# タスク完了時のチェックリスト

## **重要** 実装タスクの最後にやること（MUST）

適用条件: 1行でも実装を修正した場合は**必須**

### 1. テスト実行
```bash
npm test
```
- テストエラーがある場合、原因を特定
- テストが悪いのか、実装が悪いのか判断
- 必要に応じて修正

### 2. コード整形
```bash
npm run format
```
- Prettierによる自動整形を実行
- 行幅100文字、シングルクォート、セミコロン必須

### 3. Lintチェック
```bash
npm run lint
```
- ESLintエラーがある場合は修正
- 自動修正可能な場合: `npm run lint:fix`

### 4. 型チェック
```bash
npm run typecheck
```
- TypeScriptの型エラーを確認
- strict: trueで厳格にチェック

### 5. 最終確認コマンド（推奨）
```bash
npm run format && npm run lint:fix && npm test
```

## 追加確認事項

### ドキュメント更新
- 設計書の更新が必要な場合: `docs/design/epic-XX-name/task-X-Y-*.md`
- PRDの更新が必要な場合: `docs/prd/requirements.md`

### git操作
- 変更内容の確認: `git status`
- 差分確認: `git diff`
- コミットメッセージは日本語でわかりやすく

### レビュー観点
- 要求仕様に沿っているか
- YAGNI/KISS原則に従っているか
- 既存のコードスタイルに合っているか
- UIの配置パターンに従っているか（cam.worldView使用）