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
   - 背景色: 0x333333（透明度0.9）、サイズ: 120x64
   - 画面内に収まるよう自動位置調整

2. **移動モード選択メニュー** (MovementModeMenu)
   - 「移動」選択後に表示
   - 「通常移動」「戦闘移動」の2ボタン構成
   - 背景色: 0x333333（透明度0.9）、サイズ: 140x118
   - ボタンホバー効果実装

3. **経路選択メッセージ** (PathSelectionMessage)
   - モード選択後に表示
   - 「移動経路を4地点まで選択してください」
   - カメラの表示範囲下部に配置（bottom - 50px）
   - 3秒後にクリックで非表示可能

4. **経路点マーカー** (WaypointMarker)
   - 地点選択時に表示される×マーク（赤色、lineWidth: 3）
   - 番号付き（1〜4）、白文字で黒背景
   - サイズ: 20x20の×マーク

### 操作フロー
1. 指揮官クリック → 行動選択メニュー表示
2. 「移動」選択 → 移動モード選択メニュー表示
3. モード選択 → 経路選択メッセージ表示
4. 2秒待機 → 経路選択モード開始
5. マップクリック → 経路点設定（最大4地点）
6. 4つ目の経路点設定後2秒経過 → ×マーク消去、移動開始

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
  updatePathSelectionMessage(text: string): void;
  isActionMenuVisible(): boolean;
  isMovementModeMenuVisible(): boolean;
  isAnyMenuVisible(): boolean;
  getCurrentSelectedArmy(): Army | null;
  destroy(): void;
}
```

### UIコンポーネントの特徴
- **メニュー位置**: 指揮官の右側+50pxに表示
- **Depth管理**: UIレイヤー最前面（depth: 999-1000）
- **画面外クリック処理**: nextFrameでイベントリスナー追加（即座閉じ防止）
- **メモリ管理**: destroy時にイベントリスナーを確実に削除

### MovementInputHandler
- UIManagerと連携して移動指示の全体フローを制御
- 2秒の遅延処理を含む経路選択開始
- 経路点の視覚的フィードバック（マーカーと線）
- 4つ目の経路点選択後、2秒で自動的に移動開始

## テスト方針
- 各UIコンポーネントの表示/非表示
- クリックイベントのハンドリング
- メニュー間の連携動作（複数メニューが同時表示されない）
- タイミング処理（2秒遅延、3秒後のメッセージクリック可能）
- メモリリークの防止（イベントリスナーの適切な削除）

## 未解決事項
- [ ] 移動中のUIフィードバック（進行状況表示など）
- [ ] 移動キャンセル機能の実装
- [ ] エラー時のUI表示（移動不可地点の選択など）