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
import { BaseManager } from '../base/BaseManager';
import { BaseCombatSystem } from '../base/BaseCombatSystem';
import { Base } from '../base/Base';
import { isArmyTarget, isBaseTarget } from '../types/CombatTypes';

export class CombatSystem {
  private armyManager: ArmyManager;
  private baseCombatSystem?: BaseCombatSystem;
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

  /**
   * BaseManagerを設定（拠点戦闘のため）
   */
  setBaseManager(baseManager: BaseManager): void {
    const scene = (this.effectManager as any).scene;
    this.baseCombatSystem = new BaseCombatSystem(scene, baseManager, this.effectManager);
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
    console.log(`[CombatSystem] startCombat開始: ${army.getName()}`);
    const movementMode = army.getMovementMode();
    console.log(`[CombatSystem] 軍団モード: ${movementMode}`);

    // 通常移動モードでは攻撃しない
    if (movementMode === MovementMode.NORMAL) {
      this.stopCombat(army);
      return;
    }

    // 既に戦闘中の場合はスキップ
    if (this.combatArmies.has(army)) {
      console.log(`[CombatSystem] 既に戦闘中のためスキップ`);
      return;
    }

    // 戦闘移動または待機モードの場合のみ攻撃開始
    console.log(`[CombatSystem] 戦闘開始処理実行`);
    console.log(`[CombatSystem] this.attackTimerManager存在確認: ${this.attackTimerManager !== undefined}`);
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
    console.log(`[CombatSystem] 攻撃実行チェック: ${attacker.getName()}`);
    console.log(`[CombatSystem] this存在確認: ${this !== undefined && this !== null}`);
    console.log(`[CombatSystem] this.combatCalculator存在確認: ${this?.combatCalculator !== undefined}`);
    console.log(`[CombatSystem] this.rangeCalculator存在確認: ${this?.rangeCalculator !== undefined}`);
    console.log(`[CombatSystem] this.effectManager存在確認: ${this?.effectManager !== undefined}`);

    // 攻撃可能かチェック
    const canAttack = this.combatCalculator.canAttack(attacker);
    const weapon = attacker.getItemHolder().getEquippedWeapon();
    console.log(`  - 装備武器: ${weapon ? weapon.name : 'なし'}`);
    console.log(`  - 攻撃可能: ${canAttack}`);

    if (!canAttack) {
      console.log(`  → 攻撃不可のためスキップ`);
      return;
    }

    // 攻撃目標が設定されている場合の処理
    const attackTarget = attackerArmy.getAttackTarget();
    if (attackTarget) {
      // 軍団の場合
      if (isArmyTarget(attackTarget) && attackTarget.isActive() && attackTarget.isDiscovered()) {
        // 攻撃目標の軍団メンバーのみを対象にする
        const targetMembers = [attackTarget.getCommander(), ...attackTarget.getSoldiers()];
        const validTargets = targetMembers.filter((enemy) => enemy.isAlive());

        if (validTargets.length === 0) return;

        // 距離順にソート（近い順）
        const sortedTargets = this.rangeCalculator.sortByDistance(attacker, validTargets);

        // 最も近い敵から順に射程内かチェック
        let target: Character | null = null;
        for (const enemy of sortedTargets) {
          if (this.rangeCalculator.isInRange(attacker, enemy)) {
            target = enemy;
            break;
          }
        }

        if (!target) {
          // 攻撃目標が射程外の場合は攻撃しない
          console.log(`  → 攻撃目標が射程外`);
          return;
        }

        // 攻撃を実行
        console.log(`  → ${target.getName()}を攻撃`);
        this.executeAttack(attacker, target);
        return;
      }
      // 拠点の場合
      else if (isBaseTarget(attackTarget) && !attackTarget.isDestroyed()) {
        if (this.baseCombatSystem && this.baseCombatSystem.isBaseInRange(attacker, attackTarget)) {
          // 拠点への攻撃を実行
          console.log(`  → 拠点「${attackTarget.name}」を攻撃`);
          this.executeBaseAttack(attacker, attackTarget);
        }
        return;
      }
    }

    // 攻撃目標が設定されていない場合は通常の処理
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

    if (allEnemies.length === 0) {
      console.log(`  → 敵が見つからない`);
      return;
    }

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
      console.log(`  → 射程内に敵がいない`);
      return;
    }

    // 攻撃を実行
    console.log(`  → ${target.getName()}を攻撃`);
    this.executeAttack(attacker, target);
  }

  private executeAttack(attacker: Character, target: Character): void {
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

  private executeBaseAttack(attacker: Character, targetBase: Base): void {
    if (!this.baseCombatSystem) return;

    // 拠点への攻撃エフェクトを表示
    const weapon = attacker.getItemHolder().getEquippedWeapon();
    if (weapon) {
      // 拠点の中心座標を計算
      const basePos = targetBase.getPosition();
      const targetWorldPos = {
        x: (basePos.x + 1) * 16, // 2x2タイルの中心
        y: (basePos.y + 1) * 16,
      };

      // ダミーターゲット（拠点の中心位置）を作成
      const dummyTarget = {
        x: targetWorldPos.x,
        y: targetWorldPos.y,
        getWorldTransformMatrix: () => ({
          tx: targetWorldPos.x,
          ty: targetWorldPos.y,
        }),
      } as any;

      this.effectManager.createAttackEffect(attacker, dummyTarget, weapon.weaponType, () => {
        // エフェクト完了後、拠点への攻撃を実行
        if (attacker.isAlive() && !targetBase.isDestroyed()) {
          this.baseCombatSystem!.processBaseAttack(attacker, targetBase);

          // 武器の耐久度を消費
          weapon.use();
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
    const allMembers = [army.getCommander(), ...army.getSoldiers()];

    // 攻撃目標が設定されている場合
    const attackTarget = army.getAttackTarget();
    if (attackTarget) {
      // 軍団の場合
      if (isArmyTarget(attackTarget) && attackTarget.isActive() && attackTarget.isDiscovered()) {
        // 軍団の各メンバーについて、攻撃目標が射程内にいるかチェック
        for (const member of allMembers) {
          if (!member.isAlive() || !this.combatCalculator.canAttack(member)) {
            continue;
          }

          const targetMembers = [attackTarget.getCommander(), ...attackTarget.getSoldiers()];
          for (const enemy of targetMembers) {
            if (enemy.isAlive() && this.rangeCalculator.isInRange(member, enemy)) {
              return true; // 攻撃目標が射程内にいる
            }
          }
        }
        return false; // 攻撃目標が射程外
      }
      // 拠点の場合
      else if (isBaseTarget(attackTarget) && !attackTarget.isDestroyed()) {
        // 軍団の各メンバーについて、拠点が射程内にあるかチェック
        for (const member of allMembers) {
          if (!member.isAlive() || !this.combatCalculator.canAttack(member)) {
            continue;
          }

          if (this.baseCombatSystem && this.baseCombatSystem.isBaseInRange(member, attackTarget)) {
            return true; // 拠点が射程内にある
          }
        }
        return false; // 拠点が射程外
      }
    }

    // 攻撃目標が設定されていない場合は通常の処理
    const enemyArmies = this.getEnemyArmies(army);

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
        const hasTargetsInRange = this.hasEnemiesInRange(army);

        if (hasTargetsInRange) {
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
