# [タスク3-2] 職業システム

## 概要
- エピック: #3
- タスク: #3-2
- 関連PR/要件: @docs/prd/requirements.md セクション2.2.2

## 設計方針

### 基本方針
- 4つの職業（風忍、鉄忍、影忍、薬忍）を実装
- 各職業は基本ステータスとクラススキルを持つ
- Strategy パターンでクラススキルを実装

### 職業特性
1. **風忍（かぜにん）** - 機動力特化
2. **鉄忍（てつにん）** - 防御特化
3. **影忍（かげにん）** - ステルス特化
4. **薬忍（くすりにん）** - 支援特化

## インターフェース定義

### 職業システム
```typescript
type JobType = 'wind' | 'iron' | 'shadow' | 'medicine';

interface JobClass {
  type: JobType;
  name: string;
  description: string;
  
  // 基本ステータス補正
  getBaseStats(): Partial<CharacterStats>;
  
  // クラススキル
  applyClassSkill(character: Character): void;
}

interface ClassSkill {
  name: string;
  description: string;
  apply(character: Character): void;
}
```

### 各職業の特性
```typescript
// 風忍: 移動速度+10%
// 鉄忍: 防御力+20%
// 影忍: 視界範囲+3
// 薬忍: 兵糧丸使用時に軍団全員に効果
```

### 主要コンポーネント
- **JobClass**: 職業の基底クラス
- **WindNinja, IronNinja, ShadowNinja, MedicineNinja**: 各職業の実装
- **ClassSkillRegistry**: クラススキル管理

## テスト方針
- 各職業の基本ステータス補正テスト
- クラススキルの効果検証
- 職業変更時の処理テスト

## 未解決事項
- [ ] 薬忍の軍団全体効果の実装詳細
- [ ] 将来的な職業追加への対応
- [ ] クラスチェンジシステムの可能性