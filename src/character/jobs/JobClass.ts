import {
  CharacterStats,
  JobType,
  ClassSkill,
} from "../../types/CharacterTypes";

export abstract class JobClass {
  abstract readonly type: JobType;
  abstract readonly name: string;
  abstract readonly description: string;
  abstract readonly classSkill: ClassSkill;

  abstract getBaseStats(): CharacterStats;

  applyClassSkill(stats: CharacterStats): CharacterStats {
    return this.classSkill.apply(stats);
  }
}
