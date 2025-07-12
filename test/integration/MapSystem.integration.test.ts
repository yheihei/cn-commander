import { MapManager } from '../../src/map/MapManager';
import { MapTile } from '../../src/map/MapTile';
import { TileType, TERRAIN_EFFECTS } from '../../src/types/TileTypes';
import { MapData, BaseType } from '../../src/types/MapTypes';
import { createMockScene } from '../setup';

// テストデータのインポート
import validMapData from '../fixtures/validMap.json';

describe('MapSystem Integration Tests', () => {
  let scene: any;  // テストではany型を使用
  let mapManager: MapManager;

  beforeEach(() => {
    scene = createMockScene();
    mapManager = new MapManager(scene);
  });

  afterEach(() => {
    if (mapManager) {
      mapManager.destroy();
    }
  });

  describe('マップ生成と読み込み', () => {
    test('正常なJSONマップデータから完全なマップを生成できる', () => {
      // Act
      mapManager.loadMap(validMapData as MapData);

      // Assert
      expect(mapManager.getMapWidth()).toBe(10);
      expect(mapManager.getMapHeight()).toBe(10);
      
      // すべてのタイルが正しく生成されているか確認
      for (let y = 0; y < 10; y++) {
        for (let x = 0; x < 10; x++) {
          const tile = mapManager.getTileAt(x, y);
          expect(tile).toBeDefined();
          expect(tile).toBeInstanceOf(MapTile);
        }
      }
    });

    test('地形タイプが正しく設定される', () => {
      // Arrange
      mapManager.loadMap(validMapData as MapData);

      // Act & Assert
      // 特定の座標の地形タイプを確認
      const plainTile = mapManager.getTileAt(0, 0);
      const forestTile = mapManager.getTileAt(2, 0);
      const mountainTile = mapManager.getTileAt(4, 0);

      expect(plainTile?.getTileType()).toBe(TileType.PLAIN);
      expect(forestTile?.getTileType()).toBe(TileType.FOREST);
      expect(mountainTile?.getTileType()).toBe(TileType.MOUNTAIN);
    });

    test('拠点が正しい位置に配置される', () => {
      // Arrange
      mapManager.loadMap(validMapData as MapData);

      // Act
      const bases = mapManager.getBases();
      const playerHQ = mapManager.getBaseAt(1, 1);
      const enemyHQ = mapManager.getBaseAt(8, 8);
      const neutralBase = mapManager.getBaseAt(5, 5);

      // Assert
      expect(bases).toHaveLength(3);
      expect(playerHQ).toBeDefined();
      expect(playerHQ?.type).toBe(BaseType.HEADQUARTERS);
      expect(playerHQ?.owner).toBe('player');
      
      expect(enemyHQ).toBeDefined();
      expect(enemyHQ?.type).toBe(BaseType.HEADQUARTERS);
      expect(enemyHQ?.owner).toBe('enemy');
      
      expect(neutralBase).toBeDefined();
      expect(neutralBase?.type).toBe(BaseType.NORMAL_BASE);
      expect(neutralBase?.owner).toBe('neutral');
    });
  });

  describe('座標システムの統合動作', () => {
    test('グリッド座標とピクセル座標の変換が一貫している', () => {
      // Arrange
      mapManager.createEmptyMap(20, 20);
      const testPoints = [
        { gridX: 0, gridY: 0 },
        { gridX: 5, gridY: 5 },
        { gridX: 10, gridY: 10 },
        { gridX: 19, gridY: 19 }
      ];

      testPoints.forEach(point => {
        // Act
        const pixel = mapManager.gridToPixel(point.gridX, point.gridY);
        const grid = mapManager.pixelToGrid(pixel.x, pixel.y);

        // Assert
        expect(grid.x).toBe(point.gridX);
        expect(grid.y).toBe(point.gridY);
      });
    });

    test('マップ境界チェックが正しく機能する', () => {
      // Arrange
      mapManager.createEmptyMap(10, 10);

      // Act & Assert
      // 境界内
      expect(mapManager.getTileAt(0, 0)).toBeDefined();
      expect(mapManager.getTileAt(9, 9)).toBeDefined();
      
      // 境界外
      expect(mapManager.getTileAt(-1, 0)).toBeNull();
      expect(mapManager.getTileAt(0, -1)).toBeNull();
      expect(mapManager.getTileAt(10, 0)).toBeNull();
      expect(mapManager.getTileAt(0, 10)).toBeNull();
    });

    test('ピクセル座標からのタイル取得が正しく動作する', () => {
      // Arrange
      mapManager.createEmptyMap(10, 10);

      // Act
      const tile1 = mapManager.getTileAtPixel(8, 8);    // (0, 0)のタイル中心
      const tile2 = mapManager.getTileAtPixel(24, 24);  // (1, 1)のタイル中心
      const tile3 = mapManager.getTileAtPixel(15, 15);  // (0, 0)のタイル右下

      // Assert
      expect(tile1?.getGridPosition()).toEqual({ x: 0, y: 0 });
      expect(tile2?.getGridPosition()).toEqual({ x: 1, y: 1 });
      expect(tile3?.getGridPosition()).toEqual({ x: 0, y: 0 });
    });
  });

  describe('レイヤーシステムの動作', () => {
    test('複数レイヤーの管理と表示制御', () => {
      // Arrange
      const multiLayerMap: MapData = {
        ...validMapData as MapData,
        layers: [
          {
            name: 'terrain',
            visible: true,
            tiles: Array(5).fill(null).map(() => 
              Array(5).fill(TileType.PLAIN)
            )
          },
          {
            name: 'overlay',
            visible: false,
            tiles: Array(5).fill(null).map(() => 
              Array(5).fill(TileType.FOREST)
            )
          }
        ]
      };

      // Act
      mapManager.loadMap(multiLayerMap);

      // Assert
      const terrainLayer = mapManager.getLayer('terrain');
      const overlayLayer = mapManager.getLayer('overlay');
      
      expect(terrainLayer).toBeDefined();
      expect(terrainLayer?.isVisible()).toBe(true);
      
      expect(overlayLayer).toBeDefined();
      expect(overlayLayer?.isVisible()).toBe(false);

      // レイヤーの表示切り替え
      mapManager.setLayerVisible('overlay', true);
      expect(overlayLayer?.isVisible()).toBe(true);
    });

    test('異なるレイヤーから正しくタイルを取得できる', () => {
      // Arrange
      const multiLayerMap: MapData = {
        ...validMapData as MapData,
        width: 3,
        height: 3,
        layers: [
          {
            name: 'terrain',
            visible: true,
            tiles: [
              [TileType.PLAIN, TileType.PLAIN, TileType.PLAIN],
              [TileType.PLAIN, TileType.PLAIN, TileType.PLAIN],
              [TileType.PLAIN, TileType.PLAIN, TileType.PLAIN]
            ]
          },
          {
            name: 'features',
            visible: true,
            tiles: [
              [TileType.FOREST, TileType.FOREST, TileType.FOREST],
              [TileType.FOREST, TileType.FOREST, TileType.FOREST],
              [TileType.FOREST, TileType.FOREST, TileType.FOREST]
            ]
          }
        ]
      };

      mapManager.loadMap(multiLayerMap);

      // Act & Assert
      const terrainTile = mapManager.getTileAt(1, 1, 'terrain');
      const featureTile = mapManager.getTileAt(1, 1, 'features');

      expect(terrainTile?.getTileType()).toBe(TileType.PLAIN);
      expect(featureTile?.getTileType()).toBe(TileType.FOREST);
    });
  });

  describe('地形効果システム', () => {
    test('各地形タイプから正しい効果値を取得できる', () => {
      // Arrange
      mapManager.loadMap(validMapData as MapData);

      // Act
      const plainTile = mapManager.getTileAt(0, 0);
      const forestTile = mapManager.getTileAt(2, 0);
      const mountainTile = mapManager.getTileAt(4, 0);

      // Assert
      expect(plainTile?.getTerrainEffect()).toEqual(TERRAIN_EFFECTS[TileType.PLAIN]);
      expect(forestTile?.getTerrainEffect()).toEqual(TERRAIN_EFFECTS[TileType.FOREST]);
      expect(mountainTile?.getTerrainEffect()).toEqual(TERRAIN_EFFECTS[TileType.MOUNTAIN]);

      // 具体的な値の確認
      expect(plainTile?.getTerrainEffect().movementCost).toBe(1.0);
      expect(forestTile?.getTerrainEffect().defenseBonus).toBe(20);
      expect(mountainTile?.getTerrainEffect().visionModifier).toBe(3);
    });

    test('複数のタイルで地形効果が一貫している', () => {
      // Arrange
      mapManager.createEmptyMap(10, 10, TileType.FOREST);

      // Act & Assert
      // ランダムな位置の森林タイルをチェック
      const positions = [[0, 0], [5, 5], [9, 9]];
      positions.forEach(([x, y]) => {
        const tile = mapManager.getTileAt(x, y);
        expect(tile?.getTerrainEffect().movementCost).toBe(1.5);
        expect(tile?.getTerrainEffect().defenseBonus).toBe(20);
        expect(tile?.getTerrainEffect().attackBonus).toBe(-10);
        expect(tile?.getTerrainEffect().visionModifier).toBe(-2);
      });
    });
  });

  describe('大規模マップテスト', () => {
    test('100x100のマップを生成できる', () => {
      // Arrange
      const startTime = Date.now();

      // Act
      mapManager.createEmptyMap(100, 100);
      const endTime = Date.now();

      // Assert
      expect(mapManager.getMapWidth()).toBe(100);
      expect(mapManager.getMapHeight()).toBe(100);
      expect(mapManager.getMapWidthInPixels()).toBe(100 * 16);
      expect(mapManager.getMapHeightInPixels()).toBe(100 * 16);

      // パフォーマンス確認（3秒以内に生成完了）
      expect(endTime - startTime).toBeLessThan(3000);
    });

    test('マップでのタイル取得が高速に動作する', () => {
      // Arrange
      mapManager.createEmptyMap(50, 50);
      const iterations = 1000;
      const startTime = Date.now();

      // Act
      for (let i = 0; i < iterations; i++) {
        const x = Math.floor(Math.random() * 50);
        const y = Math.floor(Math.random() * 50);
        const tile = mapManager.getTileAt(x, y);
        expect(tile).toBeDefined();
      }

      const endTime = Date.now();
      const timePerAccess = (endTime - startTime) / iterations;

      // Assert - 1アクセスあたり1ms未満
      expect(timePerAccess).toBeLessThan(1);
    });
  });

  describe('エラーハンドリング', () => {
    test('不正な地形タイプを含むマップデータの処理', () => {
      // Arrange
      const invalidTileMap: MapData = {
        ...validMapData as MapData,
        width: 3,
        height: 3,
        layers: [{
          name: 'terrain',
          visible: true,
          tiles: [
            ['plain', 'invalid_type' as any, 'forest'],
            ['plain', 'plain', 'plain'],
            ['plain', 'plain', 'plain']
          ]
        }]
      };

      // Act & Assert
      // エラーが発生せずに処理されることを確認
      expect(() => mapManager.loadMap(invalidTileMap)).not.toThrow();
      
      // 不正なタイルはデフォルト値で処理される
      const tile = mapManager.getTileAt(1, 0);
      expect(tile).toBeDefined();
    });

    test('マップサイズの不整合を検出する', () => {
      // Arrange
      const inconsistentMap: MapData = {
        ...validMapData as MapData,
        width: 5,
        height: 5,
        layers: [{
          name: 'terrain',
          visible: true,
          tiles: [
            [TileType.PLAIN, TileType.PLAIN],  // 幅が不足
            [TileType.PLAIN, TileType.PLAIN, TileType.PLAIN],
            [TileType.PLAIN]  // 幅が不足
          ]  // 高さが不足
        }]
      };

      // Act & Assert
      expect(() => mapManager.loadMap(inconsistentMap)).not.toThrow();
    });

    test('範囲外のアクセスを安全に処理する', () => {
      // Arrange
      mapManager.createEmptyMap(10, 10);

      // Act & Assert
      expect(mapManager.getTileAt(-1, 5)).toBeNull();
      expect(mapManager.getTileAt(5, -1)).toBeNull();
      expect(mapManager.getTileAt(10, 5)).toBeNull();
      expect(mapManager.getTileAt(5, 10)).toBeNull();
      expect(mapManager.getTileAt(100, 100)).toBeNull();
    });
  });

  describe('実使用シナリオ', () => {
    test('マップ上の2点間の情報を取得できる', () => {
      // Arrange
      mapManager.loadMap(validMapData as MapData);
      const start = { x: 1, y: 1 };
      const end = { x: 8, y: 8 };

      // Act
      const startTile = mapManager.getTileAt(start.x, start.y);
      const endTile = mapManager.getTileAt(end.x, end.y);
      const startBase = mapManager.getBaseAt(start.x, start.y);
      const endBase = mapManager.getBaseAt(end.x, end.y);

      // Assert
      expect(startTile).toBeDefined();
      expect(endTile).toBeDefined();
      expect(startBase?.owner).toBe('player');
      expect(endBase?.owner).toBe('enemy');
    });

    test('特定範囲内のタイルを取得できる', () => {
      // Arrange
      mapManager.loadMap(validMapData as MapData);
      const centerX = 5;
      const centerY = 5;
      const range = 2;

      // Act
      const tilesInRange: MapTile[] = [];
      for (let dx = -range; dx <= range; dx++) {
        for (let dy = -range; dy <= range; dy++) {
          const tile = mapManager.getTileAt(centerX + dx, centerY + dy);
          if (tile) {
            tilesInRange.push(tile);
          }
        }
      }

      // Assert
      expect(tilesInRange).toHaveLength(25); // 5x5の範囲
      
      // 中心の拠点を確認
      const centerBase = mapManager.getBaseAt(centerX, centerY);
      expect(centerBase).toBeDefined();
      expect(centerBase?.type).toBe(BaseType.NORMAL_BASE);
    });

    test('拠点周辺のタイル情報を確認できる', () => {
      // Arrange
      mapManager.loadMap(validMapData as MapData);
      const bases = mapManager.getBases();

      bases.forEach(base => {
        // Act
        const adjacentTiles: MapTile[] = [];
        const directions = [[-1, 0], [1, 0], [0, -1], [0, 1]];
        
        directions.forEach(([dx, dy]) => {
          const tile = mapManager.getTileAt(base.x + dx, base.y + dy);
          if (tile) {
            adjacentTiles.push(tile);
          }
        });

        // Assert
        expect(adjacentTiles.length).toBeGreaterThan(0);
        adjacentTiles.forEach(tile => {
          expect(tile.isWalkable()).toBe(true);
        });
      });
    });
  });
});