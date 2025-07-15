import { createMockScene } from '../../setup';
import { VisionSystem } from '../../../src/vision/VisionSystem';
import { DiscoverySystem } from '../../../src/vision/DiscoverySystem';
import { MapManager } from '../../../src/map/MapManager';
import { ArmyManager } from '../../../src/army/ArmyManager';
import { ArmyFactory } from '../../../src/army/ArmyFactory';
import { Army } from '../../../src/army/Army';
import { CharacterFactory } from '../../../src/character/CharacterFactory';
import { MovementMode } from '../../../src/types/MovementTypes';

describe('[エピック6] 視界共有システム統合テスト', () => {
  let scene: any;
  let mapManager: MapManager;
  let armyManager: ArmyManager;
  let visionSystem: VisionSystem;
  let discoverySystem: DiscoverySystem;

  beforeEach(() => {
    scene = createMockScene();
    
    // マップマネージャーの初期化（100x100のテストマップ）
    mapManager = new MapManager(scene);
    mapManager.createEmptyMap(100, 100);
    
    // 軍団マネージャーの初期化
    armyManager = new ArmyManager(scene);
    
    // システムの初期化
    visionSystem = new VisionSystem(mapManager);
    discoverySystem = new DiscoverySystem(visionSystem);
    
    // 発見情報をリセット
    discoverySystem.resetDiscoveries();
  });

  afterEach(() => {
    armyManager.destroy();
    mapManager.destroy();
  });

  describe('勢力視界共有', () => {
    test('同一勢力の複数軍団で視界を共有する', () => {
      // プレイヤー軍団を2つ作成
      const playerArmy1 = ArmyFactory.createPlayerArmyAtGrid(
        scene,
        armyManager,
        12,
        12
      );

      // 視界の広い影忍を含む軍団を作成
      const commander2 = CharacterFactory.createCommander(scene, 0, 0, 'shadow', '偵察隊長');
      const playerArmy2 = armyManager.createArmyAtGrid(commander2, 37, 37, 'player');

      // 敵軍団を作成（軍団2の視界内）
      const enemyArmy = ArmyFactory.createEnemyArmyAtGrid(
        scene,
        armyManager,
        40,
        40
      );

      // nullチェック
      if (!playerArmy1 || !playerArmy2 || !enemyArmy) {
        throw new Error('Failed to create armies');
      }

      // 共有視界データを取得
      const sharedVision = visionSystem.getSharedVisionForFaction(
        'player',
        [playerArmy1, playerArmy2]
      );

      // 視界タイルが統合されていることを確認
      expect(sharedVision.visibleTiles.size).toBeGreaterThan(100); // 複数軍団分の視界

      // 軍団1単独では敵が見えない
      expect(visionSystem.canSeeArmy(playerArmy1, enemyArmy)).toBe(false);

      // 軍団2単独では敵が見える（影忍なので視界が広い）
      expect(visionSystem.canSeeArmy(playerArmy2, enemyArmy)).toBe(true);

      // 勢力視界では敵が見える（共有）
      expect(visionSystem.isVisibleByFaction(
        enemyArmy,
        'player',
        [playerArmy1, playerArmy2]
      )).toBe(true);
    });

    test('視界共有による発見メカニクス', () => {
      // プレイヤー軍団を2つ作成
      const playerArmies: Army[] = [];
      
      // 視界の広い影忍軍団
      const commander1 = CharacterFactory.createCommander(scene, 0, 0, 'shadow', '偵察隊長');
      const army1 = armyManager.createArmyAtGrid(commander1, 6, 6, 'player');
      if (army1) playerArmies.push(army1);

      const army2 = ArmyFactory.createPlayerArmyAtGrid(
        scene,
        armyManager,
        50,
        50
      );
      if (army2) playerArmies.push(army2);

      // 敵軍団を作成（偵察隊長の視界内）
      const enemyArmy = ArmyFactory.createEnemyArmyAtGrid(
        scene,
        armyManager,
        11,
        11
      );

      if (!enemyArmy) {
        throw new Error('Failed to create enemy army');
      }

      // 初期状態では敵は未発見
      enemyArmy.setDiscovered(false);
      expect(discoverySystem.isDiscovered(enemyArmy.getId())).toBe(false);

      // 発見チェック（視界共有あり）
      discoverySystem.checkDiscovery(playerArmies, [enemyArmy]);

      // 敵が発見されたことを確認
      expect(discoverySystem.isDiscovered(enemyArmy.getId())).toBe(true);
    });

    test('視界キャッシュの動作確認', async () => {
      const playerArmy = ArmyFactory.createPlayerArmyAtGrid(
        scene,
        armyManager,
        18,
        18
      );

      if (!playerArmy) {
        throw new Error('Failed to create player army');
      }

      // 初回の視界計算
      const vision1 = visionSystem.getSharedVisionForFaction(
        'player',
        [playerArmy]
      );

      // キャッシュが使われることを確認（100ms以内）
      const vision2 = visionSystem.getSharedVisionForFaction(
        'player',
        [playerArmy]
      );

      // タイムスタンプが非常に近いことを確認（5ms以内）
      expect(Math.abs(vision2.lastUpdated - vision1.lastUpdated)).toBeLessThanOrEqual(5);

      // キャッシュをクリア
      visionSystem.clearVisionCache();

      // 少し待機して異なるタイムスタンプを確保
      await new Promise(resolve => setTimeout(resolve, 10));

      // 新しい計算が行われることを確認
      const vision3 = visionSystem.getSharedVisionForFaction(
        'player',
        [playerArmy]
      );

      expect(vision3.lastUpdated).toBeGreaterThan(vision2.lastUpdated);
    });

    test('待機モードでの視界共有', () => {
      // 通常移動中の軍団
      const movingArmy = ArmyFactory.createPlayerArmyAtGrid(
        scene,
        armyManager,
        10,
        10
      );

      // 待機モード中の軍団（視界+1）
      const waitingArmy = ArmyFactory.createPlayerArmyAtGrid(
        scene,
        armyManager,
        30,
        30
      );

      if (!movingArmy || !waitingArmy) {
        throw new Error('Failed to create armies');
      }

      // 待機モードに設定
      waitingArmy.setMovementMode(MovementMode.STANDBY);

      // 共有視界を計算
      const sharedVision = visionSystem.getSharedVisionForFaction(
        'player',
        [movingArmy, waitingArmy]
      );

      // 両軍団の視界が統合されていることを確認
      expect(sharedVision.visibleTiles.size).toBeGreaterThan(0);
      
      // 待機中の軍団の方が広い視界を持つことを確認
      const movingVision = visionSystem.calculateVision(movingArmy);
      const waitingVision = visionSystem.calculateVision(waitingArmy);
      
      // 待機モードは視界+1ボーナス
      expect(waitingVision[0].effectiveRange).toBeGreaterThan(movingVision[0].effectiveRange);
    });

    test('最も近い観測者の判定', () => {
      // 3つのプレイヤー軍団
      const playerArmies: Army[] = [];
      
      const a1 = ArmyFactory.createPlayerArmyAtGrid(
        scene,
        armyManager,
        6,
        6
      );
      if (a1) playerArmies.push(a1);
      
      const commander2 = CharacterFactory.createCommander(scene, 0, 0, 'shadow', '軍団2');
      const a2 = armyManager.createArmyAtGrid(commander2, 18, 6, 'player');
      if (a2) playerArmies.push(a2);
      
      const a3 = ArmyFactory.createPlayerArmyAtGrid(
        scene,
        armyManager,
        12,
        12
      );
      if (a3) playerArmies.push(a3);

      // 敵軍団（軍団3に最も近い）
      const enemyArmy = ArmyFactory.createEnemyArmyAtGrid(
        scene,
        armyManager,
        15,
        15
      );

      if (!enemyArmy) {
        throw new Error('Failed to create enemy army');
      }

      let discoveredEvent: any = null;
      discoverySystem.onArmyDiscovered = (_army, event) => {
        discoveredEvent = event;
      };

      // 発見チェック
      discoverySystem.checkFactionDiscovery(
        'player',
        playerArmies,
        [enemyArmy]
      );

      // 最も近い軍団3が発見者になることを確認
      expect(discoveredEvent).not.toBeNull();
      expect(discoveredEvent.discovererArmy).toBe(playerArmies[2].getId());
    });
  });

  describe('パフォーマンステスト', () => {
    test('多数の軍団での視界共有処理', () => {
      const playerArmies: Army[] = [];
      
      // 5個のプレイヤー軍団を作成（最大6軍団のため）
      for (let i = 0; i < 5; i++) {
        const army = ArmyFactory.createPlayerArmyAtGrid(
          scene,
          armyManager,
          (i * 10) % 50 + 5,
          Math.floor(i / 5) * 10 + 5
        );
        if (army) playerArmies.push(army);
      }

      const startTime = Date.now();
      
      // 視界共有計算
      const sharedVision = visionSystem.getSharedVisionForFaction(
        'player',
        playerArmies
      );
      
      const endTime = Date.now();
      const executionTime = endTime - startTime;

      // 処理時間が適切であることを確認（100ms以内）
      expect(executionTime).toBeLessThan(100);
      
      // 視界タイルが適切に統合されていることを確認
      expect(sharedVision.visibleTiles.size).toBeGreaterThan(500);
    });
  });
});