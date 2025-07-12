# [task-4-5] 移動指示UI

## 概要
- エピック: #4
- タスク: #4-5
- 関連PR/要件: 移動指示システムのUI実装

## 設計方針

### UI階層構造
1. **行動選択メニュー** (ActionMenu)
   - 指揮官選択時に表示
   - 現在は「移動」のみ

2. **移動モード選択メニュー** (MovementModeMenu)
   - 「移動」選択後に表示
   - 「通常移動」「戦闘移動」の選択

3. **経路選択メッセージ** (PathSelectionMessage)
   - モード選択後に表示
   - 「移動経路を4地点まで選択してください」
   - クリックで非表示

4. **経路点マーカー** (WaypointMarker)
   - 地点選択時に表示される×マーク
   - 番号付き（1〜4）

### 操作フロー
1. 指揮官クリック → 行動選択メニュー表示
2. 「移動」選択 → 移動モード選択メニュー表示
3. モード選択 → 経路選択メッセージ表示
4. 1秒待機 → 経路選択モード開始
5. マップクリック → 経路点設定（最大4地点）
6. 経路完了 → 移動開始

## インターフェース定義

### UIManager
```typescript
interface UIManager {
  showActionMenu(army: Army, onMove: () => void, onCancel: () => void): void;
  showMovementModeMenu(army: Army, onNormalMove: () => void, onCombatMove: () => void, onCancel: () => void): void;
  showPathSelectionMessage(onHide?: () => void): void;
  hideActionMenu(): void;
  hideMovementModeMenu(): void;
  hidePathSelectionMessage(): void;
  isAnyMenuVisible(): boolean;
}
```

### MovementInputHandler
- UIManagerと連携して移動指示の全体フローを制御
- 1秒の遅延処理を含む経路選択開始
- 経路点の視覚的フィードバック（マーカーと線）

## テスト方針
- 各UIコンポーネントの表示/非表示
- クリックイベントのハンドリング
- メニュー間の連携動作
- タイミング処理（1秒遅延）

## 未解決事項
- [ ] 移動中のUIフィードバック（進行状況表示など）
- [ ] 移動キャンセル機能の実装