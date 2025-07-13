import * as Phaser from 'phaser';
import { Army } from '../army/Army';
import { ArmyManager } from '../army/ArmyManager';
import { Character } from '../character/Character';
import { RangeCalculator } from './RangeCalculator';
import { CombatCalculator } from './CombatCalculator';
import { AttackTimerManager } from './AttackTimer';
import { CombatEffectManager } from './CombatEffectManager';
import { MapManager } from '../map/MapManager';
import { MovementMode } from '../types/MovementTypes';

export class CombatSystem {
  private armyManager: ArmyManager;
  private rangeCalculator: RangeCalculator;
  private combatCalculator: CombatCalculator;
  private attackTimerManager: AttackTimerManager;
  private effectManager: CombatEffectManager;
  private combatArmies: Set<Army> = new Set();

  constructor(scene: Phaser.Scene, armyManager: ArmyManager, mapManager: MapManager) {
    this.armyManager = armyManager;

    this.rangeCalculator = new RangeCalculator(mapManager);
    this.combatCalculator = new CombatCalculator();
    this.attackTimerManager = new AttackTimerManager(scene);
    this.effectManager = new CombatEffectManager(scene);

    this.setupEventHandlers();
  }

  private setupEventHandlers(): void {
    // 攻撃実行時のイベントハンドラー
    this.combatCalculator.onAttackPerformed = (_attacker, defender, result) => {
      if (result.success) {
        // ヒットエフェクトを表示（ワールド座標）
        const defenderWorldPos = defender.getWorldTransformMatrix();
        this.effectManager.createHitEffect({ x: defenderWorldPos.tx, y: defenderWorldPos.ty });
      }
    };

    // キャラクター撃破時のイベントハンドラー
    this.combatCalculator.onCharacterDefeated = (character) => {
      // 撃破されたキャラクターを軍団から削除
      const army = this.armyManager.getArmyByMember(character);
      if (army) {
        army.removeMember(character);
        // タイマーを停止
        this.attackTimerManager.updateCharacterTimer(character, army);
      }
    };
  }

  startCombat(army: Army): void {
    const movementMode = army.getMovementMode();

    // 通常移動モードでは攻撃しない
    if (movementMode === MovementMode.NORMAL) {
      this.stopCombat(army);
      return;
    }

    // 既に戦闘中の場合はスキップ
    if (this.combatArmies.has(army)) {
      return;
    }

    // 戦闘移動または待機モードの場合のみ攻撃開始
    this.combatArmies.add(army);
    this.attackTimerManager.startArmyAttackTimers(army, (attacker) => {
      this.performCharacterAttack(attacker, army);
    });
  }

  stopCombat(army: Army): void {
    this.combatArmies.delete(army);
    this.attackTimerManager.stopArmyAttackTimers(army);
  }

  private performCharacterAttack(attacker: Character, attackerArmy: Army): void {
    // 攻撃可能かチェック
    if (!this.combatCalculator.canAttack(attacker)) {
      return;
    }

    // 敵軍団を取得
    const enemyArmies = this.getEnemyArmies(attackerArmy);

    // 射程内の敵を探す
    const targets: Character[] = [];
    enemyArmies.forEach((enemyArmy) => {
      if (enemyArmy.isDiscovered()) {
        const enemyMembers = [enemyArmy.getCommander(), ...enemyArmy.getSoldiers()];
        const validTargets = enemyMembers.filter((enemy) => enemy.isAlive());
        targets.push(...this.rangeCalculator.getTargetsInRange(attacker, validTargets));
      }
    });

    if (targets.length === 0) return;

    // 最も近い敵を選択
    const target = this.rangeCalculator.getNearestTarget(attacker, targets);
    if (!target) return;

    // 攻撃エフェクトを表示
    const weapon = attacker.getItemHolder().getEquippedWeapon();
    if (weapon) {
      this.effectManager.createAttackEffect(attacker, target, weapon.weaponType, () => {
        // エフェクト完了後に攻撃を実行
        this.combatCalculator.performAttack(attacker, target);
      });
    }
  }

  private getEnemyArmies(army: Army): Army[] {
    return this.armyManager.getAllArmies().filter((otherArmy) => {
      return otherArmy.getOwner() !== army.getOwner();
    });
  }

  update(_time: number, _delta: number): void {
    // 全軍団の戦闘状態を更新
    const allArmies = this.armyManager.getAllArmies();
    allArmies.forEach((army) => {
      // 移動モードに応じて戦闘開始/停止
      const mode = army.getMovementMode();
      if (mode === MovementMode.COMBAT || mode === MovementMode.STANDBY) {
        // 既に戦闘中でなければ開始
        this.startCombat(army);
      } else {
        // 通常移動モードなら停止
        this.stopCombat(army);
      }
    });
  }

  destroy(): void {
    this.combatArmies.clear();
    this.attackTimerManager.destroy();
    this.effectManager.destroy();
  }
}
