# [task-3-4] 軍団編成UI

## 概要
- エピック: #3
- タスク: #3-4
- 関連PR/要件: @docs/prd/requirements.md セクション2.1.5

## 設計方針

### 全体アプローチ
- 右側パネル形式のUIとして実装（ArmyInfoPanelと同じ表示方式）
- タブ式レイアウトで情報を整理（待機兵士/編成/アイテムの3タブ）
- 既存のUIパターン（Phaser.GameObjects.Container継承）に従った実装
- クリック操作を中心としたシンプルなインタラクション
- カメラのズームを考慮したレスポンシブ対応

### 技術選定理由
- Phaser3のContainerシステム：既存UIとの統一性を保持
- タブ式UI：限られた画面スペースで効率的な情報表示
- 固定位置UI方式：画面に固定され、カメラの影響を受けない
- ArmyInfoPanelと同じ位置計算：一貫性のあるUI配置

## インターフェース定義

### ArmyFormationUITabbedクラス
```typescript
class ArmyFormationUITabbed extends Phaser.GameObjects.Container {
  constructor(config: ArmyFormationUIConfig);
  
  // 表示/非表示
  show(): void;
  hide(): void;
  getWidth(): number;
  
  // 待機兵士の更新
  updateWaitingSoldiers(soldiers: Character[]): void;
  
  // 位置更新はUIManagerで管理
}

interface ArmyFormationUIConfig {
  scene: Phaser.Scene;
  x: number;
  y: number;
  width: number;
  height: number;
  base: Base;
  onArmyFormed?: (data: ArmyFormationData) => void;
  onCancelled?: () => void;
}
```

### ArmyFormationData型
```typescript
interface ArmyFormationData {
  commander: Character;
  soldiers: Character[];
  items: Map<Character, Item[]>;
  deployPosition: { x: number; y: number };
}
```

### 内部コンポーネント構成
- **待機兵士タブ**: 拠点の待機兵士一覧を表示、クリックで選択
- **編成タブ**: 指揮官スロット（1つ）と一般兵スロット（3つ）を表示
- **アイテムタブ**: 各メンバーのアイテム装備状況を管理（将来実装）

### タブ管理
```typescript
type TabType = 'soldiers' | 'formation' | 'items';

// タブの切り替えはクラス内部で管理
// 兵士選択時は自動的に編成タブに遷移
```

### UIManagerとの連携
```typescript
// UIManagerへの追加メソッド
interface UIManager {
  showArmyFormationUI(base: Base): void;
  hideArmyFormationUI(): void;
  isArmyFormationUIVisible(): boolean;
}
```

## データ構造の概要

### 拠点の待機兵士管理
- BaseManagerが各拠点の待機兵士リストを管理
- 軍団編成時に待機兵士から除外し、解散時に追加
- 駐留軍団とは別管理（駐留は軍団単位、待機は個人単位）

### 編成中の一時データ
- ArmyFormationUIが編成中のデータを保持
- 確定前はゲームステートに反映しない
- キャンセル時は全データを破棄

## 実装の詳細

### レイアウト仕様
- 画面右側に固定配置（ArmyInfoPanelと同じ）
- パネル幅：ビューポート幅の半分 - 20px
- パネル高さ：ビューポート高さ - 36px
- タブの高さ：30px
- 赤枠でデバッグ用の視覚的確認（本番では削除予定）

### カメラズーム対応
- UIManagerで`zoom = 2.25`を考慮したサイズ計算
- 実際のビューポートサイズ = 画面サイズ / ズーム値
- カメラ移動時も`update()`で位置を更新

## 未解決事項
- [ ] アイテム装備UIの詳細設計（task-9-4との連携）
- [ ] 出撃位置選択UIの詳細（デフォルト位置の自動設定のみ実装）
- [ ] 最大同時軍団数（6軍団）に達した場合のUI表示
- [ ] タブ内のスクロール機能（待機兵士が多い場合）