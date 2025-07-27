import { Weapon } from './Weapon';
import { WeaponData, WeaponType } from '../types/ItemTypes';

export class WeaponFactory {
  private static readonly WEAPON_DATA: Record<string, WeaponData> = {
    ninja_sword: {
      id: 'ninja_sword',
      name: '忍者刀',
      weaponType: WeaponType.SWORD,
      attackBonus: 15,
      minRange: 1,
      maxRange: 3,
      maxDurability: 100,
      price: 300,
      description: '標準的な忍者の刀。近距離戦闘に適している。',
    },
    shuriken: {
      id: 'shuriken',
      name: '手裏剣',
      weaponType: WeaponType.PROJECTILE,
      attackBonus: 5,
      minRange: 1,
      maxRange: 6,
      maxDurability: 100,
      price: 200,
      description: '遠距離攻撃用の投擲武器。威力は低いが射程が長い。',
    },
    bow: {
      id: 'bow',
      name: '弓',
      weaponType: WeaponType.PROJECTILE,
      attackBonus: 2,
      minRange: 4,
      maxRange: 12,
      maxDurability: 100,
      price: 400,
      description: '長距離攻撃用の弓。威力は低いが射程が非常に長い。',
    },
  };

  static createWeapon(weaponId: string): Weapon {
    const data = this.getWeaponData(weaponId);
    return new Weapon(data);
  }

  static getWeaponData(weaponId: string): WeaponData {
    const data = this.WEAPON_DATA[weaponId];
    if (!data) {
      throw new Error(`Unknown weapon ID: ${weaponId}`);
    }
    return data;
  }

  static getAllWeaponIds(): string[] {
    return Object.keys(this.WEAPON_DATA);
  }

  static getWeaponsByType(type: WeaponType): WeaponData[] {
    return Object.values(this.WEAPON_DATA).filter((data) => data.weaponType === type);
  }
}
