# 開発コマンド集

## 開発サーバー
- `npm run dev` - 開発サーバー起動（http://localhost:8081）
- `npm run build` - プロダクションビルド作成
- `npm run serve` - ビルド済みファイルをローカルサーバーで確認

## テスト実行
- `npm test` - 全テスト実行
- `npm run test:watch` - ファイル変更を監視しながらテスト実行
- `npm run test:coverage` - カバレッジレポート付きテスト実行
- `npm test -- path/to/test.ts` - 単一テストファイル実行
- `NODE_OPTIONS="--max-old-space-size=4096" npm test` - メモリ不足時のテスト実行

## コード品質チェック
- `npm run lint` - ESLintでコードチェック
- `npm run lint:fix` - ESLintの自動修正実行
- `npm run format` - Prettierでコード整形
- `npm run format:check` - フォーマットチェックのみ（変更なし）
- `npm run typecheck` - TypeScriptの型チェック

## Git操作（ghコマンド推奨）
- `gh pr create` - プルリクエスト作成
- `gh pr list` - PRの一覧表示
- `gh issue create` - イシュー作成
- `gh repo view --web` - リポジトリをブラウザで開く
- `git status` - 変更状況確認
- `git diff` - 差分確認
- `git log --oneline -n 10` - 最近のコミット確認

## システムコマンド（Darwin）
- `ls -la` - ファイル一覧（隠しファイル含む）
- `find . -name "*.ts"` - TypeScriptファイル検索
- `grep -r "pattern" src/` - パターン検索（ripgrepの`rg`推奨）
- `rg "pattern"` - 高速パターン検索（ripgrep）
- `tree -L 2 src/` - ディレクトリ構造表示

## 頻繁に使う組み合わせ
1. **実装後の確認**: `npm run format && npm run lint:fix && npm test`
2. **コミット前**: `npm run typecheck && npm test`
3. **PR作成前**: `npm run format:check && npm run lint && npm test`