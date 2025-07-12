import { Character } from '../character/Character';
import { Position } from './CharacterTypes';

export interface ArmyConfig {
  id: string;
  name: string;
  commander: Character;
  soldiers?: Character[];
}

export interface SightArea {
  character: Character;
  range: number;
  center: Position;
}

export type FormationType = 'standard' | 'defensive' | 'offensive';

export interface ArmyMovement {
  targetPosition: Position;
  path: Position[];
  currentPathIndex: number;
  isMoving: boolean;
}

export const ARMY_CONSTRAINTS = {
  maxSoldiers: 3,
  maxArmies: 6,
  minMembers: 1
} as const;