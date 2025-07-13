import * as Phaser from 'phaser';
import { MapTile } from './MapTile';
import { TileType } from '../types/TileTypes';
import { MapLayer as MapLayerData } from '../types/MapTypes';
import { MAP_CONFIG, TILE_INDICES } from '../config/mapConfig';

export class MapLayer {
  private scene: Phaser.Scene;
  private name: string;
  private tiles: MapTile[][] = [];
  private container: Phaser.GameObjects.Container;
  private visible: boolean = true;

  constructor(scene: Phaser.Scene, layerData: MapLayerData) {
    this.scene = scene;
    this.name = layerData.name;
    this.visible = layerData.visible;

    // レイヤーごとにコンテナを作成
    this.container = scene.add.container(0, 0);
    this.container.setVisible(this.visible);

    // タイルを作成
    this.createTiles(layerData.tiles);
  }

  private createTiles(tileTypes: TileType[][]): void {
    for (let y = 0; y < tileTypes.length; y++) {
      this.tiles[y] = [];
      for (let x = 0; x < tileTypes[y].length; x++) {
        const tileType = tileTypes[y][x];
        const tile = this.createTile(x, y, tileType);
        this.tiles[y][x] = tile;
        this.container.add(tile);
      }
    }
  }

  private createTile(x: number, y: number, tileType: TileType): MapTile {
    // タイルタイプに応じてテクスチャとフレームを決定
    let texture = 'tilemap-base';
    let frame = 0;

    switch (tileType) {
      case TileType.PLAIN:
        texture = 'tilemap-base';
        frame = TILE_INDICES.plain.grass;
        break;
      case TileType.FOREST:
        texture = 'tilemap-forest';
        frame = TILE_INDICES.forest.normal;
        break;
      case TileType.MOUNTAIN:
        texture = 'tilemap-mountain1';
        frame = TILE_INDICES.mountain.medium;
        break;
    }

    return new MapTile(this.scene, x, y, tileType, texture, frame);
  }

  public getTile(x: number, y: number): MapTile | null {
    if (y >= 0 && y < this.tiles.length && x >= 0 && x < this.tiles[y].length) {
      return this.tiles[y][x];
    }
    return null;
  }

  public getTileAt(pixelX: number, pixelY: number): MapTile | null {
    const gridX = Math.floor(pixelX / MAP_CONFIG.tileSize);
    const gridY = Math.floor(pixelY / MAP_CONFIG.tileSize);
    return this.getTile(gridX, gridY);
  }

  public setVisible(visible: boolean): void {
    this.visible = visible;
    this.container.setVisible(visible);
  }

  public isVisible(): boolean {
    return this.visible;
  }

  public getName(): string {
    return this.name;
  }

  public getContainer(): Phaser.GameObjects.Container {
    return this.container;
  }

  public destroy(): void {
    // 全てのタイルを破棄
    for (let y = 0; y < this.tiles.length; y++) {
      for (let x = 0; x < this.tiles[y].length; x++) {
        if (this.tiles[y][x]) {
          this.tiles[y][x].destroy();
        }
      }
    }
    this.tiles = [];
    this.container.destroy();
  }
}
