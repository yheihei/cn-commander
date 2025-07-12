import * as Phaser from "phaser";
import { MapLayer } from "./MapLayer";
import { MapTile } from "./MapTile";
import { MapData, GridCoordinate, BaseData } from "../types/MapTypes";
import { TileType } from "../types/TileTypes";
import { MAP_CONFIG, DEBUG_CONFIG } from "../config/mapConfig";

export class MapManager {
  private scene: Phaser.Scene;
  private layers: Map<string, MapLayer> = new Map();
  private mapData: MapData;
  private debugGraphics?: Phaser.GameObjects.Graphics;
  private bases: BaseData[] = [];

  constructor(scene: Phaser.Scene) {
    this.scene = scene;

    // デフォルトのマップデータ
    this.mapData = {
      name: "default",
      width: MAP_CONFIG.mapWidth,
      height: MAP_CONFIG.mapHeight,
      tileSize: MAP_CONFIG.tileSize,
      layers: [],
      startPositions: {
        player: { x: 10, y: 10 },
        enemy: { x: 490, y: 490 },
      },
      bases: [],
    };
  }

  public loadMap(mapData: MapData): void {
    // 既存のレイヤーをクリア
    this.clearMap();

    this.mapData = mapData;
    this.bases = mapData.bases;

    // レイヤーを作成
    for (const layerData of mapData.layers) {
      const layer = new MapLayer(this.scene, layerData);
      this.layers.set(layerData.name, layer);
    }

    // デバッグ表示
    if (DEBUG_CONFIG.showGrid) {
      this.drawDebugGrid();
    }
  }

  public createEmptyMap(
    width: number,
    height: number,
    defaultTileType: TileType = TileType.PLAIN,
  ): void {
    const tiles: TileType[][] = [];
    for (let y = 0; y < height; y++) {
      tiles[y] = [];
      for (let x = 0; x < width; x++) {
        tiles[y][x] = defaultTileType;
      }
    }

    const mapData: MapData = {
      name: "empty",
      width: width,
      height: height,
      tileSize: MAP_CONFIG.tileSize,
      layers: [
        {
          name: "terrain",
          tiles: tiles,
          visible: true,
        },
      ],
      startPositions: {
        player: { x: 10, y: 10 },
        enemy: { x: width - 10, y: height - 10 },
      },
      bases: [],
    };

    this.loadMap(mapData);
  }

  public getTileAt(
    x: number,
    y: number,
    layerName: string = "terrain",
  ): MapTile | null {
    const layer = this.layers.get(layerName);
    if (layer) {
      return layer.getTile(x, y);
    }
    return null;
  }

  public getTileAtPixel(
    pixelX: number,
    pixelY: number,
    layerName: string = "terrain",
  ): MapTile | null {
    const layer = this.layers.get(layerName);
    if (layer) {
      return layer.getTileAt(pixelX, pixelY);
    }
    return null;
  }

  public getLayer(name: string): MapLayer | undefined {
    return this.layers.get(name);
  }

  public getAllLayers(): MapLayer[] {
    return Array.from(this.layers.values());
  }

  public setLayerVisible(layerName: string, visible: boolean): void {
    const layer = this.layers.get(layerName);
    if (layer) {
      layer.setVisible(visible);
    }
  }

  public getMapWidth(): number {
    return this.mapData.width;
  }

  public getMapHeight(): number {
    return this.mapData.height;
  }

  public getMapWidthInPixels(): number {
    return this.mapData.width * this.mapData.tileSize;
  }

  public getMapHeightInPixels(): number {
    return this.mapData.height * this.mapData.tileSize;
  }

  public getBases(): BaseData[] {
    return [...this.bases];
  }

  public getBaseAt(gridX: number, gridY: number): BaseData | undefined {
    return this.bases.find((base) => base.x === gridX && base.y === gridY);
  }

  public pixelToGrid(pixelX: number, pixelY: number): GridCoordinate {
    return {
      x: Math.floor(pixelX / MAP_CONFIG.tileSize),
      y: Math.floor(pixelY / MAP_CONFIG.tileSize),
    };
  }

  public gridToPixel(gridX: number, gridY: number): { x: number; y: number } {
    return {
      x: gridX * MAP_CONFIG.tileSize + MAP_CONFIG.tileSize / 2,
      y: gridY * MAP_CONFIG.tileSize + MAP_CONFIG.tileSize / 2,
    };
  }

  private drawDebugGrid(): void {
    if (this.debugGraphics) {
      this.debugGraphics.destroy();
    }

    this.debugGraphics = this.scene.add.graphics();
    this.debugGraphics.lineStyle(1, 0x888888, 0.3);

    // 縦線
    for (let x = 0; x <= this.mapData.width; x++) {
      this.debugGraphics.moveTo(x * MAP_CONFIG.tileSize, 0);
      this.debugGraphics.lineTo(
        x * MAP_CONFIG.tileSize,
        this.mapData.height * MAP_CONFIG.tileSize,
      );
    }

    // 横線
    for (let y = 0; y <= this.mapData.height; y++) {
      this.debugGraphics.moveTo(0, y * MAP_CONFIG.tileSize);
      this.debugGraphics.lineTo(
        this.mapData.width * MAP_CONFIG.tileSize,
        y * MAP_CONFIG.tileSize,
      );
    }

    this.debugGraphics.strokePath();
  }

  private clearMap(): void {
    // 全レイヤーを破棄
    for (const layer of this.layers.values()) {
      layer.destroy();
    }
    this.layers.clear();

    // デバッググラフィックスを破棄
    if (this.debugGraphics) {
      this.debugGraphics.destroy();
      this.debugGraphics = undefined;
    }
  }

  public destroy(): void {
    this.clearMap();
  }
}
