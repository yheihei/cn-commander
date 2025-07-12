import { JobClass } from "./JobClass";
import {
  CharacterStats,
  JobType,
  ClassSkill,
} from "../../types/CharacterTypes";

export class IronNinja extends JobClass {
  readonly type: JobType = "iron";
  readonly name = "鉄忍";
  readonly description = "防御力に優れた忍者";

  readonly classSkill: ClassSkill = {
    name: "鉄壁",
    description: "防御力+20%",
    apply: (stats: CharacterStats): CharacterStats => {
      return {
        ...stats,
        defense: Math.round(stats.defense * 1.2),
      };
    },
  };

  getBaseStats(): CharacterStats {
    return {
      hp: 80,
      maxHp: 80,
      attack: 20,
      defense: 30,
      speed: 15,
      moveSpeed: 8,
      sight: 7,
    };
  }
}
