import { Army } from '../army/Army';
import { Character } from '../character/Character';
import { MapManager } from '../map/MapManager';
import { Position } from '../types/CharacterTypes';
import { VisionArea, VisionCalculation } from '../types/VisionTypes';
import { MovementMode, MOVEMENT_MODE_CONFIGS } from '../types/MovementTypes';
import { TerrainEffect } from '../types/TileTypes';

export class VisionSystem {
  constructor(private mapManager: MapManager) {}

  /**
   * 軍団の全メンバーの視界情報を計算
   */
  calculateVision(army: Army): VisionArea[] {
    const visionAreas: VisionArea[] = [];
    const armyPosition = army.getPosition();
    const movementMode = army.getMovementMode();

    army.getAliveMembers().forEach((character) => {
      // キャラクターの位置（軍団位置 + 相対位置）
      const characterPosition: Position = {
        x: armyPosition.x + character.x,
        y: armyPosition.y + character.y,
      };

      // キャラクターが立っている地形を取得
      const gridPos = this.mapManager.pixelToGrid(characterPosition.x, characterPosition.y);
      const tile = this.mapManager.getTileAt(gridPos.x, gridPos.y);
      const terrain = tile ? tile.getTerrainEffect() : null;

      // 実効視界を計算
      const effectiveRange = this.getEffectiveSight(
        character,
        characterPosition,
        movementMode,
        terrain,
      );

      visionAreas.push({
        character,
        range: character.getStats().sight,
        center: characterPosition,
        effectiveRange,
      });
    });

    return visionAreas;
  }

  /**
   * キャラクターの実効視界を計算
   */
  getEffectiveSight(
    character: Character,
    _position: Position,
    mode: MovementMode,
    terrain: TerrainEffect | null,
  ): number {
    const stats = character.getStats();
    const calculation: VisionCalculation = {
      baseSight: stats.sight,
      classBonus: 0, // クラススキルは既にstatsに反映済み
      modeBonus: MOVEMENT_MODE_CONFIGS[mode].sightBonus,
      terrainModifier: terrain ? terrain.visionModifier : 0,
      effectiveSight: 0,
    };

    // 実効視界 = 基本視界 + モード補正 + 地形補正
    calculation.effectiveSight = Math.max(
      1, // 最小視界は1マス
      calculation.baseSight + calculation.modeBonus + calculation.terrainModifier,
    );

    return calculation.effectiveSight;
  }

  /**
   * 観測者から対象が視界内にあるかを判定
   */
  isInSight(observer: Position, target: Position, sightRange: number): boolean {
    // グリッド座標に変換
    const observerGrid = this.mapManager.pixelToGrid(observer.x, observer.y);
    const targetGrid = this.mapManager.pixelToGrid(target.x, target.y);

    // マンハッタン距離で判定（正方形の視界）
    const distance = Math.max(
      Math.abs(observerGrid.x - targetGrid.x),
      Math.abs(observerGrid.y - targetGrid.y),
    );

    return distance <= sightRange;
  }

  /**
   * 指定位置から視界範囲内のタイル座標を取得
   */
  getVisibleTiles(center: Position, range: number): Position[] {
    const visibleTiles: Position[] = [];
    const centerGrid = this.mapManager.pixelToGrid(center.x, center.y);

    // 視界範囲内の全タイルを列挙（正方形）
    for (let dx = -range; dx <= range; dx++) {
      for (let dy = -range; dy <= range; dy++) {
        const gridX = centerGrid.x + dx;
        const gridY = centerGrid.y + dy;

        // マップ範囲内かチェック
        if (this.mapManager.isValidGrid(gridX, gridY)) {
          const pixelPos = this.mapManager.gridToPixel(gridX, gridY);
          visibleTiles.push(pixelPos);
        }
      }
    }

    return visibleTiles;
  }

  /**
   * 軍団が他の軍団を視界内に捉えているかチェック
   */
  canSeeArmy(observer: Army, target: Army): boolean {
    const observerVisionAreas = this.calculateVision(observer);
    const targetPosition = target.getPosition();

    // 観測側の各メンバーの視界をチェック
    for (const visionArea of observerVisionAreas) {
      if (this.isInSight(visionArea.center, targetPosition, visionArea.effectiveRange)) {
        return true;
      }
    }

    return false;
  }

  /**
   * 複数の観測軍団から見える軍団のリストを取得
   */
  getVisibleArmies(observers: Army[], targets: Army[]): Set<string> {
    const visibleArmyIds = new Set<string>();

    observers.forEach((observer) => {
      targets.forEach((target) => {
        // 自軍団は除外
        if (observer.getId() !== target.getId() && this.canSeeArmy(observer, target)) {
          visibleArmyIds.add(target.getId());
        }
      });
    });

    return visibleArmyIds;
  }
}
