import { Character } from '../character/Character';
import { IItem } from './ItemTypes';

export interface ArmyFormationData {
  commander: Character;
  soldiers: Character[];
  items: Map<Character, IItem[]>;
  deployPosition: { x: number; y: number };
}

export interface WaitingSoldier {
  character: Character;
  isAvailable: boolean;
}

export interface FormationSlot {
  character: Character | null;
  slotType: 'commander' | 'soldier';
  index: number;
}

export interface DeployPosition {
  x: number;
  y: number;
  isValid: boolean;
}
