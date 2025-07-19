# [タスク5-5] 攻撃目標指定システム

## 概要
- エピック: #5 戦闘システム
- タスク: #5-5
- 関連PR/要件: PRD 2.1.11 攻撃目標指定システム

## 設計方針
攻撃目標指定システムは、プレイヤーが軍団ごとに特定の敵軍団を攻撃目標として指定できる機能を提供する。既存のUIコンポーネント（ActionMenu、AttackTargetInputHandler）を活用し、戦闘システムと連携して優先攻撃を実現する。

## インターフェース定義

### 攻撃目標管理（Army）
```typescript
interface Army {
  // 攻撃目標の設定
  setAttackTarget(target: Army | null): void;
  
  // 攻撃目標の取得
  getAttackTarget(): Army | null;
  
  // 攻撃目標の有効性確認
  hasAttackTarget(): boolean;
  
  // 攻撃目標のクリア
  clearAttackTarget(): void;
}
```

### UI更新（ArmyInfoPanel）
```typescript
interface ArmyInfoPanel {
  // 攻撃目標情報の表示
  showAttackTargetInfo(target: Army | null): void;
}
```

### 戦闘システム連携（CombatSystem）
```typescript
interface CombatSystem {
  // 攻撃対象の選択ロジック
  selectAttackTarget(attacker: Army): Army | null;
}
```

### ガイドメッセージ（UIManager）
```typescript
interface UIManager {
  // ガイドメッセージの表示
  showGuideMessage(message: string): void;
  
  // ガイドメッセージの非表示
  hideGuideMessage(): void;
}
```

## 実装の流れ

1. **UI表示の改善**
   - ArmyInfoPanelに攻撃目標情報セクションを追加
   - 攻撃目標が設定されている場合、目標軍団名を表示
   - ActionMenuに「攻撃目標解除」オプションを追加（目標設定時のみ）

2. **ガイドメッセージ実装**
   - 画面上部に固定位置でガイドメッセージを表示
   - 攻撃目標指定モード中は「攻撃目標を選択してください」を表示
   - 目標設定完了時は「攻撃目標を指定しました」を一時表示

3. **戦闘システム統合**
   - CombatSystemのtarget選択ロジックを更新
   - 攻撃目標が設定されている場合は、その目標のみを攻撃
   - 目標が射程外の場合は攻撃を行わない

4. **目標解除機能**
   - 目標が設定されている軍団選択時、ActionMenuに解除オプション表示
   - 目標軍団が全滅した場合の自動解除は既存実装を活用

## テスト方針

### 統合テスト
1. 攻撃目標指定フローの動作確認
   - ActionMenu表示 → 攻撃目標指定選択 → 敵軍団クリック → 目標設定
2. 戦闘時の優先攻撃確認
   - 複数の敵がいる状況で、指定目標のみを攻撃することを検証
3. UI表示の確認
   - ArmyInfoPanelに目標情報が表示されることを確認
   - ガイドメッセージが適切に表示/非表示されることを確認
4. 目標解除の動作確認
   - 手動解除と自動解除が正しく機能することを検証

## 未解決事項
- [ ] 複数軍団の攻撃目標を一括管理するUIの必要性
- [ ] 拠点を攻撃目標に指定する機能（将来実装）
- [ ] 攻撃目標への視覚的な線やマーカーの表示方法