import * as Phaser from "phaser";
import {
  CharacterStats,
  CharacterConfig,
  Position,
  STAT_RANGES,
} from "../types/CharacterTypes";

export class Character extends Phaser.GameObjects.Sprite {
  private id: string;
  private characterName: string;
  private stats: CharacterStats;
  private jobType: string;
  private isCommander: boolean;
  private commanderMarker?: Phaser.GameObjects.Graphics;

  constructor(
    scene: Phaser.Scene,
    x: number,
    y: number,
    config: CharacterConfig,
  ) {
    super(scene, x, y, "sakuya", 0);

    this.id = config.id;
    this.characterName = config.name;
    this.jobType = config.jobType;
    this.stats = { ...config.stats };
    this.isCommander = config.isCommander ?? false;

    this.validateStats();

    this.setDisplaySize(16, 16);
    this.setOrigin(0.5, 0.5); // スプライトの原点を中央に設定

    scene.add.existing(this);

    // 指揮官マークの作成
    if (this.isCommander) {
      this.createCommanderMarker();
    }
  }

  private validateStats(): void {
    for (const [key, value] of Object.entries(this.stats)) {
      if (key === "maxHp") continue;
      const range = STAT_RANGES[key as keyof typeof STAT_RANGES];
      if (range) {
        this.stats[key as keyof CharacterStats] = Math.max(
          range.min,
          Math.min(range.max, value as number),
        );
      }
    }

    this.stats.hp = Math.min(this.stats.hp, this.stats.maxHp);
  }

  getId(): string {
    return this.id;
  }

  getName(): string {
    return this.characterName;
  }

  getJobType(): string {
    return this.jobType;
  }

  getStats(): Readonly<CharacterStats> {
    return { ...this.stats };
  }

  getPosition(): Position {
    return { x: this.x, y: this.y };
  }

  setPosition(x?: number, y?: number, z?: number, w?: number): this {
    super.setPosition(x, y, z, w);
    // 指揮官マークの位置は相対位置なので更新不要
    return this;
  }

  takeDamage(amount: number): void {
    this.stats.hp = Math.max(0, this.stats.hp - amount);
  }

  heal(amount: number): void {
    this.stats.hp = Math.min(this.stats.maxHp, this.stats.hp + amount);
  }

  getAttackInterval(): number {
    return 90 / this.stats.speed;
  }

  isAlive(): boolean {
    return this.stats.hp > 0;
  }

  updateStats(newStats: Partial<CharacterStats>): void {
    this.stats = { ...this.stats, ...newStats };
    this.validateStats();
  }

  private createCommanderMarker(): void {
    // Graphicsオブジェクトを作成（シーンに追加せずに）
    this.commanderMarker = new Phaser.GameObjects.Graphics(this.scene);
    this.commanderMarker.fillStyle(0xff0000, 1); // 赤色
    this.commanderMarker.fillCircle(0, 0, 5); // 半径5ピクセルの円（直径10px）
    this.commanderMarker.setPosition(0, -10); // キャラクターの上部に配置（相対位置）
    this.commanderMarker.setDepth(this.depth + 1); // キャラクターより前面に表示
    
    // デバッグ用ログ
    console.log(`Commander marker created for ${this.characterName}`);
  }

  getIsCommander(): boolean {
    return this.isCommander;
  }

  getCommanderMarker(): Phaser.GameObjects.Graphics | undefined {
    return this.commanderMarker;
  }

  destroy(): void {
    if (this.commanderMarker) {
      this.commanderMarker.destroy();
    }
    super.destroy();
  }
}
