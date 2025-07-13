export enum TileType {
  PLAIN = 'plain', // 平地
  FOREST = 'forest', // 森林
  MOUNTAIN = 'mountain', // 山地
}

export interface TerrainEffect {
  movementCost: number; // 移動コスト
  defenseBonus: number; // 防御補正 (%)
  attackBonus: number; // 攻撃補正 (%)
  visionModifier: number; // 視界補正 (マス)
}

export const TERRAIN_EFFECTS: Record<TileType, TerrainEffect> = {
  [TileType.PLAIN]: {
    movementCost: 1.0,
    defenseBonus: 0,
    attackBonus: 0,
    visionModifier: 0,
  },
  [TileType.FOREST]: {
    movementCost: 1.5,
    defenseBonus: 20,
    attackBonus: -10,
    visionModifier: -2,
  },
  [TileType.MOUNTAIN]: {
    movementCost: 2.0,
    defenseBonus: 30,
    attackBonus: 15,
    visionModifier: 3,
  },
};

export interface TileData {
  type: TileType;
  x: number; // タイルのX座標（グリッド）
  y: number; // タイルのY座標（グリッド）
  walkable: boolean; // 通行可能か
}
