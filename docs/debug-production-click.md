# 生産工場UIのクリック問題デバッグログ

## 問題
- 生産工場メニューでアイテムをクリックしても反応しない
- デバッグログに「Item clicked」が表示されない

## 試した対策

### 1. Alpha値の調整
- 初期alpha値を0から0.01、0.2、1.0に変更
- 理由：alpha=0の要素はインタラクティブにならない可能性

### 2. インタラクティブ設定の順番
- itemBg.setInteractive()をコンテナ追加前後で試行
- イベントリスナーの設定タイミングを調整

### 3. 階層構造の確認
```
ProductionFactoryMenu (Container) depth=1000
├─ modalBackground (Rectangle) - インタラクティブ
├─ background (Rectangle) - インタラクティブ
├─ itemListContainer (Container)
│  ├─ headerText (Text)
│  ├─ itemBg[0] (Rectangle) - インタラクティブ ← ここがクリックできない
│  ├─ itemText[0] (Text)
│  ├─ itemBg[1] (Rectangle) - インタラクティブ
│  └─ ...
└─ ...
```

### 4. 視覚的デバッグ
- itemBgの色を変更（0x666666）
- 枠線を追加（黄色）
- 完全不透明に設定

### 5. イベント伝播の確認
- グローバルポインターイベントを監視
- コンテナのsetInteractiveをコメントアウト（子要素への伝播を確保）

## 現在の状況
- itemBgは視覚的に表示されている（グレーの背景、黄色い枠）
- マウスカーソルは手のマークに変化しない
- クリックしてもイベントが発火しない

## 次の対策候補

### 対策A: 直接シーンに追加
```javascript
// コンテナに追加せず、直接シーンに追加
const itemBg = this.scene.add.rectangle(...);
itemBg.setInteractive();
// 位置を手動で調整
```

### 対策B: Spriteを使用
```javascript
// Rectangleの代わりにSpriteを使用
const itemBg = this.scene.add.sprite(...);
itemBg.setInteractive();
```

### 対策C: イベント委譲パターン
```javascript
// itemListContainer全体にクリックイベントを設定
this.itemListContainer.on('pointerdown', (pointer) => {
  // pointer座標からどのアイテムか計算
  const itemIndex = Math.floor((pointer.y - startY) / rowHeight);
  this.selectItem(itemIndex);
});
```