# [タスク12-2] OOUIコアシステム

## 概要
- エピック: #12
- タスク: #12-2
- 関連PR/要件: オブジェクト選択→操作フロー、コンテキストメニュー（PRD 5.1, 5.4）

## 設計方針

### OOUI原則の実装
本タスクでは、オブジェクト指向UIの核となる「選択→操作」フローを実装する。
- オブジェクト選択システム
- コンテキストメニューシステム
- 操作実行フレームワーク
- オブジェクトタイプ別の振る舞い定義

### 選択→操作フロー
1. **オブジェクト選択**: マップ上のオブジェクトをクリックして選択
2. **コンテキスト判定**: 選択オブジェクトの種類と状態を判定
3. **操作メニュー表示**: 利用可能な操作をコンテキストメニューで提示
4. **操作実行**: 選択した操作を実行し、結果を反映

## インターフェース定義

### ObjectSelectionSystem
オブジェクト選択を管理するシステム
```typescript
interface ObjectSelectionSystem {
  // 選択管理
  select(object: GameObject): void;
  deselect(): void;
  getSelected(): GameObject | null;
  
  // 選択可能判定
  isSelectable(object: GameObject): boolean;
  
  // イベント
  onSelectionChanged(callback: (object: GameObject | null) => void): void;
}
```

### ContextMenuSystem
コンテキストメニューを管理するシステム
```typescript
interface ContextMenuSystem {
  // メニュー表示
  show(object: GameObject, position: Point): void;
  hide(): void;
  
  // メニュー項目生成
  getAvailableActions(object: GameObject): Action[];
  
  // アクション実行
  executeAction(action: Action, object: GameObject): void;
}
```

### パネルコンテンツ定義
```typescript
interface PanelContent {
  title: string;
  sections: ContentSection[];
}

interface ContentSection {
  header: string;
  items: ContentItem[];
}

interface ContentItem {
  label: string;
  value: string | number;
  type: 'text' | 'bar' | 'list';
}
```

### オブジェクトタイプ別コンテンツ
```typescript
// 軍団情報
interface ArmyInfoContent extends PanelContent {
  commander: CharacterInfo;
  members: CharacterInfo[];
  totalHP: { current: number; max: number };
  equipment: ItemInfo[];
  status: ArmyStatus;
}

// 拠点情報
interface BaseInfoContent extends PanelContent {
  name: string;
  owner: string;
  hp: { current: number; max: number };
  income: number;
  facilities: FacilityInfo[];
}

// 地形情報
interface TerrainInfoContent extends PanelContent {
  type: TerrainType;
  movementCost: number;
  defensBonus: number;
  attackBonus: number;
  visionModifier: number;
}
```

### 情報更新システム
```typescript
interface InfoUpdateSystem {
  // リアルタイム更新
  startTracking(object: GameObject): void;
  stopTracking(): void;
  
  // 更新頻度設定
  setUpdateInterval(ms: number): void;
  
  // 変更検知
  hasChanged(object: GameObject): boolean;
}
```

## コンポーネント構成

### パネルレイアウト
```typescript
interface PanelLayout {
  // ヘッダー部
  header: {
    height: 60,
    showTitle: true,
    showIcon: true
  };
  
  // コンテンツ部
  content: {
    padding: 10,
    lineHeight: 24,
    fontSize: 14
  };
  
  // アクション部（操作ボタン表示エリア）
  actions: {
    height: 100,
    buttonSize: { width: 140, height: 36 }
  };
}
```

### 表示フォーマット
```typescript
interface DisplayFormatter {
  // HP表示（現在値/最大値 + バー）
  formatHP(current: number, max: number): string;
  
  // パーセンテージ表示
  formatPercentage(value: number): string;
  
  // リスト表示
  formatList(items: string[]): string;
  
  // 時間表示
  formatTime(seconds: number): string;
}
```

## テスト方針

### 統合テスト観点
1. **オブジェクトタイプ切り替え**
   - 軍団→拠点→地形の切り替えが正しく動作するか
   - 前の選択情報が残らないか

2. **情報更新**
   - HPの変化がリアルタイムに反映されるか
   - 軍団の移動状態が正しく表示されるか

3. **表示フォーマット**
   - 各種数値が適切にフォーマットされるか
   - 長いテキストが適切に省略されるか

4. **パフォーマンス**
   - 頻繁な更新でもパフォーマンスが低下しないか

## 未解決事項
- [ ] スクロール可能なコンテンツの実装方法
- [ ] アニメーション効果の必要性
- [ ] 情報の展開/折りたたみ機能の実装