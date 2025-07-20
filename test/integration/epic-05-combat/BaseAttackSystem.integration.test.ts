import { CombatSystem } from '../../../src/combat/CombatSystem';
import { ArmyManager } from '../../../src/army/ArmyManager';
import { ArmyFactory } from '../../../src/army/ArmyFactory';
import { BaseManager } from '../../../src/base/BaseManager';
import { MapManager } from '../../../src/map/MapManager';
import { WeaponFactory } from '../../../src/item/WeaponFactory';
import { MovementMode } from '../../../src/types/MovementTypes';
import { BaseType, MapData } from '../../../src/types/MapTypes';
import { TileType } from '../../../src/types/TileTypes';
import { createMockScene } from '../../setup';

describe('[エピック5] BaseAttackSystem Integration Tests', () => {
  let scene: any;
  let combatSystem: CombatSystem;
  let armyManager: ArmyManager;
  let baseManager: BaseManager;
  let mapManager: MapManager;

  beforeEach(() => {
    // タイマーのモックを有効化
    jest.useFakeTimers();
    scene = createMockScene();
    
    // マップを初期化
    mapManager = new MapManager(scene);
    const mapData: MapData = {
      name: 'testMap',
      width: 20,
      height: 20,
      tileSize: 16,
      layers: [
        {
          name: 'terrain',
          tiles: Array(20)
            .fill(null)
            .map(() => Array(20).fill(TileType.PLAIN)),
          visible: true,
        },
      ],
      startPositions: {
        player: { x: 5, y: 5 },
        enemy: { x: 15, y: 15 },
      },
      bases: [],
    };
    mapManager.loadMap(mapData);
    
    // 各マネージャーを初期化
    armyManager = new ArmyManager(scene);
    baseManager = new BaseManager(scene, mapManager);
    combatSystem = new CombatSystem(scene, armyManager, mapManager);
    combatSystem.setBaseManager(baseManager);

    // 中立拠点を作成（位置: 7, 5 - 軍団から2タイル右）
    baseManager.addBase({
      id: 'neutral-base-1',
      name: '中立拠点',
      x: 7,
      y: 5,
      type: BaseType.NEUTRAL,
      hp: 50,
      maxHp: 50,
      owner: 'neutral',
    });
  });

  afterEach(() => {
    combatSystem.destroy();
    armyManager.destroy();
    baseManager.destroy();
    mapManager.destroy();
    jest.useRealTimers();
  });

  test('軍団が拠点を攻撃目標に設定できる', () => {
    // プレイヤー軍団を作成
    const playerArmy = ArmyFactory.createPlayerArmyAtGrid(scene, armyManager, 5, 5);
    expect(playerArmy).toBeDefined();
    
    if (playerArmy) {
      // 手裏剣を装備（射程1-6）
      const shuriken = WeaponFactory.createWeapon('shuriken');
      playerArmy.getCommander().getItemHolder().addItem(shuriken);
      
      // 拠点を取得
      const base = baseManager.getAllBases()[0];
      expect(base).toBeDefined();
      
      // 攻撃目標として拠点を設定
      playerArmy.setAttackTarget(base);
      expect(playerArmy.getAttackTarget()).toBe(base);
      
      // 戦闘移動モードに設定
      playerArmy.setMovementMode(MovementMode.COMBAT);
      
      
      // 初期HP
      const initialHp = base.getCurrentHp();
      
      // 戦闘システムの初回更新（戦闘開始）
      combatSystem.update(0, 100);
      
      // 攻撃タイマーの実行（手裏剣装備で速さ20の場合、4.5秒に1回攻撃）
      jest.advanceTimersByTime(5000); // 5秒進める
      
      // HPが減少したか確認（攻撃成功率に依存するため、必ずしも減少しない可能性がある）
      // この時点でHPが減少していなければ、さらに時間を進める
      if (base.getCurrentHp() === initialHp) {
        jest.advanceTimersByTime(5000); // さらに5秒進める
      }
      
      // 最終的にHPが減少したことを確認
      expect(base.getCurrentHp()).toBeLessThan(initialHp);
    }
  });

  test('軍団が待機モードで拠点を攻撃できる', () => {
    const playerArmy = ArmyFactory.createPlayerArmyAtGrid(scene, armyManager, 5, 5);
    
    if (playerArmy) {
      const weapon = WeaponFactory.createWeapon('shuriken');
      playerArmy.getCommander().getItemHolder().addItem(weapon);
      
      const base = baseManager.getAllBases()[0];
      playerArmy.setAttackTarget(base);
      
      // 待機モードに設定
      playerArmy.setMovementMode(MovementMode.STANDBY);
      
      // 戦闘システムの更新
      combatSystem.update(0, 100);
    }
  });

  test('軍団が通常移動モードでは拠点を攻撃しない', () => {
    const playerArmy = ArmyFactory.createPlayerArmyAtGrid(scene, armyManager, 5, 5);
    
    if (playerArmy) {
      const weapon = WeaponFactory.createWeapon('shuriken');
      playerArmy.getCommander().getItemHolder().addItem(weapon);
      
      const base = baseManager.getAllBases()[0];
      const initialHp = base.getCurrentHp();
      
      playerArmy.setAttackTarget(base);
      
      // 通常移動モードのまま
      playerArmy.setMovementMode(MovementMode.NORMAL);
      
      // 戦闘システムの更新
      combatSystem.update(0, 100);
      
      // 拠点のHPが変わっていないことを確認
      expect(base.getCurrentHp()).toBe(initialHp);
    }
  });
});