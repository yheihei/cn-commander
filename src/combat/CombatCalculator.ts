import { Character } from '../character/Character';
import { IWeapon } from '../types/ItemTypes';

export interface CombatResult {
  success: boolean;
  hitRate: number;
  damage: number;
  weaponUsed?: IWeapon;
  targetKilled: boolean;
}

export class CombatCalculator {
  private static readonly FIXED_DAMAGE = 1;

  onAttackPerformed?: (attacker: Character, defender: Character, result: CombatResult) => void;
  onCharacterDefeated?: (character: Character) => void;

  calculateHitRate(attacker: Character, defender: Character): number {
    const weapon = attacker.getItemHolder().getEquippedWeapon();
    const attackerStats = attacker.getStats();
    const defenderStats = defender.getStats();
    const attackPower = attackerStats.attack + (weapon?.attackBonus || 0);
    const defensePower = defenderStats.defense;

    if (attackPower + defensePower === 0) return 50;

    const hitRate = (attackPower / (attackPower + defensePower)) * 100;
    return Math.max(0, Math.min(100, hitRate));
  }

  performAttack(attacker: Character, defender: Character): CombatResult {
    const weapon = attacker.getItemHolder().getEquippedWeapon();
    const hitRate = this.calculateHitRate(attacker, defender);
    const roll = Math.random() * 100;
    const success = roll <= hitRate;

    let targetKilled = false;

    if (success) {
      this.applyDamage(defender, CombatCalculator.FIXED_DAMAGE);
      targetKilled = defender.getStats().hp <= 0;

      if (targetKilled && this.onCharacterDefeated) {
        this.onCharacterDefeated(defender);
      }
    }

    // 武器の耐久度を消費（成功/失敗に関わらず）
    if (weapon) {
      weapon.durability = Math.max(0, weapon.durability - 1);
    }

    const result: CombatResult = {
      success,
      hitRate,
      damage: success ? CombatCalculator.FIXED_DAMAGE : 0,
      weaponUsed: weapon || undefined,
      targetKilled,
    };

    if (this.onAttackPerformed) {
      this.onAttackPerformed(attacker, defender, result);
    }

    return result;
  }

  applyDamage(defender: Character, damage: number): void {
    const currentStats = defender.getStats();
    const newHp = Math.max(0, currentStats.hp - damage);
    defender.setStats({ hp: newHp });
  }

  canAttack(character: Character): boolean {
    const weapon = character.getItemHolder().getEquippedWeapon();
    return weapon !== null && weapon.durability > 0;
  }
}
