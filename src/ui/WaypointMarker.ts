import * as Phaser from "phaser";

export class WaypointMarker extends Phaser.GameObjects.Container {
  private crossGraphics: Phaser.GameObjects.Graphics;
  private indexText: Phaser.GameObjects.Text;

  constructor(scene: Phaser.Scene, x: number, y: number, index: number) {
    super(scene, x, y);

    // ×マークを描画
    this.crossGraphics = scene.add.graphics();
    this.crossGraphics.lineStyle(3, 0xff0000, 1);

    // ×の線を描画（サイズ: 20x20）
    const size = 10;
    this.crossGraphics.moveTo(-size, -size);
    this.crossGraphics.lineTo(size, size);
    this.crossGraphics.moveTo(size, -size);
    this.crossGraphics.lineTo(-size, size);
    this.crossGraphics.strokePath();

    this.add(this.crossGraphics);

    // インデックス番号を表示（1から始まる）
    this.indexText = scene.add.text(0, -20, `${index}`, {
      fontSize: "14px",
      color: "#ffffff",
      backgroundColor: "#000000",
      padding: { x: 4, y: 2 },
    });
    this.indexText.setOrigin(0.5);
    this.add(this.indexText);

    // Containerを配置
    scene.add.existing(this);

    // UIレイヤーに表示
    this.setDepth(100);
  }

  public updateIndex(index: number): void {
    this.indexText.setText(`${index}`);
  }
}
