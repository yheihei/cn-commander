# [タスク12-4] 軍団UIシステム

## 概要
- エピック: #12
- タスク: #12-4
- 関連PR/要件: 要求定義書 5.3.1 味方軍団オブジェクト

## 設計方針

### 既存UIシステムとの統合
- UIManagerを拡張し、ArmyInfoPanelを管理
- 既存のActionMenu、MovementModeMenuと同じContainer系統を使用
- 画面右側に固定配置（要求定義書5.2のレイアウトに準拠）

### 情報表示の優先順位
1. 軍団の基本情報（名前、指揮官）
2. メンバーの状態（HP、職業）
3. 装備アイテム
4. 移動状態
5. 現在位置

## インターフェース定義

### ArmyInfoPanel
```typescript
interface ArmyInfoPanelConfig {
  scene: Phaser.Scene;
  x: number;
  y: number;
  width: number;
  height: number;
}

class ArmyInfoPanel extends Phaser.GameObjects.Container {
  constructor(config: ArmyInfoPanelConfig);
  updateArmyInfo(army: Army): void;
  show(): void;
  hide(): void;
}
```

### UIManager拡張
```typescript
class UIManager {
  // 既存のメソッドに追加
  showArmyInfo(army: Army): void;
  hideArmyInfo(): void;
  updateArmyInfo(army: Army): void;
}
```

## 表示情報の詳細

### 軍団情報セクション
- 軍団名
- 指揮官名と職業
- 軍団の総HP（現在/最大）

### メンバー詳細セクション
- 各メンバーの名前と職業
- HPバー（視覚的表現）
- HP数値（現在/最大）

### 装備アイテムセクション
- 各メンバーの装備アイテムリスト
- アイテム名と耐久度（武器の場合）

### 状態表示セクション
- 移動モード（通常移動/戦闘移動/待機）
- 移動状態（移動中/停止中）

### 位置情報セクション
- グリッド座標（X, Y）

## テスト方針

### 単体テスト
- ArmyInfoPanelの表示/非表示
- 情報更新時の表示内容確認

### 統合テスト
- 軍団選択時の情報パネル表示
- 移動状態変更時の自動更新
- 複数軍団切り替え時の情報更新
- メンバー撃破時の表示更新

## 未解決事項
- [ ] 敵軍団選択時の表示内容（発見済みの場合のみ）
- [ ] パネルのアニメーション（スライドイン/アウト）
- [ ] テーマカラーの統一（現状は仮の色設定）