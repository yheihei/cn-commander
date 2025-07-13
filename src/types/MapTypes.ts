import { TileType } from './TileTypes';

export interface MapConfig {
  tileSize: number; // タイルサイズ（ピクセル）
  mapWidth: number; // マップ幅（タイル数）
  mapHeight: number; // マップ高さ（タイル数）
  tileSpriteSheet: string; // タイルセット画像のキー
}

export interface MapLayer {
  name: string;
  tiles: TileType[][]; // 2D配列でタイルタイプを保持
  visible: boolean;
}

export interface MapData {
  name: string;
  width: number; // タイル数
  height: number; // タイル数
  tileSize: number; // ピクセル
  layers: MapLayer[];
  startPositions: {
    // 初期配置位置
    player: { x: number; y: number };
    enemy: { x: number; y: number };
  };
  bases: BaseData[]; // 拠点情報
}

export interface BaseData {
  id: string;
  name: string;
  type: BaseType;
  x: number; // タイル座標
  y: number; // タイル座標
  hp: number;
  maxHp: number;
  owner: 'player' | 'enemy' | 'neutral';
}

export enum BaseType {
  HEADQUARTERS = 'headquarters', // 本拠地
  NORMAL_BASE = 'normal_base', // 通常拠点
}

export interface Coordinate {
  x: number;
  y: number;
}

export interface GridCoordinate extends Coordinate {
  // グリッド座標（タイル単位）
}

export interface PixelCoordinate extends Coordinate {
  // ピクセル座標
}
