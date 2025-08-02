# アーキテクチャパターン

## マネージャーパターン
各システムごとにマネージャークラスを配置し、責務を明確に分離:
- **エンティティ**: データと基本的な振る舞い（Army, Character, Base等）
- **マネージャー**: エンティティの管理と調整（ArmyManager, BaseManager等）
- **ファクトリー**: エンティティの生成を抽象化（ArmyFactory, CharacterFactory等）

### 初期化の流れ
1. GameSceneで各マネージャーを初期化
2. マネージャー間の相互参照を設定
3. エンティティはファクトリー経由で生成

## UIアーキテクチャ

### オブジェクト指向UI（OOUI）
- オブジェクトを選択 → 可能な操作を表示
- 一貫した操作フロー
- オブジェクトタイプごとに最適化

### UI配置パターン
**固定位置UI**:
- カメラのworldViewを基準に配置
- カメラスクロールに追従
- 例: ArmyInfoPanel, ActionMenu

**ワールド座標UI**:
- ゲーム世界に配置
- カメラの影響を受ける
- 例: WaypointMarker

### 重要: UIのビューポート設定
```typescript
// 1. ズーム値を考慮
const zoom = this.scene.cameras.main.zoom || 2.25;
const viewWidth = 1280 / zoom;
const viewHeight = 720 / zoom;

// 2. worldViewで配置
const cam = this.scene.cameras.main;
const viewLeft = cam.worldView.x;
const viewTop = cam.worldView.y;

// 3. update()で位置更新
```

## テストアーキテクチャ

### モックベースアプローチ
- Phaser HEADLESSモードは不安定なため使用しない
- ビジネスロジックに焦点
- 描画処理はモック化

### テスト構成
- エピック単位で統合テスト
- `test/integration/epic-XX-name/`に配置
- 実使用シナリオを必ず含める

## データフロー
1. **入力処理**: InputHandlerが入力を受け取る
2. **UI表示**: UIManagerが適切なメニューを表示
3. **コマンド生成**: ユーザー選択からコマンド生成
4. **処理実行**: 各マネージャーが処理を実行
5. **表示更新**: Phaser3のGameObjectsを更新

## エピックベース開発
- 14エピックに機能を分割
- タスクは`task-X-Y`形式で管理
- 設計書は`docs/design/epic-XX-name/`に配置
- 優先度: 基盤 → マップ → キャラクター → 移動 → 戦闘の順