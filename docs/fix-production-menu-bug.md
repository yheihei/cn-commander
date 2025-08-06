# 生産工場メニューバグ修正

## 問題の概要
生産工場メニューをキャンセルで閉じた後、マップをクリックすると拠点や指揮官のメニューが開かなくなるバグ。

## 再現手順

### バグ1（修正済み）
1. 拠点をクリックして拠点情報パネルを表示
2. BaseActionMenuから「生産工場」を選択
3. 生産工場メニューの「キャンセル」をクリック（BaseActionMenuに戻る）
4. マップの空白地を**左クリック**してメニューを閉じる
5. **バグ**: この後、拠点や指揮官をクリックしてもメニューが開かない

### バグ2（修正済み）
1. 拠点をクリックして拠点情報パネルを表示
2. BaseActionMenuから「生産工場」を選択
3. 生産工場メニューの「キャンセル」をクリック（BaseActionMenuに戻る）
4. マップの空白地を**右クリック**してメニューを閉じる
5. **バグ**: この後、拠点や指揮官をクリックしてもメニューが開かない

## 原因

### 原因1: UIManager.isAnyMenuVisible()の不完全なチェック
`UIManager.isAnyMenuVisible()`メソッドが`BaseActionMenu`や他のサブメニューの表示状態をチェックしていなかった。

そのため：
- BaseActionMenuが表示されている状態でマップをクリック
- `isAnyMenuVisible()`がfalseを返す（BaseActionMenuをチェックしていないため）
- クリック処理が続行され、意図しない状態になる

### 原因2: ProductionFactoryMenuのイベントリスナー削除の問題
`ProductionFactoryMenu.destroy()`メソッドで`this.scene.input.off('pointerdown')`を呼ぶと、**全ての**pointerdownイベントリスナーが削除されてしまう。

これにより：
- MovementInputHandlerのリスナーも削除される
- その後のクリックイベントが処理されなくなる
- 拠点や指揮官をクリックしても反応しない

## 修正内容

### 1. UIManagerクラスの修正

#### `isAnyMenuVisible()`メソッドの修正
すべてのUIコンポーネントの表示状態をチェックするように変更：
```typescript
public isAnyMenuVisible(): boolean {
  return (
    this.isActionMenuVisible() ||
    this.isMovementModeMenuVisible() ||
    this.isBaseActionMenuVisible() ||
    this.isBarracksSubMenuVisible() ||
    this.isProductionFactoryMenuVisible() ||
    this.isArmyFormationUIVisible() ||
    this.isItemSelectionUIVisible() ||
    this.isDeploymentPositionUIVisible()
  );
}
```

#### 新しいメソッドの追加
各UIコンポーネントの表示状態を確認するメソッドを追加：
- `isBaseActionMenuVisible()`
- `isBarracksSubMenuVisible()`
- `isProductionFactoryMenuVisible()`
- `isItemSelectionUIVisible()`
- `isDeploymentPositionUIVisible()`

### 2. ProductionFactoryMenuクラスの修正

#### 右クリックハンドラーの保持
```typescript
private rightClickHandler?: (pointer: Phaser.Input.Pointer) => void;
```

#### setupInputHandlers()の修正
ハンドラーを変数に保存してから登録：
```typescript
// 右クリックでキャンセル - ハンドラーを保存
this.rightClickHandler = (pointer: Phaser.Input.Pointer) => {
  if (pointer.rightButtonDown() && this.visible) {
    this.onCancel();
  }
};
this.scene.input.on('pointerdown', this.rightClickHandler);
```

#### destroy()の修正
特定のハンドラーのみを削除：
```typescript
public destroy(): void {
  // 入力イベントのクリーンアップ - 特定のハンドラーのみ削除
  if (this.rightClickHandler) {
    this.scene.input.off('pointerdown', this.rightClickHandler);
    this.rightClickHandler = undefined;
  }
  // ...
}
```

## 動作確認手順
1. `npm run dev`で開発サーバーを起動
2. 拠点をクリック → BaseActionMenuから「生産工場」を選択
3. 生産工場メニューで「キャンセル」をクリック
4. マップの空白地を**左クリック**または**右クリック**してメニューを閉じる
5. **確認**: 拠点や指揮官をクリックして、正常にメニューが開くことを確認

## 影響範囲
- すべてのUIメニューの表示/非表示処理が正しく連携するようになった
- イベントリスナーが適切に管理され、他のシステムへの干渉を防止
- 他のサブメニュー（兵舎、医療施設、倉庫など）でも同様の問題が防げる