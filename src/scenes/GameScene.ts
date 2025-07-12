import * as Phaser from 'phaser';
import { MapManager } from '../map/MapManager';
import { TileType } from '../types/TileTypes';
import { MapData, BaseType } from '../types/MapTypes';
import { MAP_CONFIG, DEBUG_CONFIG } from '../config/mapConfig';
import { ArmyManager } from '../army/ArmyManager';
import { ArmyFactory } from '../army/ArmyFactory';
import { Army } from '../army/Army';

export class GameScene extends Phaser.Scene {
  private mapManager!: MapManager;
  private armyManager!: ArmyManager;
  private cursors!: Phaser.Types.Input.Keyboard.CursorKeys;
  private debugText!: Phaser.GameObjects.Text;
  private isDragging: boolean = false;
  private dragStartX: number = 0;
  private dragStartY: number = 0;
  private cameraStartX: number = 0;
  private cameraStartY: number = 0;
  private selectedArmy: Army | null = null;
  
  constructor() {
    super({ key: 'GameScene' });
  }

  create(): void {
    // マップマネージャーの初期化
    this.mapManager = new MapManager(this);
    
    // 軍団マネージャーの初期化
    this.armyManager = new ArmyManager(this);
    
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
    
    // テスト用の軍団を作成
    this.createTestArmies();
    
    // 初期カメラ位置を設定（プレイヤー軍団の中心）
    const cameraX = 10 * 16 + 16;
    const cameraY = 10 * 16 + 16;
    this.cameras.main.centerOn(cameraX, cameraY);
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

  private createTestArmies(): void {
    // 軍団をグリッド座標で配置（各軍団は2x2マスを占有）
    // プレイヤー軍団を作成（グリッド座標10,10から）
    ArmyFactory.createPlayerArmyAtGrid(
      this,
      this.armyManager,
      10,
      10
    );
    
    // 敵軍団を作成（グリッド座標40,40から）
    ArmyFactory.createEnemyArmyAtGrid(
      this,
      this.armyManager,
      40,
      40,
      'normal'
    );
    
    // 追加のテスト軍団（4マス分離れた位置）
    ArmyFactory.createTestArmyAtGrid(
      this,
      this.armyManager,
      14,  // 10 + 4
      14,  // 10 + 4
      'speed'
    );
    
    ArmyFactory.createTestArmyAtGrid(
      this,
      this.armyManager,
      36,  // 40 - 4
      36,  // 40 - 4
      'defense'
    );
    
    console.log(`Created ${this.armyManager.getActiveArmies().length} armies`);
  }

  private setupCamera(): void {
    // カメラの境界を設定
    this.cameras.main.setBounds(
      0, 
      0, 
      this.mapManager.getMapWidthInPixels(), 
      this.mapManager.getMapHeightInPixels()
    );
    
    // カメラのズームを設定（20x20マスが画面に収まるように）
    // 画面サイズ1280x720で、20マス×16px=320pxを表示
    // zoom = min(1280/320, 720/320) = 2.25
    this.cameras.main.setZoom(2.25);
  }

  private setupInput(): void {
    // キーボード入力
    if (this.input.keyboard) {
      this.cursors = this.input.keyboard.createCursorKeys();
      
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
      } else if (pointer.leftButtonDown()) {
        // 左クリックで軍団選択
        const worldPoint = this.cameras.main.getWorldPoint(pointer.x, pointer.y);
        const army = this.armyManager.getArmyAt(worldPoint.x, worldPoint.y);
        
        if (army) {
          this.selectArmy(army);
        } else {
          this.selectArmy(null);
        }
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

  private selectArmy(army: Army | null): void {
    this.selectedArmy = army;
    
    if (army) {
      console.log(`Selected army: ${army.getName()}`);
    } else {
      console.log('Deselected army');
    }
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
    
    // 選択中の軍団情報を表示
    if (this.selectedArmy) {
      debugInfo += `\n\n[Selected Army]\n`;
      debugInfo += `Name: ${this.selectedArmy.getName()}\n`;
      debugInfo += `Members: ${this.selectedArmy.getMemberCount()}\n`;
      debugInfo += `Alive: ${this.selectedArmy.getAliveMembers().length}\n`;
      debugInfo += `Avg Speed: ${this.selectedArmy.getAverageMovementSpeed().toFixed(1)}\n`;
      // 軍団の中心位置をグリッド座標で表示
      const armyGrid = this.mapManager.pixelToGrid(this.selectedArmy.x, this.selectedArmy.y);
      debugInfo += `Grid Pos: ${armyGrid.x}, ${armyGrid.y}`;
    }
    
    this.debugText.setText(debugInfo);
  }

  update(time: number, delta: number): void {
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
    
    // 軍団の更新
    this.armyManager.update(time, delta);
  }
}