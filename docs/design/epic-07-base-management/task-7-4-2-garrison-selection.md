# [タスク7-4-2] 拠点選択モード実装

## 概要
- エピック: #7（拠点管理システム）
- タスク: #7-4-2（拠点選択モード実装）
- 関連PR/要件: 駐留システムの拠点選択機能

## 設計方針
既存の攻撃目標指定システム（task-5-5）のパターンを参考に、専用のInputHandlerを作成して拠点選択モードを実装する。UIの表示位置は既存のshowGuideMessageメソッドを活用し、worldViewベースの正確な配置を行う。

## インターフェース定義

### GarrisonSelectionInputHandler
```typescript
class GarrisonSelectionInputHandler {
  constructor(
    scene: Phaser.Scene,
    baseManager: BaseManager,
    selectableBases: Base[],
    onBaseSelected: (base: Base) => void,
    onCancel: () => void,
    uiManager: UIManager
  );
  
  // 入力ハンドラのセットアップ
  private setupInputHandlers(): void;
  
  // 指定位置の拠点を検索
  private findBaseAtPosition(x: number, y: number): Base | null;
  
  // 拠点のハイライト表示
  private highlightBases(): void;
  
  // ハイライトをクリア
  private clearHighlights(): void;
  
  // クリーンアップ
  private cleanup(): void;
  
  // 破棄
  public destroy(): void;
}
```

### Base クラスの拡張
```typescript
interface Base {
  // ハイライト状態の設定
  setHighlighted(highlighted: boolean, color?: number): void;
  
  // ホバー状態の設定
  setHovered(hovered: boolean): void;
}
```

### MovementInputHandler の拡張
```typescript
interface MovementInputHandler {
  // 駐留選択モードフラグ
  private isGarrisonSelectionMode: boolean;
  
  // 駐留プロセスの開始（修正版）
  private startGarrisonProcess(): void;
}
```

## 実装詳細

### 拠点選択フロー
1. **モード開始**
   - ガイドメッセージ「駐留先の拠点を選択してください」を表示
   - 0.5秒待機（誤クリック防止）
   - GarrisonSelectionInputHandlerを生成

2. **拠点ハイライト**
   - 選択可能な拠点（3マス以内の味方拠点）を黄色でハイライト
   - 選択不可な拠点は通常表示

3. **インタラクション**
   - マウスホバー：より明るい黄色に変化
   - 左クリック：拠点を選択して駐留実行
   - 右クリック：選択をキャンセル

4. **完了処理**
   - 選択またはキャンセル時にハイライトをクリア
   - ガイドメッセージを更新または非表示
   - InputHandlerを破棄

### 視覚的フィードバック
- **通常状態**: ハイライトなし
- **選択可能**: 黄色の枠線（0xFFFF00, alpha: 0.5）
- **ホバー中**: 明るい黄色の枠線（0xFFFF00, alpha: 0.8）
- **枠線の太さ**: 2px
- **枠線のサイズ**: 拠点タイルサイズ + 4px

## テスト方針
- 拠点選択モードへの遷移が正しく行われること
- 3マス以内の味方拠点のみがハイライトされること
- クリックで正しい拠点が選択されること
- 右クリックでキャンセルできること
- 選択後に駐留が実行されること
- UIメッセージが適切に表示・更新されること

## 未解決事項
- [ ] 複数の選択可能拠点がある場合の優先順位表示
- [ ] 拠点の収容可能軍団数の表示（将来実装）
- [ ] アニメーション効果の追加（将来実装）