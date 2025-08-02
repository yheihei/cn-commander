# コードベース構造

## ルートディレクトリ
```
cn-commander/
├── src/              # ソースコード
├── test/             # テストコード
├── docs/             # ドキュメント
├── public/           # 静的ファイル
├── assets/           # ゲームアセット
├── .claude/          # Claude用ルール定義
└── .serena/          # Serena MCP設定
```

## src/ディレクトリ構造

### シーン管理
- `scenes/` - Phaser3のシーンクラス
  - `BootScene` - 初期化処理
  - `PreloadScene` - アセット読み込み
  - `GameScene` - メインゲームロジック

### コアシステム
- `army/` - 軍団システム（1軍団=4人）
  - `Army` - 軍団エンティティ
  - `ArmyManager` - 軍団管理
  - `ArmyFactory` - 軍団生成

- `character/` - キャラクターシステム
  - `Character` - キャラクターエンティティ
  - `CharacterFactory` - キャラクター生成
  - `jobs/` - 職業クラス（風忍、鉄忍、影忍、薬忍）

- `map/` - マップシステム
  - `MapManager` - マップ全体管理
  - `MapTile` - タイル情報
  - `MapLayer` - レイヤー管理

- `movement/` - 移動システム
  - `MovementManager` - 移動指示管理
  - `MovementProcessor` - 移動処理実行
  - `MovementCalculator` - 移動速度計算
  - `MovementCommand` - コマンドパターン

- `combat/` - 戦闘システム
  - `CombatSystem` - 戦闘統括
  - `CombatCalculator` - 戦闘計算
  - `CombatEffectManager` - エフェクト管理
  - `AttackTimer` - 攻撃タイマー管理

- `vision/` - 視界システム
  - `VisionSystem` - 視界計算
  - `DiscoverySystem` - 敵発見管理

- `base/` - 拠点システム
  - `Base` - 拠点エンティティ
  - `BaseManager` - 拠点管理
  - `BaseCombatSystem` - 拠点戦闘

- `item/` - アイテムシステム
  - `Item` - アイテム基底クラス
  - `Weapon` - 武器クラス
  - `Consumable` - 消耗品クラス
  - `WeaponFactory` - 武器生成
  - `ConsumableFactory` - 消耗品生成

### UI/入力
- `ui/` - UIコンポーネント
  - `UIManager` - UI統括管理
  - `ActionMenu` - 行動選択メニュー
  - `ArmyInfoPanel` - 軍団情報パネル
  - `BaseInfoPanel` - 拠点情報パネル
  - `MovementModeMenu` - 移動モード選択
  - その他多数のUIコンポーネント

- `input/` - 入力処理
  - `MovementInputHandler` - 移動入力処理
  - `AttackTargetInputHandler` - 攻撃目標入力処理

### 設定/型定義
- `config/` - ゲーム設定
  - `gameConfig` - Phaser設定
  - `mapConfig` - マップ設定

- `types/` - TypeScript型定義
  - 各システムの型定義ファイル
  - `global.d.ts` - グローバル型定義

## test/ディレクトリ構造
```
test/
├── integration/      # 統合テスト
│   ├── epic-01-foundation/
│   ├── epic-02-map-terrain/
│   ├── epic-03-character/
│   └── ...（エピックごと）
├── fixtures/         # テストデータ
└── setup.ts         # テスト環境セットアップ
```

## docs/ディレクトリ構造
```
docs/
├── design/          # 設計書
│   └── epic-XX-name/  # エピックごとの設計書
├── epics/           # エピック管理
│   └── epic.md      # タスク一覧
└── prd/             # 要求定義
    └── requirements.md
```