import { JobClass } from './JobClass';
import { CharacterStats, JobType, ClassSkill } from '../../types/CharacterTypes';

export class MedicineNinja extends JobClass {
  readonly type: JobType = 'medicine';
  readonly name = '薬忍';
  readonly description = '回復支援に優れた忍者';
  
  readonly classSkill: ClassSkill = {
    name: '医術',
    description: '兵糧丸を使うと軍団全員に効果が及ぶ',
    apply: (stats: CharacterStats): CharacterStats => {
      return stats;
    }
  };
  
  getBaseStats(): CharacterStats {
    return {
      hp: 55,
      maxHp: 55,
      attack: 18,
      defense: 20,
      speed: 16,
      moveSpeed: 10,
      sight: 9
    };
  }
}