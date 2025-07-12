import { JobClass } from "./JobClass";
import {
  CharacterStats,
  JobType,
  ClassSkill,
} from "../../types/CharacterTypes";

export class WindNinja extends JobClass {
  readonly type: JobType = "wind";
  readonly name = "風忍";
  readonly description = "機動力に優れた忍者";

  readonly classSkill: ClassSkill = {
    name: "疾風",
    description: "移動速度+10%",
    apply: (stats: CharacterStats): CharacterStats => {
      return {
        ...stats,
        moveSpeed: Math.round(stats.moveSpeed * 1.1),
      };
    },
  };

  getBaseStats(): CharacterStats {
    return {
      hp: 60,
      maxHp: 60,
      attack: 25,
      defense: 15,
      speed: 20,
      moveSpeed: 13,
      sight: 8,
    };
  }
}
