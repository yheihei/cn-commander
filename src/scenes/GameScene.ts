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
import { BaseManager } from '../base/BaseManager';
import { CharacterFactory } from '../character/CharacterFactory';
import { ProductionManager } from '../production/ProductionManager';
import { EconomyManager } from '../economy/EconomyManager';
import { InventoryManager } from '../item/InventoryManager';

export class GameScene extends Phaser.Scene {
  private mapManager!: MapManager;
  private armyManager!: ArmyManager;
  private baseManager!: BaseManager;
  private movementManager!: MovementManager;
  private productionManager!: ProductionManager;
  private economyManager!: EconomyManager;
  private inventoryManager!: InventoryManager;
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

    // 拠点マネージャーの初期化（軍団マネージャーより先に初期化）
    this.baseManager = new BaseManager(this, this.mapManager);

    // 軍団マネージャーの初期化（BaseManagerを渡す）
    this.armyManager = new ArmyManager(this, this.baseManager);

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
    this.discoverySystem.onArmyDiscovered = (army, _event) => {
      // 音声がロードされている場合のみ再生
      if (this.cache.audio.exists('enemyFound')) {
        this.sound.play('enemyFound', { volume: 0.25 });
      }

      // 点滅フェードイン演出
      this.playDiscoveryAnimation(army);
    };

    // 戦闘システムの初期化
    this.combatSystem = new CombatSystem(this, this.armyManager, this.mapManager);
    this.combatSystem.setBaseManager(this.baseManager);

    // テストマップを読み込むか、デフォルトマップを作成
    const testMapData = this.cache.json.get('testMap');
    if (testMapData) {
      this.mapManager.loadMap(testMapData);
      // マップデータから拠点を読み込み
      if (testMapData.bases) {
        testMapData.bases.forEach((baseData: any) => {
          this.baseManager.addBase(baseData);
        });
      }
    } else {
      // テストマップがない場合は、小さめのデフォルトマップを作成
      this.createDefaultMap();
    }

    // 経済マネージャーの初期化
    this.economyManager = new EconomyManager(this);

    // インベントリマネージャーの初期化
    this.inventoryManager = new InventoryManager(this);

    // 生産マネージャーの初期化
    this.productionManager = new ProductionManager(this);
    this.productionManager.setEconomyManager(this.economyManager);
    this.productionManager.setInventoryManager(this.inventoryManager);

    // カメラの設定（UIManagerより先に実行）
    this.setupCamera();

    // UIマネージャーの初期化（カメラ設定後、ProductionManager初期化後）
    this.uiManager = new UIManager(this, this.productionManager, this.baseManager);

    // 入力ハンドラーの初期化
    this.inputHandler = new MovementInputHandler(
      this,
      this.armyManager,
      this.mapManager,
      this.baseManager,
      this.commandSystem,
      this.uiManager,
      this.visionSystem,
    );

    // 入力の設定
    this.setupInput();

    // デバッグ表示の設定
    this.setupDebugDisplay();

    // テスト用の軍団を作成
    this.createTestArmies();

    // テスト用の待機兵士を追加
    this.createTestWaitingSoldiers();

    // テスト用の倉庫アイテムを初期化
    this.baseManager.initializeWarehouse();

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

    // テスト用中立拠点の周辺も平地にする
    for (let dy = -2; dy <= 2; dy++) {
      for (let dx = -2; dx <= 2; dx++) {
        const x = 15 + dx;
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
          id: 'test-neutral-base',
          name: 'テスト中立拠点',
          type: BaseType.NEUTRAL,
          x: 15,
          y: 10,
          hp: 0, // HP0にして占領可能な状態にする
          maxHp: 80,
          owner: 'neutral',
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

    // 拠点の配置
    mapData.bases.forEach((baseData) => {
      this.baseManager.addBase(baseData);
    });
  }

  private createTestArmies(): void {
    // 軍団をグリッド座標で配置（各軍団は2x2マスを占有）
    // プレイヤー軍団を作成（グリッド座標10,10から）
    const playerArmy = ArmyFactory.createPlayerArmyAtGrid(this, this.armyManager, 5, 7);

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
    }

    // プレイヤー軍団2
    ArmyFactory.createPlayerArmyAtGrid(this, this.armyManager, 2, 7);

    // 医療施設テスト用：HPが減った駐留軍団を作成
    const testGarrisonArmy = ArmyFactory.createPlayerArmyAtGrid(this, this.armyManager, 8, 5);
    if (testGarrisonArmy) {
      // 軍団のメンバーのHPを減らす
      const allMembers = [testGarrisonArmy.getCommander(), ...testGarrisonArmy.getSoldiers()];
      allMembers.forEach((member) => {
        // 各メンバーのHPを50%に減らす
        const maxHp = member.getMaxHP();
        const newHp = Math.floor(maxHp * 0.5);
        const damage = maxHp - newHp;

        // ダメージを与えてHPを減らす
        member.takeDamage(damage);

        console.log(`${member.getName()}のHPを${maxHp}から${member.getCurrentHP()}に減らしました`);
      });

      // 軍団を拠点に駐留させる
      const playerBase = this.baseManager.getBase('player-hq');
      if (playerBase) {
        // 駐留を実行
        this.baseManager.addStationedArmy('player-hq', testGarrisonArmy);
        testGarrisonArmy.setVisible(false);

        console.log(`HPが減った軍団（ID: ${testGarrisonArmy.getId()}）を拠点に駐留させました`);
      }
    }

    // 敵軍団を視界外に配置（視界テスト用）
    // 咲耶軍団の視界は約8マス程度なので、18,10に配置（8マス離れた位置）
    ArmyFactory.createEnemyArmyAtGrid(this, this.armyManager, 20, 10, 'normal');

    // 追加の敵軍団（さらに離れた位置）
    ArmyFactory.createEnemyArmyAtGrid(this, this.armyManager, 25, 10, 'hard');

    // 全軍団を取得して初期表示状態を設定
    const allArmies = this.armyManager.getAllArmies();
    allArmies.forEach((army) => {
      this.discoverySystem.initializeArmyVisibility(army);
    });

    // テストシナリオ: 咲耶軍団を東（右）に移動させて敵軍団を発見してください
  }

  private createTestWaitingSoldiers(): void {
    // プレイヤー本拠地に待機兵士を追加
    const baseId = 'player-hq'; // createDefaultMapで作成された拠点IDを使用

    // 待機兵士を作成
    const waitingSoldiers = [
      CharacterFactory.createCharacter(this, 0, 0, 'wind', 'ミタマ', {
        hp: 30,
        maxHp: 30,
        attack: 20,
        defense: 10,
        speed: 20,
        moveSpeed: 13,
        sight: 8,
      }),
      CharacterFactory.createCharacter(this, 0, 0, 'iron', 'リーリー', {
        hp: 50,
        maxHp: 50,
        attack: 15,
        defense: 25,
        speed: 15,
        moveSpeed: 8,
        sight: 6,
      }),
      CharacterFactory.createCharacter(this, 0, 0, 'shadow', 'オロチ', {
        hp: 35,
        maxHp: 35,
        attack: 30,
        defense: 12,
        speed: 25,
        moveSpeed: 12,
        sight: 11,
      }),
      CharacterFactory.createCharacter(this, 0, 0, 'medicine', 'ルナ', {
        hp: 40,
        maxHp: 40,
        attack: 12,
        defense: 15,
        speed: 18,
        moveSpeed: 10,
        sight: 9,
      }),
      CharacterFactory.createCharacter(this, 0, 0, 'wind', 'ナルカミ', {
        hp: 28,
        maxHp: 28,
        attack: 18,
        defense: 9,
        speed: 22,
        moveSpeed: 14,
        sight: 8,
      }),
      CharacterFactory.createCharacter(this, 0, 0, 'wind', 'ナルカミ2', {
        hp: 28,
        maxHp: 28,
        attack: 18,
        defense: 9,
        speed: 22,
        moveSpeed: 14,
        sight: 8,
      }),
    ];

    // BaseManagerに待機兵士を追加
    waitingSoldiers.forEach((soldier) => {
      this.baseManager.addWaitingSoldier(baseId, soldier);
      // 見えないように非表示にする
      soldier.setVisible(false);
    });

    console.log(`待機兵士${waitingSoldiers.length}名を拠点「${baseId}」に追加しました`);
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

    // ピクセルパーフェクトレンダリング
    this.cameras.main.roundPixels = true;
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

    // 拠点の更新
    this.baseManager.update(delta);

    // 移動システムの更新
    this.movementManager.update(time, delta);

    // 視界・発見システムの更新
    this.updateVisionAndDiscovery();

    // 戦闘システムの更新
    this.combatSystem.update(time, delta);

    // 生産システムの更新（deltaをミリ秒から秒に変換）
    this.productionManager.update(delta / 1000);

    // UIシステムの更新
    this.uiManager.update();
  }

  private updateVisionAndDiscovery(): void {
    // 視界キャッシュをクリア（フレームごとに最新の視界を計算）
    this.visionSystem.clearVisionCache();

    // 全軍団を取得
    const allArmies = this.armyManager.getAllArmies();

    // プレイヤー軍団と敵軍団を分離
    const playerArmies = allArmies.filter((army) => army.isPlayerArmy());
    const enemyArmies = allArmies.filter((army) => army.isEnemyArmy());

    // 発見チェック（視界共有を考慮）
    this.discoverySystem.checkDiscovery(playerArmies, enemyArmies);
  }

  /**
   * 敵軍団発見時の点滅フェードイン演出を再生
   */
  private playDiscoveryAnimation(army: Army): void {
    // 軍団を表示（演出のため初期透明度0）
    army.setAlpha(0);
    army.setVisible(true);

    // 点滅しながらフェードインする演出
    const blinkCount = 3;
    const blinkDuration = 150; // 各点滅の時間（ミリ秒）
    const fadeInDuration = 300; // 最終フェードインの時間

    // 点滅アニメーション
    let currentBlink = 0;
    const blinkTimer = this.time.addEvent({
      delay: blinkDuration,
      callback: () => {
        // 偶数回は表示、奇数回は非表示
        army.setAlpha(currentBlink % 2 === 0 ? 0.6 : 0);
        currentBlink++;

        // 点滅が終了したら最終フェードイン
        if (currentBlink >= blinkCount * 2) {
          blinkTimer.remove();

          // 最終的なフェードイン
          this.tweens.add({
            targets: army,
            alpha: 1,
            duration: fadeInDuration,
            ease: 'Power2',
          });
        }
      },
      repeat: blinkCount * 2 - 1,
    });
  }
}
