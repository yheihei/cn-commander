# [task-7-5-4-1] 医療施設UI

## 概要
- エピック: #7（拠点管理システム）
- タスク: #7-5-4-1
- 関連PR/要件: 駐留軍団の治療システムUI実装

## 設計方針

### UIの位置づけ
医療施設UIは拠点施設の一つとして、他の施設UI（兵舎、生産工場）と一貫性のある設計とする。

### UIアーキテクチャ
- **コンパクトメニュー方式**: BarracksSubMenuやBaseActionMenuと同様の固定サイズメニュー
- **全画面モーダルを使用しない**: ProductionFactoryMenuのような全画面モーダルではなく、コンパクトなメニューとして実装
- **画面内の固定位置に配置**: 画面左側の施設メニュー群の位置に表示

### コンポーネント構成
```
MedicalFacilityMenu
├── 治療管理コンポーネント
│   ├── 治療可能軍団リスト
│   └── 治療中軍団表示
├── UIコントロール
│   ├── 治療開始ボタン
│   └── 閉じるボタン
└── 入力ハンドラー
    └── 画面外クリック検知
```

## インターフェース定義

### MedicalFacilityMenuConfig
```typescript
interface MedicalFacilityMenuConfig {
  x: number;                      // メニューのX座標（ワールド座標）
  y: number;                      // メニューのY座標（ワールド座標）
  scene: Phaser.Scene;            // Phaser Scene
  baseId: string;                 // 拠点ID
  baseManager: BaseManager;       // 拠点マネージャー
  armyManager: ArmyManager;       // 軍団マネージャー
  money: number;                  // 現在の所持金
  onStartTreatment?: (armyId: string, cost: number) => boolean;  // 治療開始
  onCancel?: () => void;          // キャンセル
}
```

### メニューレイアウト
- **サイズ**: 幅300px × 高さ400px（固定）
- **背景色**: 0x444444（他のメニューと統一）
- **配置**: 画面左側（BaseActionMenuの隣）

### 表示内容
1. **上部**: タイトル「医療施設」
2. **中央部左**: 治療可能軍団リスト
   - 軍団名
   - 現在HP/最大HP
   - 選択可能
3. **中央部右**: 治療中情報
   - 軍団名
   - 残り時間
   - 治療費用
4. **下部**: 操作ボタン
   - 治療開始ボタン（選択時のみ有効）
   - 閉じるボタン

## 治療システムとの連携

### MedicalManager
治療ロジックを管理する独立したマネージャー：
- 治療の開始・完了・キャンセル
- 治療時間の管理（2分間）
- 治療費用の管理（500両）
- バックグラウンド処理対応

### データフロー
1. UIManagerから位置指定でMedicalFacilityMenuを生成
2. BaseManagerから駐留軍団リストを取得
3. 軍団選択時に治療費用チェック
4. 治療開始でMedicalManagerに処理を委譲
5. 定期的に治療状況を更新表示

## 実装上の注意点

### 既存UIとの整合性
- BarracksSubMenuと同じ画面外クリック処理
- BaseActionMenuと同じupdateFixedPosition実装
- 全画面モーダル背景は使用しない

### 位置管理
```typescript
// UIManagerから渡される位置で配置
constructor(config: MedicalFacilityMenuConfig) {
  super(config.scene, config.x, config.y);
  // モーダル背景は作成しない
}

// カメラ移動時の位置更新
public updateFixedPosition(screenX: number, screenY: number): void {
  const cam = this.scene.cameras.main;
  const worldX = cam.worldView.x + screenX;
  const worldY = cam.worldView.y + screenY;
  this.setPosition(worldX, worldY);
}
```

## テスト方針
- 駐留軍団の表示確認
- 治療費用不足時の処理
- 治療中の軍団が選択できないことの確認
- 画面外クリックでメニューが閉じることの確認

## 未解決事項
- [ ] 治療完了時の通知システム実装
- [ ] 複数軍団の同時治療対応