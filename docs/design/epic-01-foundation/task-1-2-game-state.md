# task-1-2 ゲーム状態管理システム設計書

## 概要
- **エピック**: #1 基盤システム
- **タスク**: #1-2
- **関連PRD**:
  - セクション2.1.1 リアルタイム戦闘
  - セクション5 UI/UX詳細設計
  - セクション6.2.2 収入システム

## 設計方針

### アーキテクチャパターン
**依存性注入(DI)ベースのGameTimeManager + Set型によるモーダルUI追跡**

### 時間管理方式
**デルタタイムベース採用（フレームベースではない）**

理由:
- フレームレート非依存の正確な時間計算
- Phaser3の標準的な実装方法
- 既存システムとの親和性が高い

### 設計判断

#### 1. Singleton vs Dependency Injection
**採用: Dependency Injection**

理由:
- テストが容易（モック注入可能）
- 疎結合で保守性が高い
- 将来的な拡張性（複数シーン対応など）

#### 2. 配列 vs Set (モーダルUI追跡)
**採用: Set**

理由:
- 重複を自動排除
- O(1)の追加・削除性能
- デバッグが容易

## 主要コンポーネント

### 1. GameTimeManager

**責務:**
- ゲーム時間のポーズ/再開管理
- スケールされたデルタ時間の提供

**公開API:**
```typescript
class GameTimeManager {
  update(rawDelta: number): number  // ポーズ時は0、通常時はrawDeltaを返す
  pause(): void                      // ゲーム時間を停止
  resume(): void                     // ゲーム時間を再開
  getIsPaused(): boolean            // ポーズ状態を取得
}
```

### 2. UIManager拡張

**追加責務:**
- モーダルUIの開閉を追跡
- GameTimeManagerのポーズ/再開を制御

**内部API:**
```typescript
class UIManager {
  private modalUISet: Set<string>
  private addModalUI(uiName: string): void    // モーダルUI開いた時
  private removeModalUI(uiName: string): void // モーダルUI閉じた時
}
```

### 3. 時間依存システムの修正

**対象システム:**
- MovementProcessor
- CombatTimerManager
- ProductionManager
- 医療システム（治療進行管理）
- CombatEffectManager
- EconomyManager（task-8-2実装時）

**変更内容:**
- コンストラクタでGameTimeManagerを受け取る
- update()メソッドでGameTimeManager.update()から取得したdeltaを使用

## データフロー

```
1. Phaser Game Loop
   ↓ rawDelta
2. GameScene.update(time, delta)
   ↓ rawDelta
3. GameTimeManager.update(rawDelta)
   ↓ gameDelta (ポーズ時は0)
4. 各時間依存システム.update(gameDelta)

並行して:
- UIManager.showXxxUI()
  → addModalUI('XxxUI')
  → GameTimeManager.pause()

- UIManager.hideXxxUI()
  → removeModalUI('XxxUI')
  → GameTimeManager.resume() (全モーダルが閉じた場合)
```

## ポーズ対象システム

### 停止するシステム
1. 軍団の移動処理 (`MovementProcessor`)
2. 軍団の攻撃処理 (`CombatTimerManager`)
3. アイテム生産の進行 (`ProductionManager`)
4. 医療施設での治療進行
5. 収入の蓄積 (`EconomyManager`)
6. 戦闘エフェクトのアニメーション (`CombatEffectManager`)
7. 敵AIの行動判断・実行

### 継続するシステム
- カメラ操作（プレイヤーの視点移動）
- UIアニメーション（応答性維持）
- 視界計算（軽量なため影響軽微）

## モーダルUIの定義

### モーダルUI（ポーズトリガー）
- ActionMenu
- MovementModeMenu
- ArmyInfoPanel
- BaseInfoPanel
- ArmyFormationUI
- ItemInventoryUI
- 生産管理UI
- 医療施設UI

### 非モーダルUI（ポーズしない）
- SystemInfoBar（資金UI - 常時表示）
- WaypointMarker（ワールドオーバーレイ）

## 影響範囲

### 新規作成ファイル
- `src/state/GameTimeManager.ts`
- `test/unit/state/GameTimeManager.test.ts`
- `test/integration/epic-01-foundation/GameState.integration.test.ts`

### 修正ファイル
- `src/scenes/GameScene.ts` - GameTimeManager生成・注入
- `src/ui/UIManager.ts` - モーダルUI追跡機能追加
- `src/movement/MovementProcessor.ts` - コンストラクタ修正
- `src/combat/CombatTimerManager.ts` - コンストラクタ修正
- `src/production/ProductionManager.ts` - コンストラクタ修正
- 医療システム関連ファイル - コンストラクタ修正
- `src/combat/CombatEffectManager.ts` - コンストラクタ修正（存在する場合）

### 修正テスト
- MovementProcessor関連テスト
- CombatTimerManager関連テスト
- ProductionManager関連テスト
- GameScene統合テスト

### PRD更新箇所
- セクション2.1.1 リアルタイム戦闘 - ポーズ詳細追記
- 新セクション2.1.X ゲーム時間とポーズシステム - 追加
- セクション5 UI/UX詳細設計 - モーダルUI挙動追記
- セクション6.2.2 収入システム - 実装方法更新

## テスト方針

### 単体テスト
**GameTimeManager.test.ts:**
- pause()でisPausedがtrueになる
- resume()でisPausedがfalseになる
- ポーズ時にupdate()が0を返す
- 非ポーズ時にupdate()が入力deltaを返す

### 統合テスト
**GameState.integration.test.ts:**
- モーダルUI表示でゲームがポーズされる
- モーダルUI非表示でゲームが再開される
- 複数モーダルUI表示時も正しくポーズ継続
- 全モーダルUI非表示で初めて再開される
- 各システムがポーズ中に処理を停止する

### 既存テスト修正方針
- GameTimeManagerモックを作成
- 各システムのコンストラクタにモックを注入
- ポーズ状態での動作を検証するテストケース追加

## タスク分解

### task-1-2-1: GameTimeManager実装
GameTimeManagerクラスの実装と単体テスト

### task-1-2-2: 既存システム統合
時間依存システムへのGameTimeManager注入

### task-1-2-3: UIManagerポーズ制御
UIManagerにモーダルUI追跡機能を実装

### task-1-2-4: テスト更新
既存テストの修正と統合テスト追加

### task-1-2-5: PRD更新
ポーズシステムのドキュメント化

## 未解決事項
- [ ] 医療システムの実装場所の特定（MedicalFacilityクラスの存在確認）
- [ ] CombatEffectManagerの実装確認
- [ ] ポーズ中のビジュアルフィードバック（「PAUSED」表示など）の必要性
- [ ] 手動ポーズ機能（ESCキーなど）の必要性
