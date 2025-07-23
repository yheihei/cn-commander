# [タスク3-4-1] 兵士選択UI

## 概要
- エピック: #3
- タスク: #3-4-1
- 関連PR/要件: 軍団編成システムの第1段階として待機兵士選択UIを実装

## 設計方針

### 目的
拠点に待機している兵士から軍団を編成するための選択UIを提供する。左クリックで選択、右クリックで選択解除の直感的な操作を実現。

### 技術選定
- 既存のArmyFormationUIを拡張して実装
- 全画面モーダルUIとして実装（既存の位置設定を維持）
- Phaser3のContainerとインタラクティブ要素を活用

### 既存システムとの整合性
- UIManagerの全画面モーダルパターンに従う
- BaseManagerの待機兵士管理機能と連携
- 既存のFormationData型を活用

## インターフェース定義

### FormationData（ArmyFormationUI.ts）
```typescript
export interface FormationData {
  commander: Character | null;
  soldiers: Character[];
}
```

### 主要メソッド
- `setWaitingSoldiers(soldiers: Character[]): void` - 待機兵士リストを設定
- `onSoldierClick(soldier: Character): void` - 兵士選択処理
- `onSoldierRightClick(soldier: Character): void` - 兵士選択解除処理
- `updateButtonState(): void` - ボタンの有効/無効状態を更新

## UIレイアウト

### テーブル構成
- ヘッダー: 名前、職業、HP、攻撃、防御、速さ、移動、視界、選択
- 各列の幅: 固定幅で定義（合計440px）
- 行の高さ: 24px
- 偶数行に背景色（0x333333）

### 選択状態の表示
- 指揮官: 赤い「指」マーク（#ff0000）
- 一般兵: 青い「兵」マーク（#0088ff）
- 選択時の背景色変更

### ボタン状態
- 「アイテム選択」ボタン: 兵士未選択時は無効化
- 「キャンセル」ボタン: 常に有効

## データフロー

1. UIManager.showArmyFormationUI()
   - BaseManagerから待機兵士を取得
   - ArmyFormationUIに渡す

2. ArmyFormationUI.setWaitingSoldiers()
   - 兵士テーブルを動的に生成
   - 各行にクリックイベントを設定

3. 兵士選択/解除
   - 最初の選択 → 指揮官
   - 2人目以降 → 一般兵（最大3名）
   - 右クリックで個別解除（指揮官解除は全解除）

4. アイテム選択ボタン押下
   - FormationDataを生成
   - コールバックを実行（次のフェーズへ）

## テスト方針

### 単体テスト
- 兵士選択ロジックのテスト
- 最大選択数の制限確認
- 選択解除ロジックのテスト

### 統合テスト
- UIManager経由での表示確認
- BaseManagerとの連携確認
- イベントハンドリングの動作確認

## 未解決事項
- [ ] スクロール機能（兵士が多い場合）
- [ ] 兵士のソート機能
- [ ] 兵士の詳細情報表示（ツールチップ等）