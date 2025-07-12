import * as Phaser from 'phaser';
import { TileType, TileData, TERRAIN_EFFECTS } from '../types/TileTypes';
import { GridCoordinate, PixelCoordinate } from '../types/MapTypes';
import { MAP_CONFIG } from '../config/mapConfig';

// テスト環境でPhaser.GameObjects.Spriteがundefinedの場合のフォールバック
const SpriteBase = Phaser.GameObjects?.Sprite || class {
  constructor(public scene: any, public x: number, public y: number, public texture: string, public frame?: string | number) {}
  setDisplaySize() { return this; }
  setInteractive() { return this; }
  on() { return this; }
  destroy() {}
};

export class MapTile extends SpriteBase {
  private tileData: TileData;
  private gridPosition: GridCoordinate;
  private highlightGraphics?: Phaser.GameObjects.Graphics;
  
  constructor(
    scene: Phaser.Scene,
    gridX: number,
    gridY: number,
    tileType: TileType,
    texture: string,
    frame?: string | number
  ) {
    // グリッド座標をピクセル座標に変換
    const pixelX = gridX * MAP_CONFIG.tileSize + MAP_CONFIG.tileSize / 2;
    const pixelY = gridY * MAP_CONFIG.tileSize + MAP_CONFIG.tileSize / 2;
    
    super(scene, pixelX, pixelY, texture, frame);
    
    this.gridPosition = { x: gridX, y: gridY };
    this.tileData = {
      type: tileType,
      x: gridX,
      y: gridY,
      walkable: true  // デフォルトは通行可能
    };
    
    // タイルサイズに合わせてスケール調整
    this.setDisplaySize(MAP_CONFIG.tileSize, MAP_CONFIG.tileSize);
    
    // インタラクティブにする
    this.setInteractive();
    
    // ホバーイベント
    this.on('pointerover', this.onHover, this);
    this.on('pointerout', this.onHoverEnd, this);
    
    scene.add.existing(this);
  }
  
  public getTileType(): TileType {
    return this.tileData.type;
  }
  
  public getGridPosition(): GridCoordinate {
    return { ...this.gridPosition };
  }
  
  public getPixelPosition(): PixelCoordinate {
    return { x: this.x, y: this.y };
  }
  
  public isWalkable(): boolean {
    return this.tileData.walkable;
  }
  
  public setWalkable(walkable: boolean): void {
    this.tileData.walkable = walkable;
  }
  
  public getTerrainEffect() {
    return TERRAIN_EFFECTS[this.tileData.type];
  }
  
  private onHover(): void {
    // ハイライト表示
    if (!this.highlightGraphics) {
      this.highlightGraphics = this.scene.add.graphics();
      this.highlightGraphics.lineStyle(2, 0xffff00, 0.8);
      this.highlightGraphics.strokeRect(
        this.x - MAP_CONFIG.tileSize / 2,
        this.y - MAP_CONFIG.tileSize / 2,
        MAP_CONFIG.tileSize,
        MAP_CONFIG.tileSize
      );
    }
  }
  
  private onHoverEnd(): void {
    // ハイライトを削除
    if (this.highlightGraphics) {
      this.highlightGraphics.destroy();
      this.highlightGraphics = undefined;
    }
  }
  
  public destroy(): void {
    if (this.highlightGraphics) {
      this.highlightGraphics.destroy();
    }
    super.destroy();
  }
}