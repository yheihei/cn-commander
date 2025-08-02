# コードスタイルと規約

## TypeScript規約
- **厳格モード**: 全てのstrict設定が有効
- **型定義**: 明示的な型定義を推奨（noImplicitAny: true）
- **未使用変数**: 許可しない（noUnusedLocals/noUnusedParameters: true）
- **暗黙的return**: 許可しない（noImplicitReturns: true）
- **Null/Undefined**: 厳格にチェック（strictNullChecks: true）

## Prettier設定
- **行幅**: 100文字
- **インデント**: スペース2つ
- **セミコロン**: 必須
- **クォート**: シングルクォート
- **末尾カンマ**: 全て付ける（trailingComma: all）
- **アロー関数の括弧**: 常に付ける（arrowParens: always）
- **改行コード**: LF

## 命名規則
- **クラス**: PascalCase（例：`ArmyManager`）
- **インターフェース**: PascalCaseで`I`プレフィックス（例：`IAttackable`）
- **型定義**: PascalCase（例：`MovementMode`）
- **定数**: UPPER_SNAKE_CASE（例：`MAP_CONFIG`）
- **ファイル名**: PascalCase（例：`MovementManager.ts`）

## ディレクトリ構造
- **マネージャー単位**: 各システムごとにディレクトリを分割
- **責務の分離**: エンティティとマネージャーを分離
- **型定義**: `src/types/`に集約

## コーディング原則
- **YAGNI**: 今必要じゃない機能は作らない
- **KISS**: 複雑な解決策より単純な解決策を優先
- **マネージャーパターン**: 各システムにマネージャークラスを配置
- **ファクトリーパターン**: エンティティ生成を抽象化

## UIパターン
- **オブジェクト指向UI（OOUI）**: オブジェクトを選択してから操作を表示
- **固定位置UI**: cam.worldViewを基準に配置、update()で位置更新
- **ワールド座標UI**: ゲーム世界に配置、カメラの影響を受ける
- **setScrollFactor(0)は使用禁止**: 全てワールド座標系で統一