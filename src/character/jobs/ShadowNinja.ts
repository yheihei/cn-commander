import { JobClass } from "./JobClass";
import {
  CharacterStats,
  JobType,
  ClassSkill,
} from "../../types/CharacterTypes";

export class ShadowNinja extends JobClass {
  readonly type: JobType = "shadow";
  readonly name = "影忍";
  readonly description = "視界に優れた忍者";

  readonly classSkill: ClassSkill = {
    name: "暗視",
    description: "視界範囲+3",
    apply: (stats: CharacterStats): CharacterStats => {
      return {
        ...stats,
        sight: stats.sight + 3,
      };
    },
  };

  getBaseStats(): CharacterStats {
    return {
      hp: 50,
      maxHp: 50,
      attack: 22,
      defense: 18,
      speed: 18,
      moveSpeed: 11,
      sight: 12,
    };
  }
}
