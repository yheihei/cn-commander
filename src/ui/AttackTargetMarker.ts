import * as Phaser from 'phaser';
import { Army } from '../army/Army';

export class AttackTargetMarker extends Phaser.GameObjects.Container {
  private targetMarker: Phaser.GameObjects.Graphics;
  private targetArmy: Army;
  private animationTimer: Phaser.Time.TimerEvent | null = null;

  constructor(scene: Phaser.Scene, targetArmy: Army) {
    super(scene, 0, 0);
    this.targetArmy = targetArmy;

    // ターゲットマーカーの作成
    this.targetMarker = scene.add.graphics();
    this.add(this.targetMarker);

    // アニメーション開始
    this.startAnimation();

    // シーンに追加
    scene.add.existing(this);
    this.setDepth(150); // 他のUIよりも前面に表示
  }

  private startAnimation(): void {
    let scale = 1.0;
    let growing = true;

    this.animationTimer = this.scene.time.addEvent({
      delay: 50,
      callback: () => {
        if (growing) {
          scale += 0.02;
          if (scale >= 1.3) {
            growing = false;
          }
        } else {
          scale -= 0.02;
          if (scale <= 1.0) {
            growing = true;
          }
        }
        this.drawMarker(scale);
      },
      loop: true,
    });
  }

  private drawMarker(scale: number): void {
    this.targetMarker.clear();

    // 軍団の指揮官の位置を取得
    const commander = this.targetArmy.getCommander();
    const x = this.targetArmy.x + commander.x;
    const y = this.targetArmy.y + commander.y;

    // 位置を更新
    this.setPosition(x, y);

    // 赤い十字マーカーを描画
    const size = 20 * scale;
    this.targetMarker.lineStyle(2, 0xff0000, 0.8);
    
    // 十字を描画
    this.targetMarker.beginPath();
    this.targetMarker.moveTo(-size, 0);
    this.targetMarker.lineTo(size, 0);
    this.targetMarker.moveTo(0, -size);
    this.targetMarker.lineTo(0, size);
    this.targetMarker.strokePath();

    // 四隅の角を描画
    const cornerSize = size * 0.3;
    const cornerOffset = size * 0.7;
    
    // 左上
    this.targetMarker.beginPath();
    this.targetMarker.moveTo(-cornerOffset, -cornerOffset);
    this.targetMarker.lineTo(-cornerOffset, -cornerOffset + cornerSize);
    this.targetMarker.moveTo(-cornerOffset, -cornerOffset);
    this.targetMarker.lineTo(-cornerOffset + cornerSize, -cornerOffset);
    this.targetMarker.strokePath();

    // 右上
    this.targetMarker.beginPath();
    this.targetMarker.moveTo(cornerOffset, -cornerOffset);
    this.targetMarker.lineTo(cornerOffset, -cornerOffset + cornerSize);
    this.targetMarker.moveTo(cornerOffset, -cornerOffset);
    this.targetMarker.lineTo(cornerOffset - cornerSize, -cornerOffset);
    this.targetMarker.strokePath();

    // 左下
    this.targetMarker.beginPath();
    this.targetMarker.moveTo(-cornerOffset, cornerOffset);
    this.targetMarker.lineTo(-cornerOffset, cornerOffset - cornerSize);
    this.targetMarker.moveTo(-cornerOffset, cornerOffset);
    this.targetMarker.lineTo(-cornerOffset + cornerSize, cornerOffset);
    this.targetMarker.strokePath();

    // 右下
    this.targetMarker.beginPath();
    this.targetMarker.moveTo(cornerOffset, cornerOffset);
    this.targetMarker.lineTo(cornerOffset, cornerOffset - cornerSize);
    this.targetMarker.moveTo(cornerOffset, cornerOffset);
    this.targetMarker.lineTo(cornerOffset - cornerSize, cornerOffset);
    this.targetMarker.strokePath();
  }

  public update(): void {
    // 軍団が移動した場合に位置を更新
    if (this.targetArmy && this.targetArmy.isActive()) {
      const commander = this.targetArmy.getCommander();
      const x = this.targetArmy.x + commander.x;
      const y = this.targetArmy.y + commander.y;
      this.setPosition(x, y);
    }
  }

  public destroy(): void {
    if (this.animationTimer) {
      this.animationTimer.destroy();
      this.animationTimer = null;
    }
    super.destroy();
  }
}