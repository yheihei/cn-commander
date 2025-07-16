# UI カメラと座標系の問題について

## 問題の概要

軍団UIパネルが画面左上（0,0）に表示されてしまい、意図した右側の位置に表示されない問題が発生した。

### 根本原因
- Phaser3でカメラのズーム（2.25倍）を適用した際、UIパネルの座標がワールド座標として解釈された
- UIパネルがメインカメラの影響を受けて、ズームと共に移動・拡大されてしまった

## 実施した対処法

### 1. scrollFactorの設定
```typescript
// UIComponentにfixedToCameraオプションを追加
if (config.fixedToCamera) {
  this.setScrollFactor(0);
}
```
- 効果: スクロールの影響は受けなくなったが、ズームの影響は残った

### 2. UIカメラの作成
```typescript
// 専用のUIカメラを作成（ズームなし）
const uiCamera = this.cameras.add(0, 0, 1280, 720, false, 'uiCamera');
uiCamera.setScroll(0, 0);
uiCamera.setZoom(1);
```

### 3. カメラの使い分け
- メインカメラ: ゲームオブジェクト（マップ、軍団など）を表示
- UIカメラ: UI要素のみを表示

```typescript
// UIカメラがゲームオブジェクトを無視
this.uiCamera.ignore(mapLayer);
this.uiCamera.ignore(army);

// メインカメラがUI要素を無視
mainCamera.ignore(uiPanel);
```

## 遭遇した問題点

### 1. getCameraByNameメソッドが存在しない
```typescript
// エラー: getCameraByNameは存在しない
const uiCamera = this.scene.cameras.getCameraByName('uiCamera');

// 対処: cameras配列をループして検索
let uiCamera = null;
for (const camera of this.scene.cameras.cameras) {
  if (camera.name === 'uiCamera') {
    uiCamera = camera;
    break;
  }
}
```

### 2. 初期化順序の問題
- UIManagerの初期化時点でUIカメラがまだ作成されていない
- 解決: カメラ設定をUIManager初期化より前に移動

### 3. 密結合の問題
- 各システム（CombatEffectManager等）にUIカメラを渡す必要が生じた
- これにより、システム間の依存関係が複雑化

```typescript
// 密結合の例
this.combatSystem.setUICamera(this.uiCamera);
this.effectManager.setUICamera(camera);
```

## より良い解決策の提案

### 1. レイヤーベースのアプローチ
- UI専用のレイヤーグループを作成
- depthだけで管理し、カメラを分けない

### 2. シーン分離アプローチ
- UIシーンとゲームシーンを分離
- Phaser3のマルチシーン機能を活用

```typescript
// UIシーン
class UIScene extends Phaser.Scene {
  constructor() {
    super({ key: 'UIScene', active: true });
  }
}

// ゲームシーン
class GameScene extends Phaser.Scene {
  constructor() {
    super({ key: 'GameScene' });
  }
}
```

### 3. ビューポート座標の使用
- UI要素の配置にビューポート座標を使用
- カメラの影響を受けない座標系で管理

## 教訓

1. **早期の設計決定が重要**: UI表示方法は初期段階で決定すべき
2. **Phaser3の仕組みを理解**: カメラシステムの挙動を正しく理解してから実装
3. **疎結合を維持**: 各システムが独立して動作できる設計を心がける
4. **公式ドキュメントの確認**: 存在しないメソッドを使用する前に確認

## 参考になるPhaser3の機能

- `setScrollFactor(0)`: スクロールを無効化
- `camera.ignore(gameObject)`: 特定のオブジェクトをカメラから除外
- マルチカメラシステム: 複数のカメラで異なる表示を実現
- シーンの並列実行: UIとゲームロジックの分離