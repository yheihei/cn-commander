# [タスク12-4-3] 待機コマンド実装

## 概要
- エピック: #12
- タスク: #12-4-3
- 関連PR/要件: @docs/prd/requirements.md セクション2.1.3

## 設計方針

### 基本方針
- 既存のActionMenuシステムを拡張し、待機オプションを追加
- MovementMode.STANDBYは既に定義済みのため、それを活用
- 視界ボーナス（+1マス）は既存のVisionSystemで対応済み

### 実装アプローチ
1. ActionMenuに「待機」ボタンを追加
2. 待機ボタンクリック時に軍団の移動モードをSTANDBYに設定
3. 待機中の軍団は攻撃可能状態を維持

## インターフェース定義

### ActionMenuの拡張
```typescript
interface ActionMenuConfig {
  // 既存のプロパティ
  onMove?: () => void;
  onCancel?: () => void;
  // 新規追加
  onStandby?: () => void;
}
```

### 軍団の待機状態管理
```typescript
// Army クラスのメソッド
class Army {
  // 待機モードの設定
  setStandbyMode(): void {
    this.setMovementMode(MovementMode.STANDBY);
    this.stopMovement();
  }
  
  // 待機モードの解除
  cancelStandbyMode(): void {
    this.setMovementMode(MovementMode.NORMAL);
  }
}
```

## UI配置
- ActionMenuに「移動」ボタンの下に「待機」ボタンを配置
- ボタンサイズ・スタイルは「移動」ボタンと統一

## テスト方針

### 統合テストの観点
1. 待機ボタンが正しく表示されるか
2. 待機ボタンクリックで軍団がSTANDBYモードになるか
3. 待機中の軍団の視界が+1マスされているか
4. 待機中の軍団が攻撃可能か
5. 再度ActionMenuを開いて別の行動を選択できるか

## 実装状況
- [x] ActionMenuに待機ボタンを追加
- [x] UIManagerのshowActionMenuメソッドを拡張
- [x] MovementInputHandlerに待機モード設定機能を追加  
- [x] 待機モード時の視界ボーナス（既存実装を活用）
- [x] 統合テストの作成と実行

## 未解決事項
- [ ] 待機中の軍団の視覚的表示（アイコンやエフェクト）
- [ ] 待機解除のタイミング（移動指示を受けた時点で自動解除？）