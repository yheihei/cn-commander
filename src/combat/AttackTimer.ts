import * as Phaser from 'phaser';
import { Character } from '../character/Character';
import { Army } from '../army/Army';

interface TimerInfo {
  character: Character;
  timer: Phaser.Time.TimerEvent;
  lastAttackTime: number;
  attackInterval: number;
}

export class AttackTimer {
  private scene: Phaser.Scene;
  private timers: Map<Character, TimerInfo> = new Map();

  constructor(scene: Phaser.Scene) {
    this.scene = scene;
  }

  start(character: Character, onAttack: () => void): void {
    this.stop(character);

    const attackInterval = this.getAttackInterval(character);

    const timer = this.scene.time.addEvent({
      delay: attackInterval,
      callback: onAttack,
      loop: true,
    });

    this.timers.set(character, {
      character,
      timer,
      lastAttackTime: this.scene.time.now,
      attackInterval,
    });
  }

  stop(character: Character): void {
    const timerInfo = this.timers.get(character);
    if (timerInfo) {
      timerInfo.timer.destroy();
      this.timers.delete(character);
    }
  }

  reset(character: Character): void {
    const timerInfo = this.timers.get(character);
    if (timerInfo) {
      const onAttack = timerInfo.timer.callback as () => void;
      this.stop(character);
      this.start(character, onAttack);
    }
  }

  getAttackInterval(character: Character): number {
    const stats = character.getStats();
    if (stats.speed <= 0) return Number.MAX_SAFE_INTEGER;
    return (90 / stats.speed) * 1000; // ミリ秒に変換
  }

  getRemainingTime(character: Character): number {
    const timerInfo = this.timers.get(character);
    if (!timerInfo) return 0;

    const elapsed = this.scene.time.now - timerInfo.lastAttackTime;
    return Math.max(0, timerInfo.attackInterval - elapsed);
  }

  destroy(): void {
    this.timers.forEach((timerInfo) => {
      timerInfo.timer.destroy();
    });
    this.timers.clear();
  }
}

export class AttackTimerManager {
  private scene: Phaser.Scene;
  private armyTimers: Map<Army, AttackTimer> = new Map();

  constructor(scene: Phaser.Scene) {
    this.scene = scene;
  }

  startArmyAttackTimers(army: Army, onCharacterAttack: (character: Character) => void): void {
    const timer = new AttackTimer(this.scene);
    this.armyTimers.set(army, timer);

    const allMembers = [army.getCommander(), ...army.getSoldiers()];
    console.log(`[AttackTimerManager] 軍団「${army.getName()}」の攻撃タイマー開始処理`);
    console.log(`[AttackTimerManager] メンバー数: ${allMembers.length}`);

    allMembers.forEach((member, index) => {
      const isAlive = member.isAlive();
      const equippedWeapon = member.getItemHolder().getEquippedWeapon();

      console.log(`[AttackTimerManager] メンバー${index + 1}: ${member.getName()}`);
      console.log(`  - 生存: ${isAlive}`);
      console.log(`  - 装備武器: ${equippedWeapon ? equippedWeapon.name : 'なし'}`);

      if (isAlive && equippedWeapon) {
        console.log(`  → 攻撃タイマー開始`);
        timer.start(member, () => onCharacterAttack(member));
      } else {
        console.log(`  → 攻撃タイマー開始せず`);
      }
    });
  }

  stopArmyAttackTimers(army: Army): void {
    const timer = this.armyTimers.get(army);
    if (timer) {
      timer.destroy();
      this.armyTimers.delete(army);
    }
  }

  updateCharacterTimer(character: Character, army: Army): void {
    const timer = this.armyTimers.get(army);
    if (timer) {
      if (!character.isAlive() || !character.getItemHolder().getEquippedWeapon()) {
        timer.stop(character);
      }
    }
  }

  destroy(): void {
    this.armyTimers.forEach((timer) => {
      timer.destroy();
    });
    this.armyTimers.clear();
  }
}
