# スプライトシートの作成方法

## 個別画像をスプライトシートに統合する方法

### 方法1: ImageMagickを使用
```bash
# インストール
brew install imagemagick

# 横一列のスプライトシートを作成
montage explode-*.png -tile 7x1 -geometry 16x16+0+0 -background transparent explode-spritesheet.png
```

### 方法2: オンラインツール
- [Free Sprite Sheet Packer](https://www.codeandweb.com/free-sprite-sheet-packer)
- [Sprite Sheet Packer](https://www.leshylabs.com/apps/sstool/)

### 方法3: Node.jsスクリプト（canvasライブラリ使用）
```javascript
const { createCanvas, loadImage } = require('canvas');
// ... スプライトシート作成処理
```

## Phaser3での使用方法

### スプライトシート版
```typescript
// 読み込み
this.load.spritesheet('explode', 'explode.png', {
  frameWidth: 16,
  frameHeight: 16
});

// アニメーション作成
this.anims.create({
  key: 'explode_anim',
  frames: this.anims.generateFrameNumbers('explode', { start: 0, end: 6 }),
  frameRate: 20,
  repeat: 0
});
```

### 個別画像版（現在の実装）
```typescript
// 各画像を個別に読み込み
for (let i = 1; i <= 7; i++) {
  this.load.image(`explode-${i}`, `explode-${i}.png`);
}

// アニメーション作成
const frames = [1,2,3,4,5,6,7].map(num => ({
  key: `explode-${num}`,
  frame: 0
}));

this.anims.create({
  key: 'explode_anim',
  frames: frames,
  frameRate: 20,
  repeat: 0
});
```