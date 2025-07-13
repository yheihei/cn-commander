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

    // 全ての発見済み敵を収集
    const allEnemies: Character[] = [];
    enemyArmies.forEach((enemyArmy) => {
      if (enemyArmy.isDiscovered()) {
        const enemyMembers = [enemyArmy.getCommander(), ...enemyArmy.getSoldiers()];
        const validTargets = enemyMembers.filter((enemy) => enemy.isAlive());
        allEnemies.push(...validTargets);
      }
    });

    if (allEnemies.length === 0) return;

    // 距離順にソート（近い順）
    const sortedEnemies = this.rangeCalculator.sortByDistance(attacker, allEnemies);

    // 最も近い敵から順に射程内かチェック
    let target: Character | null = null;
    for (const enemy of sortedEnemies) {
      if (this.rangeCalculator.isInRange(attacker, enemy)) {
        target = enemy;
        break;
      }
    }

    if (!target) {
      return;
    }

    // 攻撃エフェクトを表示
    const weapon = attacker.getItemHolder().getEquippedWeapon();
    if (weapon) {
      this.effectManager.createAttackEffect(attacker, target, weapon.weaponType, () => {
        // エフェクト完了後、再度射程をチェック
        const stillInRange = this.rangeCalculator.isInRange(attacker, target);
        
        if (attacker.isAlive() && target.isAlive() && stillInRange) {
          this.combatCalculator.performAttack(attacker, target);
        }
      });
    }
  }

  private getEnemyArmies(army: Army): Army[] {
    return this.armyManager.getAllArmies().filter((otherArmy) => {
      return otherArmy.getOwner() !== army.getOwner();
    });
  }

  private hasEnemiesInRange(army: Army): boolean {
    const enemyArmies = this.getEnemyArmies(army);
    const allMembers = [army.getCommander(), ...army.getSoldiers()];
    
    // 軍団の各メンバーについて、射程内に敵がいるかチェック
    for (const member of allMembers) {
      if (!member.isAlive() || !this.combatCalculator.canAttack(member)) {
        continue;
      }
      
      // 全ての敵について射程内かチェック
      for (const enemyArmy of enemyArmies) {
        if (!enemyArmy.isDiscovered()) continue;
        
        const enemyMembers = [enemyArmy.getCommander(), ...enemyArmy.getSoldiers()];
        for (const enemy of enemyMembers) {
          if (enemy.isAlive() && this.rangeCalculator.isInRange(member, enemy)) {
            return true; // 射程内に敵が見つかった
          }
        }
      }
    }
    
    return false; // 誰も射程内に敵を持っていない
  }

  update(_time: number, _delta: number): void {
    // 全軍団の戦闘状態を更新
    const allArmies = this.armyManager.getAllArmies();
    allArmies.forEach((army) => {
      // 移動モードに応じて戦闘開始/停止
      const mode = army.getMovementMode();
      if (mode === MovementMode.COMBAT || mode === MovementMode.STANDBY) {
        // 射程内に敵がいるかチェック
        if (this.hasEnemiesInRange(army)) {
          // 既に戦闘中でなければ開始
          this.startCombat(army);
        } else {
          // 射程内に敵がいなければ戦闘停止
          this.stopCombat(army);
        }
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
