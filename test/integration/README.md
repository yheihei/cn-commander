# 統合テスト構成

統合テストはエピック単位でフォルダを分けて管理します。

## ディレクトリ構造

```
test/integration/
├── epic-01-foundation/       # 基盤システムの統合テスト
├── epic-02-map-terrain/      # マップ・地形システムの統合テスト
│   └── MapSystem.integration.test.ts
├── epic-03-character-unit/   # キャラクター・軍団システムの統合テスト
├── epic-04-movement/         # 移動システムの統合テスト
└── ...
```

## 命名規則

- フォルダ名: `epic-XX-system-name/`
- テストファイル名: `[SystemName].integration.test.ts`
- describe文: `[エピックX] SystemName Integration Tests`

## テスト作成ガイド

各エピックの機能が正しく連携することを確認するテストを作成します。
詳細は `.claude/rules/integration-test.md` を参照してください。