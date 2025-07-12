export interface CharacterStats {
  hp: number;
  maxHp: number;
  attack: number;
  defense: number;
  speed: number;
  moveSpeed: number;
  sight: number;
}

export interface CharacterConfig {
  id: string;
  name: string;
  jobType: JobType;
  stats: CharacterStats;
  isCommander?: boolean;
}

export type JobType = "wind" | "iron" | "shadow" | "medicine";

export interface Position {
  x: number;
  y: number;
}

export interface ClassSkill {
  name: string;
  description: string;
  apply(stats: CharacterStats): CharacterStats;
}

export const STAT_RANGES = {
  hp: { min: 20, max: 100 },
  attack: { min: 5, max: 100 },
  defense: { min: 3, max: 100 },
  speed: { min: 5, max: 50 },
  moveSpeed: { min: 3, max: 30 },
  sight: { min: 3, max: 20 },
} as const;
