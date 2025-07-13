import * as Phaser from 'phaser';
import { MapManager } from '../map/MapManager';
import { TileType } from '../types/TileTypes';
import { MapData, BaseType } from '../types/MapTypes';
import { MAP_CONFIG, DEBUG_CONFIG } from '../config/mapConfig';
import { ArmyManager } from '../army/ArmyManager';
import { ArmyFactory } from '../army/ArmyFactory';
import { Army } from '../army/Army';
import { MovementManager } from '../movement/MovementManager';
import { UIManager } from '../ui/UIManager';
import { MovementInputHandler } from '../input/MovementInputHandler';
import { MovementCommandSystem } from '../movement/MovementCommand';
import { VisionSystem } from '../vision/VisionSystem';
import { DiscoverySystem } from '../vision/DiscoverySystem';
import { WeaponFactory } from '../item/WeaponFactory';
import { CombatSystem } from '../combat/CombatSystem';

export class GameScene extends Phaser.Scene {
  private mapManager!: MapManager;
  private armyManager!: ArmyManager;
  private movementManager!: MovementManager;
  private uiManager!: UIManager;
  private inputHandler!: MovementInputHandler;
  private commandSystem!: MovementCommandSystem;
  private visionSystem!: VisionSystem;
  private discoverySystem!: DiscoverySystem;
  private combatSystem!: CombatSystem;
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

    // 軍団マネージャーの初期化
    this.armyManager = new ArmyManager(this);

    // 移動コマンドシステムの初期化
    this.commandSystem = new MovementCommandSystem();

    // 移動マネージャーの初期化
    this.movementManager = new MovementManager(
      this,
      this.armyManager,
      this.mapManager,
      this.commandSystem,
    );

    // 視界システムの初期化
    this.visionSystem = new VisionSystem(this.mapManager);

    // 発見システムの初期化
    this.discoverySystem = new DiscoverySystem(this.visionSystem);
    this.discoverySystem.onArmyDiscovered = (_army, _event) => {
      // 敵軍団発見時のイベント処理（デバッグ表示で確認可能）
      // console.log(`敵軍団を発見: ${_army.getName()} at (${_event.position.x}, ${_event.position.y})`);
    };

    // 戦闘システムの初期化
    this.combatSystem = new CombatSystem(this, this.armyManager, this.mapManager);

    // UIマネージャーの初期化
    this.uiManager = new UIManager(this);

    // 入力ハンドラーの初期化
    this.inputHandler = new MovementInputHandler(
      this,
      this.armyManager,
      this.mapManager,
      this.commandSystem,
      this.uiManager,
    );

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
      layers: [
        {
          name: 'terrain',
          tiles,
          visible: true,
        },
      ],
      startPositions: {
        player: { x: 10, y: 10 },
        enemy: { x: mapSize - 10, y: mapSize - 10 },
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
          owner: 'player',
        },
        {
          id: 'enemy-hq',
          name: '敵本拠地',
          type: BaseType.HEADQUARTERS,
          x: mapSize - 10,
          y: mapSize - 10,
          hp: 200,
          maxHp: 200,
          owner: 'enemy',
        },
      ],
    };

    this.mapManager.loadMap(mapData);
  }

  private createTestArmies(): void {
    // 軍団をグリッド座標で配置（各軍団は2x2マスを占有）
    // プレイヤー軍団を作成（グリッド座標10,10から）
    const playerArmy = ArmyFactory.createPlayerArmyAtGrid(this, this.armyManager, 10, 10);

    // プレイヤー軍団の全メンバーに武器を持たせる
    if (playerArmy) {
      const allMembers = [playerArmy.getCommander(), ...playerArmy.getSoldiers()];
      allMembers.forEach((member, index) => {
        const itemHolder = member.getItemHolder();

        // 手裏剣を追加
        const shuriken = WeaponFactory.createWeapon('shuriken');
        itemHolder.addItem(shuriken);

        // 指揮官（咲耶）と薬忍には忍者刀も追加
        if (index === 0 || member.getJobType() === 'medicine') {
          const sword = WeaponFactory.createWeapon('ninja_sword');
          itemHolder.addItem(sword);
          // 忍者刀の方が攻撃力が高いので自動装備される
        }
      });

      // デバッグ用：装備状況はデバッグ表示（Dキー）で確認可能
      // allMembers.forEach((member) => {
      //   const itemHolder = member.getItemHolder();
      //   const equipped = itemHolder.getEquippedWeapon();
      //   const allWeapons = itemHolder.getWeapons();
      //   console.log(`  ${member.getName()} (${member.getJobType()}):`);
      //   console.log(
      //     `    装備中: ${equipped ? `${equipped.name} (攻撃力+${equipped.attackBonus})` : '装備なし'}`,
      //   );
      //   console.log(`    所持武器: ${allWeapons.map((w: IWeapon) => w.name).join(', ')}`);
      // });
    }

    // 敵軍団を視界外に配置（視界テスト用）
    // 咲耶軍団の視界は約8マス程度なので、18,10に配置（8マス離れた位置）
    ArmyFactory.createEnemyArmyAtGrid(this, this.armyManager, 18, 10, 'normal');

    // 追加の敵軍団（さらに離れた位置）
    ArmyFactory.createEnemyArmyAtGrid(this, this.armyManager, 25, 10, 'hard');

    // 全軍団を取得して初期表示状態を設定
    const allArmies = this.armyManager.getAllArmies();
    allArmies.forEach((army) => {
      this.discoverySystem.initializeArmyVisibility(army);
    });

    // テストシナリオ: 咲耶軍団を東（右）に移動させて敵軍団を発見してください
  }

  private setupCamera(): void {
    // カメラの境界を設定
    this.cameras.main.setBounds(
      0,
      0,
      this.mapManager.getMapWidthInPixels(),
      this.mapManager.getMapHeightInPixels(),
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

    // マウスドラッグでカメラ移動（右ドラッグのみ処理）
    this.input.on('pointerdown', (pointer: Phaser.Input.Pointer) => {
      if (pointer.rightButtonDown()) {
        this.isDragging = true;
        this.dragStartX = pointer.x;
        this.dragStartY = pointer.y;
        this.cameraStartX = this.cameras.main.scrollX;
        this.cameraStartY = this.cameras.main.scrollY;
      }
      // 左クリックはMovementInputHandlerで処理するため、ここでは何もしない
    });

    this.input.on('pointermove', (pointer: Phaser.Input.Pointer) => {
      if (this.isDragging) {
        const dragX = pointer.x - this.dragStartX;
        const dragY = pointer.y - this.dragStartY;
        this.cameras.main.setScroll(this.cameraStartX - dragX, this.cameraStartY - dragY);
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
      padding: { x: 5, y: 5 },
    });
    this.debugText.setScrollFactor(0);
    this.debugText.setDepth(1000);
  }

  private getSelectedArmy(): Army | null {
    return this.inputHandler.getSelectedArmy();
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
    const selectedArmy = this.getSelectedArmy();
    if (selectedArmy) {
      debugInfo += `\n\n[Selected Army]\n`;
      debugInfo += `Name: ${selectedArmy.getName()}\n`;
      debugInfo += `Owner: ${selectedArmy.getOwner()}\n`;
      debugInfo += `Members: ${selectedArmy.getMemberCount()}\n`;
      debugInfo += `Alive: ${selectedArmy.getAliveMembers().length}\n`;
      debugInfo += `Avg Speed: ${selectedArmy.getAverageMovementSpeed().toFixed(1)}\n`;

      // 視界情報
      const visionAreas = this.visionSystem.calculateVision(selectedArmy);
      if (visionAreas.length > 0) {
        debugInfo += `\nVision Ranges:\n`;
        visionAreas.forEach((area, index) => {
          debugInfo += `  Member ${index + 1}: ${area.effectiveRange} マス\n`;
        });
      }

      // 軍団の中心位置をグリッド座標で表示
      const armyGrid = this.mapManager.pixelToGrid(selectedArmy.x, selectedArmy.y);
      debugInfo += `Grid Pos: ${armyGrid.x}, ${armyGrid.y}\n`;

      // 装備情報
      debugInfo += `\nEquipment:\n`;
      const allMembers = [selectedArmy.getCommander(), ...selectedArmy.getSoldiers()];
      allMembers.forEach((member) => {
        const equipped = member.getItemHolder().getEquippedWeapon();
        if (equipped) {
          debugInfo += `  ${member.getName()}: ${equipped.name} (耐久${equipped.durability}/${equipped.maxDurability})\n`;
        }
      });
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

    // 移動システムの更新
    this.movementManager.update(time, delta);

    // 視界・発見システムの更新
    this.updateVisionAndDiscovery();

    // 戦闘システムの更新
    this.combatSystem.update(time, delta);
  }

  private updateVisionAndDiscovery(): void {
    // 全軍団を取得
    const allArmies = this.armyManager.getAllArmies();

    // プレイヤー軍団と敵軍団を分離
    const playerArmies = allArmies.filter((army) => army.isPlayerArmy());
    const enemyArmies = allArmies.filter((army) => army.isEnemyArmy());

    // 発見チェック
    this.discoverySystem.checkDiscovery(playerArmies, enemyArmies);
  }
}
