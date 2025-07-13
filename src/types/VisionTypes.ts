import { Position } from './CharacterTypes';
import { Character } from '../character/Character';

export interface VisionArea {
  character: Character;
  range: number; // 基本視界範囲
  center: Position;
  effectiveRange: number; // 地形・モード考慮後の実効視界範囲
}

export interface VisionCalculation {
  baseSight: number;
  classBonus: number;
  modeBonus: number;
  terrainModifier: number;
  effectiveSight: number;
}

export interface DiscoveryEvent {
  discoveredArmy: string; // 発見された軍団ID
  discovererArmy: string; // 発見した軍団ID
  position: Position; // 発見位置
  timestamp: number; // 発見時刻
}