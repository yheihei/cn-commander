import * as Phaser from 'phaser';
import { Character } from '../character/Character';

interface EffectConfig {
  texture: string;
  frames?: number[];
  duration: number;
  scale?: number;
  rotation?: boolean;
}

export class CombatEffectManager {
  private scene: Phaser.Scene;
  private activeEffects: Phaser.GameObjects.Sprite[] = [];

  private static readonly EFFECT_CONFIGS: Record<string, EffectConfig> = {
    slash: {
      texture: 'slash_effect',
      duration: 500,
      scale: 1.0,
    },
    shuriken: {
      texture: 'shuriken',
      duration: 1000,
      rotation: true,
      scale: 1.0,
    },
    hit: {
      texture: 'explode',
      frames: [1, 2, 3, 4, 5, 6, 7],
      duration: 300,
      scale: 1.5,
    },
  };

  constructor(scene: Phaser.Scene) {
    this.scene = scene;
  }

  createAttackEffect(
    attacker: Character,
    target: Character,
    weaponType: string,
    onComplete?: () => void,
  ): void {
    const effectType = weaponType === 'melee' ? 'slash' : 'shuriken';
    const config = CombatEffectManager.EFFECT_CONFIGS[effectType];

    // キャラクターのワールド座標を取得
    const attackerWorldPos = attacker.getWorldTransformMatrix();
    const targetWorldPos = target.getWorldTransformMatrix();
    
    const effect = this.scene.add.sprite(attackerWorldPos.tx, attackerWorldPos.ty, config.texture);
    effect.setScale(config.scale || 1.0);
    effect.setDepth(1000);
    this.activeEffects.push(effect);

    const distance = Phaser.Math.Distance.Between(attackerWorldPos.tx, attackerWorldPos.ty, targetWorldPos.tx, targetWorldPos.ty);
    const duration = Math.max(config.duration, (distance / 32) * 500); // 2マス/秒の速度

    this.scene.tweens.add({
      targets: effect,
      x: targetWorldPos.tx,
      y: targetWorldPos.ty,
      duration: duration,
      ease: 'Linear',
      onUpdate: () => {
        if (config.rotation) {
          effect.rotation += 0.3;
        }
      },
      onComplete: () => {
        this.removeEffect(effect);
        if (onComplete) {
          onComplete();
        }
      },
    });
  }

  createHitEffect(position: { x: number; y: number }): void {
    const config = CombatEffectManager.EFFECT_CONFIGS.hit;

    if (config.frames) {
      // シンプルなフレーム切り替えアニメーション
      const effect = this.scene.add.sprite(position.x, position.y, 'explode-1');
      effect.setScale(config.scale || 1.0);
      effect.setDepth(1001);
      this.activeEffects.push(effect);

      let frameIndex = 0;
      const frameDelay = config.duration / config.frames.length;

      // タイマーでフレームを切り替え
      const frameTimer = this.scene.time.addEvent({
        delay: frameDelay,
        callback: () => {
          frameIndex++;
          if (config.frames && frameIndex < config.frames.length && effect.active) {
            effect.setTexture(`explode-${config.frames[frameIndex]}`);
          } else {
            // アニメーション終了
            frameTimer.destroy();
            this.removeEffect(effect);
          }
        },
        repeat: config.frames.length - 1,
      });
    }
  }

  preloadEffects(_scene: Phaser.Scene): void {
    // エフェクト画像のプリロードはPreloadSceneで行う
  }

  private removeEffect(effect: Phaser.GameObjects.Sprite): void {
    const index = this.activeEffects.indexOf(effect);
    if (index !== -1) {
      this.activeEffects.splice(index, 1);
    }
    effect.destroy();
  }

  destroy(): void {
    this.activeEffects.forEach((effect) => {
      effect.destroy();
    });
    this.activeEffects = [];
  }
}
