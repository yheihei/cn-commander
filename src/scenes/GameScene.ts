import * as Phaser from 'phaser';
import { MapManager } from '../map/MapManager';
import { TileType } from '../types/TileTypes';
import { MapData, BaseType } from '../types/MapTypes';
import { MAP_CONFIG, DEBUG_CONFIG } from '../config/mapConfig';

export class GameScene extends Phaser.Scene {
  private mapManager!: MapManager;
  private cursors!: Phaser.Types.Input.Keyboard.CursorKeys;
  private debugText!: Phaser.GameObjects.Text;
  private isDragging: boolean = false;
  private dragStartX: number = 0;
  private dragStartY: number = 0;
  private cameraStartX: number = 0;
  private cameraStartY: number = 0;
  
  constructor() {
    super({ key: 'GameScene' });
  }

  create(): void {
    // マップマネージャーの初期化
    this.mapManager = new MapManager(this);
    
    // テストマップを読み込むか、デフォルトマップを作成
    const testMapData = this.cache.json.get('testMap');
    if (testMapData) {
      this.mapManager.loadMap(testMapData);
    } else {
      // テストマップがない場合は、小さめのデフォルトマップを作成
      this.createDefaultMap();
    }
    
    // カメラの設定
    this.setupCamera();
    
    // 入力の設定
    this.setupInput();
    
    // デバッグ表示の設定
    this.setupDebugDisplay();
    
    // 初期カメラ位置を設定（プレイヤー開始位置）
    const startPos = this.mapManager.gridToPixel(10, 10);
    this.cameras.main.centerOn(startPos.x, startPos.y);
  }

  private createDefaultMap(): void {
    // 50x50のテストマップを作成（512x512は大きすぎるため）
    const mapSize = 50;
    const tiles: TileType[][] = [];
    
    for (let y = 0; y < mapSize; y++) {
      tiles[y] = [];
      for (let x = 0; x < mapSize; x++) {
        // ランダムに地形を配置
        const rand = Math.random();
        if (rand < 0.7) {
          tiles[y][x] = TileType.PLAIN;
        } else if (rand < 0.9) {
          tiles[y][x] = TileType.FOREST;
        } else {
          tiles[y][x] = TileType.MOUNTAIN;
        }
      }
    }
    
    // 開始位置付近は平地にする
    for (let dy = -3; dy <= 3; dy++) {
      for (let dx = -3; dx <= 3; dx++) {
        const x = 10 + dx;
        const y = 10 + dy;
        if (x >= 0 && x < mapSize && y >= 0 && y < mapSize) {
          tiles[y][x] = TileType.PLAIN;
        }
      }
    }
    
    // 敵開始位置付近も平地にする
    for (let dy = -3; dy <= 3; dy++) {
      for (let dx = -3; dx <= 3; dx++) {
        const x = mapSize - 10 + dx;
        const y = mapSize - 10 + dy;
        if (x >= 0 && x < mapSize && y >= 0 && y < mapSize) {
          tiles[y][x] = TileType.PLAIN;
        }
      }
    }
    
    const mapData: MapData = {
      name: 'testMap',
      width: mapSize,
      height: mapSize,
      tileSize: MAP_CONFIG.tileSize,
      layers: [{
        name: 'terrain',
        tiles: tiles,
        visible: true
      }],
      startPositions: {
        player: { x: 10, y: 10 },
        enemy: { x: mapSize - 10, y: mapSize - 10 }
      },
      bases: [
        {
          id: 'player-hq',
          name: 'プレイヤー本拠地',
          type: BaseType.HEADQUARTERS,
          x: 10,
          y: 10,
          hp: 200,
          maxHp: 200,
          owner: 'player'
        },
        {
          id: 'enemy-hq',
          name: '敵本拠地',
          type: BaseType.HEADQUARTERS,
          x: mapSize - 10,
          y: mapSize - 10,
          hp: 200,
          maxHp: 200,
          owner: 'enemy'
        }
      ]
    };
    
    this.mapManager.loadMap(mapData);
  }

  private setupCamera(): void {
    // カメラの境界を設定
    this.cameras.main.setBounds(
      0, 
      0, 
      this.mapManager.getMapWidthInPixels(), 
      this.mapManager.getMapHeightInPixels()
    );
    
    // カメラのズームを設定（初期値）
    this.cameras.main.setZoom(2);
  }

  private setupInput(): void {
    // キーボード入力
    if (this.input.keyboard) {
      this.cursors = this.input.keyboard.createCursorKeys();
      
      // ズームキー
      this.input.keyboard.on('keydown-Q', () => {
        const currentZoom = this.cameras.main.zoom;
        this.cameras.main.setZoom(Math.max(0.5, currentZoom - 0.25));
      });
      
      this.input.keyboard.on('keydown-E', () => {
        const currentZoom = this.cameras.main.zoom;
        this.cameras.main.setZoom(Math.min(4, currentZoom + 0.25));
      });
      
      // デバッグモード切り替え
      this.input.keyboard.on('keydown-D', () => {
        DEBUG_CONFIG.showTileInfo = !DEBUG_CONFIG.showTileInfo;
      });
    }
    
    // マウスドラッグでカメラ移動
    this.input.on('pointerdown', (pointer: Phaser.Input.Pointer) => {
      if (pointer.rightButtonDown()) {
        this.isDragging = true;
        this.dragStartX = pointer.x;
        this.dragStartY = pointer.y;
        this.cameraStartX = this.cameras.main.scrollX;
        this.cameraStartY = this.cameras.main.scrollY;
      }
    });
    
    this.input.on('pointermove', (pointer: Phaser.Input.Pointer) => {
      if (this.isDragging) {
        const dragX = pointer.x - this.dragStartX;
        const dragY = pointer.y - this.dragStartY;
        this.cameras.main.setScroll(
          this.cameraStartX - dragX,
          this.cameraStartY - dragY
        );
      }
      
      // デバッグ情報の更新
      this.updateDebugInfo(pointer);
    });
    
    this.input.on('pointerup', () => {
      this.isDragging = false;
    });
    
    // マウスホイールでズーム
    this.input.on('wheel', (_pointer: any, _gameObjects: any[], _deltaX: number, deltaY: number) => {
      const currentZoom = this.cameras.main.zoom;
      if (deltaY > 0) {
        this.cameras.main.setZoom(Math.max(0.5, currentZoom - 0.1));
      } else {
        this.cameras.main.setZoom(Math.min(4, currentZoom + 0.1));
      }
    });
  }

  private setupDebugDisplay(): void {
    // デバッグテキスト
    this.debugText = this.add.text(10, 10, '', {
      font: '14px monospace',
      color: '#ffffff',
      backgroundColor: '#000000',
      padding: { x: 5, y: 5 }
    });
    this.debugText.setScrollFactor(0);
    this.debugText.setDepth(1000);
  }

  private updateDebugInfo(pointer: Phaser.Input.Pointer): void {
    if (!DEBUG_CONFIG.showTileInfo) {
      this.debugText.setText('');
      return;
    }
    
    // ワールド座標を取得
    const worldPoint = this.cameras.main.getWorldPoint(pointer.x, pointer.y);
    const gridPos = this.mapManager.pixelToGrid(worldPoint.x, worldPoint.y);
    
    // タイル情報を取得
    const tile = this.mapManager.getTileAt(gridPos.x, gridPos.y);
    const base = this.mapManager.getBaseAt(gridPos.x, gridPos.y);
    
    let debugInfo = `Camera: ${Math.round(this.cameras.main.scrollX)}, ${Math.round(this.cameras.main.scrollY)}\n`;
    debugInfo += `Zoom: ${this.cameras.main.zoom.toFixed(2)}\n`;
    debugInfo += `Grid: ${gridPos.x}, ${gridPos.y}\n`;
    
    if (tile) {
      debugInfo += `Tile: ${tile.getTileType()}\n`;
      const terrain = tile.getTerrainEffect();
      debugInfo += `Move Cost: ${terrain.movementCost}\n`;
      debugInfo += `Def Bonus: ${terrain.defenseBonus}%\n`;
      debugInfo += `Atk Bonus: ${terrain.attackBonus}%\n`;
      debugInfo += `Vision: ${terrain.visionModifier > 0 ? '+' : ''}${terrain.visionModifier}`;
    }
    
    if (base) {
      debugInfo += `\nBase: ${base.name}\n`;
      debugInfo += `Owner: ${base.owner}\n`;
      debugInfo += `HP: ${base.hp}/${base.maxHp}`;
    }
    
    this.debugText.setText(debugInfo);
  }

  update(): void {
    // キーボードでカメラ移動
    const scrollSpeed = 5;
    
    if (this.cursors.left.isDown) {
      this.cameras.main.scrollX -= scrollSpeed;
    }
    if (this.cursors.right.isDown) {
      this.cameras.main.scrollX += scrollSpeed;
    }
    if (this.cursors.up.isDown) {
      this.cameras.main.scrollY -= scrollSpeed;
    }
    if (this.cursors.down.isDown) {
      this.cameras.main.scrollY += scrollSpeed;
    }
  }
}