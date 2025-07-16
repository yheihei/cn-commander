# [タスク12-1] UI基盤システム

## 概要
- エピック: #12
- タスク: #12-1
- 関連PR/要件: 共通UIコンポーネントとレイアウトシステム（PRD 5章）

## 設計方針

### UI基盤の確立
本タスクでは、全てのUIコンポーネントが共通して使用する基盤システムを構築する。
- 再利用可能な共通コンポーネント群
- 統一的なスタイルとテーマ管理
- レスポンシブなレイアウトシステム
- 一貫したアニメーション/トランジション

### コンポーネント階層
1. **基礎コンポーネント**: ボタン、パネル、ラベル等の最小単位
2. **複合コンポーネント**: メニュー、リスト、ダイアログ等
3. **レイアウトコンポーネント**: グリッド、フレックスボックス等の配置システム
4. **テーマシステム**: カラー、フォント、間隔等の統一管理

## インターフェース定義

### UIManager
メイン画面レイアウトを管理する中央コンポーネント
```typescript
interface UIManager {
  // 初期化
  initialize(scene: Phaser.Scene): void;
  
  // レイアウト管理
  createLayout(): void;
  updateLayout(): void;
  
  // パネル管理
  showObjectInfo(object: GameObject): void;
  showObjectActions(object: GameObject): void;
  hideAllPanels(): void;
  
  // システム情報更新
  updateSystemInfo(data: SystemInfo): void;
}
```

### レイアウト構成
```typescript
interface MainLayout {
  mainView: {
    x: 0,
    y: 0,
    width: 960,  // 1280 * 0.75
    height: 640  // 720 - システム情報バーの高さ
  };
  
  sidePanel: {
    x: 960,
    y: 0,
    width: 320,  // 1280 * 0.25
    height: 640
  };
  
  systemBar: {
    x: 0,
    y: 640,
    width: 1280,
    height: 80
  };
}
```

### パネル切り替えロジック
```typescript
interface PanelController {
  // オブジェクトタイプに応じたパネル表示
  onObjectSelected(object: GameObject): void;
  onObjectDeselected(): void;
  
  // パネルタイプ
  getPanelType(object: GameObject): PanelType;
}

enum PanelType {
  ARMY_INFO,      // 軍団情報
  BASE_INFO,      // 拠点情報
  TERRAIN_INFO,   // 地形情報
  NONE           // 未選択時
}
```

## テスト方針

### 統合テスト観点
1. **レイアウト初期化**
   - 各パネルが正しい位置とサイズで生成されるか
   - レスポンシブ対応が機能するか

2. **オブジェクト選択時の動作**
   - 軍団選択時に適切な情報パネルが表示されるか
   - 拠点選択時に施設メニューが表示されるか
   - 選択解除時にパネルが非表示になるか

3. **パネル切り替え**
   - 異なるオブジェクトタイプ間での切り替えがスムーズか
   - 前の選択状態が適切にクリアされるか

4. **システム情報更新**
   - 資金、収入、時間が正しく表示・更新されるか

## 未解決事項
- [ ] レスポンシブデザインの詳細仕様
- [ ] アニメーション効果の必要性
- [ ] パネルのドラッグ&ドロップによる配置変更機能