# [タスク3-1] キャラクター基本システム

## 概要
- エピック: #3
- タスク: #3-1
- 関連PR/要件: @docs/prd/requirements.md セクション2.2

## 設計方針

### 基本方針
- 各キャラクターは独立したエンティティとして管理
- 能力値は6つのパラメータで構成（HP、攻撃力、防御力、速さ、移動速度、視界）
- 拡張性を考慮し、インターフェースベースの設計を採用

### 技術選定
- TypeScriptの型システムを活用した堅牢な実装
- Phaser3のGameObjectを継承したキャラクタークラス

## インターフェース定義

### キャラクターパラメータ
```typescript
interface CharacterStats {
  hp: number;          // 体力 (20-100)
  maxHp: number;       // 最大体力
  attack: number;      // 攻撃力 (5-100)
  defense: number;     // 防御力 (3-100)
  speed: number;       // 速さ (5-50) - 攻撃間隔に影響
  moveSpeed: number;   // 移動速度 (3-30) - 高いほど速い
  sight: number;       // 視界 (3-20) - マス単位
}

interface Character {
  id: string;
  name: string;
  stats: CharacterStats;
  position: { x: number; y: number };
  
  takeDamage(amount: number): void;
  heal(amount: number): void;
  getAttackInterval(): number;  // 90 / speed
  isAlive(): boolean;
}
```

### 主要コンポーネント
- **Character**: キャラクターの基本実装クラス
- **CharacterStats**: 能力値管理
- **CharacterFactory**: キャラクター生成用ファクトリ

## テスト方針
- 能力値の範囲制限テスト
- ダメージ・回復処理のテスト
- 攻撃間隔計算の検証
- 生存判定のテスト

## 未解決事項
- [ ] スプライト表示の実装詳細
- [ ] アニメーションシステムとの連携
- [ ] ステータス異常の実装方針