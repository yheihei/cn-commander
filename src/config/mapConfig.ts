import { MapConfig } from '../types/MapTypes';

export const MAP_CONFIG: MapConfig = {
  tileSize: 16,          // 16x16ピクセルのタイル
  mapWidth: 512,         // 512タイル幅
  mapHeight: 512,        // 512タイル高さ
  tileSpriteSheet: 'tilemap'
};

// タイルマップ画像のマッピング設定
export const TILEMAP_ASSETS = {
  base: 'pipo-map001',
  road: 'pipo-map001_at-miti',
  forest: 'pipo-map001_at-mori',
  desert: 'pipo-map001_at-sabaku',
  soil: 'pipo-map001_at-tuti',
  sea: 'pipo-map001_at-umi',
  mountain1: 'pipo-map001_at-yama1',
  mountain2: 'pipo-map001_at-yama2',
  mountain3: 'pipo-map001_at-yama3'
};

// タイルセット内のタイルインデックス設定
// pipo-map001.pngは32x32のタイルが横8個、縦に複数並んでいると仮定
export const TILE_INDICES = {
  // 平地タイル
  plain: {
    grass: 0,     // 草原
    dirt: 8,      // 土
    stone: 16     // 石畳
  },
  // 森林タイル
  forest: {
    normal: 24,   // 通常の森
    dense: 32     // 深い森
  },
  // 山地タイル
  mountain: {
    low: 40,      // 低い山
    medium: 48,   // 中くらいの山
    high: 56      // 高い山
  }
};

// デバッグ用設定
export const DEBUG_CONFIG = {
  showGrid: false,          // グリッド線を表示
  showCoordinates: false,   // 座標を表示
  showTileInfo: false,      // タイル情報を表示
  highlightTileOnHover: true // ホバー時にタイルをハイライト
};