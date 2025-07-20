import * as Phaser from 'phaser';
import { Base } from './Base';
import { BaseManager } from './BaseManager';
// CombatManagerはこのコンテキストでは不要
import { Character } from '../character/Character';
import { CombatEffectManager } from '../combat/CombatEffectManager';

/**
 * 拠点戦闘システム
 * 軍団による拠点攻撃を管理する
 */
export class BaseCombatSystem {
  private baseManager: BaseManager;
  private scene: Phaser.Scene;
  private effectManager?: CombatEffectManager;

  constructor(scene: Phaser.Scene, baseManager: BaseManager, effectManager?: CombatEffectManager) {
    this.scene = scene;
    this.baseManager = baseManager;
    this.effectManager = effectManager;

    // baseHitEffectイベントをリッスン
    if (this.effectManager) {
      this.scene.events.on('baseHitEffect', (data: { x: number; y: number }) => {
        this.effectManager!.createHitEffect(data);
      });
    }
  }

  /**
   * 拠点への攻撃を処理
   */
  processBaseAttack(attacker: Character, targetBase: Base): void {
    // 攻撃可能チェック
    if (!this.canAttackBase(attacker, targetBase)) {
      return;
    }

    // 拠点に攻撃通知
    targetBase.onAttacked(attacker.getId());

    // ダメージ計算
    const damage = this.calculateDamageToBase(attacker, targetBase);

    // 攻撃成功判定
    const stats = attacker.getStats();
    const weapon = attacker.getItemHolder().getEquippedWeapon();
    const attackPower = stats.attack + (weapon?.attackBonus || 0);
    const defenseValue = targetBase.getDefenseBonus();
    const hitChance = attackPower / (attackPower + defenseValue);

    if (Math.random() < hitChance) {
      // ダメージを与える
      const isDestroyed = targetBase.takeDamage(damage);

      // 破壊された場合
      if (isDestroyed) {
        this.scene.events.emit('baseDestroyed', {
          base: targetBase,
          attacker,
        });
      }
    }
  }

  /**
   * 拠点へのダメージ計算
   */
  calculateDamageToBase(_attacker: Character, _targetBase: Base): number {
    // 固定ダメージ1
    return 1;
  }

  /**
   * 拠点が射程内かチェック
   */
  isBaseInRange(attacker: Character, targetBase: Base): boolean {
    const weapon = attacker.getItemHolder().getEquippedWeapon();
    if (!weapon) return false;

    // ワールド座標を取得
    let attackerX: number, attackerY: number;
    if (typeof attacker.getWorldTransformMatrix === 'function') {
      const worldPos = attacker.getWorldTransformMatrix();
      attackerX = worldPos.tx;
      attackerY = worldPos.ty;
    } else {
      // テスト環境では、親コンテナ（Army）の位置を考慮
      const parent = (attacker as any).parentContainer;
      if (parent && 'x' in parent && 'y' in parent) {
        attackerX = parent.x + attacker.x;
        attackerY = parent.y + attacker.y;
      } else {
        attackerX = attacker.x;
        attackerY = attacker.y;
      }
    }

    const distance = this.getDistanceToBase({ x: attackerX / 16, y: attackerY / 16 }, targetBase);

    return distance >= weapon.minRange && distance <= weapon.maxRange;
  }

  /**
   * 拠点までの距離を計算
   * @param from 攻撃者の位置（タイル座標）
   * @param targetBase 対象拠点
   */
  getDistanceToBase(from: { x: number; y: number }, targetBase: Base): number {
    const basePos = targetBase.getPosition();
    // 拠点の中心点（2x2タイルの中心）
    const baseCenterX = basePos.x + 1;
    const baseCenterY = basePos.y + 1;

    const dx = baseCenterX - from.x;
    const dy = baseCenterY - from.y;

    // マンハッタン距離（RangeCalculatorと同じ計算方式）
    return Math.abs(dx) + Math.abs(dy);
  }

  /**
   * 拠点を攻撃可能かチェック
   */
  canAttackBase(attacker: Character, targetBase: Base): boolean {
    // 生存チェック
    if (!attacker.isAlive() || targetBase.isDestroyed()) {
      return false;
    }

    // 武器チェック
    const weapon = attacker.getItemHolder().getEquippedWeapon();
    if (!weapon || weapon.durability <= 0) {
      return false;
    }

    // 敵拠点または中立拠点のみ攻撃可能
    // TODO: CharacterからArmyを取得する方法が必要
    // 現在は射程チェックのみ実施

    // 射程チェック
    return this.isBaseInRange(attacker, targetBase);
  }

  /**
   * 攻撃可能な拠点のリストを取得
   */
  getAttackableBases(attacker: Character): Base[] {
    const allBases = this.baseManager.getAllBases();
    return allBases.filter((base) => this.canAttackBase(attacker, base));
  }

  /**
   * 拠点ヒットエフェクト
   */
  showBaseHitEffect(_base: Base): void {
    // 赤いフラッシュエフェクト（Baseクラス内で処理）
    // 必要に応じて追加のエフェクトを実装
  }

  /**
   * ダメージ数値表示
   */
  showBaseDamageNumber(base: Base, damage: number): void {
    const text = damage > 0 ? `-${damage}` : 'Miss';
    const color = damage > 0 ? '#ff0000' : '#ffff00';

    const damageText = this.scene.add.text(base.x, base.y - 20, text, {
      fontSize: '16px',
      color,
      stroke: '#000000',
      strokeThickness: 2,
    });

    damageText.setOrigin(0.5);

    // フロートアニメーション
    this.scene.tweens.add({
      targets: damageText,
      y: base.y - 40,
      alpha: 0,
      duration: 1000,
      ease: 'Power2',
      onComplete: () => {
        damageText.destroy();
      },
    });
  }
}
