import { createMockScene } from '../../setup';
import { VisionSystem } from '../../../src/vision/VisionSystem';
import { MapManager } from '../../../src/map/MapManager';
import { ArmyManager } from '../../../src/army/ArmyManager';
import { ArmyFactory } from '../../../src/army/ArmyFactory';
import { CharacterFactory } from '../../../src/character/CharacterFactory';

describe('[エピック6] 視界共有の隔離性テスト', () => {
  let scene: any;
  let mapManager: MapManager;
  let armyManager: ArmyManager;
  let visionSystem: VisionSystem;

  beforeEach(() => {
    scene = createMockScene();

    // マップマネージャーの初期化
    mapManager = new MapManager(scene);
    mapManager.createEmptyMap(100, 100);

    // 軍団マネージャーの初期化
    armyManager = new ArmyManager(scene);

    // システムの初期化
    visionSystem = new VisionSystem(mapManager);
  });

  afterEach(() => {
    armyManager.destroy();
    mapManager.destroy();
  });

  test('味方の視界が敵勢力に共有されない', () => {
    // プレイヤー軍団（視界が広い影忍）
    const commander = CharacterFactory.createCommander(scene, 0, 0, 'shadow', '味方偵察兵');
    const playerArmy = armyManager.createArmyAtGrid(commander, 10, 10, 'player');

    // 敵軍団を2つ作成（お互いの視界外に配置）
    const enemyArmy1 = ArmyFactory.createEnemyArmyAtGrid(scene, armyManager, 50, 50);
    const enemyArmy2 = ArmyFactory.createEnemyArmyAtGrid(scene, armyManager, 15, 15); // プレイヤーの視界内、敵1の視界外

    if (!playerArmy || !enemyArmy1 || !enemyArmy2) {
      throw new Error('Failed to create armies');
    }

    // プレイヤーから敵2が見える
    expect(visionSystem.canSeeArmy(playerArmy, enemyArmy2)).toBe(true);

    // 敵1からは敵2が見えない（距離が離れているため）
    expect(visionSystem.canSeeArmy(enemyArmy1, enemyArmy2)).toBe(false);

    // 敵勢力の視界データを取得しても、プレイヤーの視界は含まれない
    const enemySharedVision = visionSystem.getSharedVisionForFaction('enemy', [enemyArmy1]);

    // 敵の視界タイルにプレイヤーの視界は含まれない
    const enemyPos2 = enemyArmy2.getPosition();
    const gridPos = mapManager.pixelToGrid(enemyPos2.x, enemyPos2.y);
    const tileKey = `${gridPos.x},${gridPos.y}`;

    expect(enemySharedVision.visibleTiles.has(tileKey)).toBe(false);
  });

  test('敵の視界が味方勢力に共有されない', () => {
    // 敵軍団（視界が広い影忍）
    const enemyCommander = CharacterFactory.createCommander(scene, 0, 0, 'shadow', '敵偵察兵');
    const enemyArmy = armyManager.createArmyAtGrid(enemyCommander, 50, 50, 'enemy');

    // プレイヤー軍団を2つ作成
    const playerArmy1 = ArmyFactory.createPlayerArmyAtGrid(scene, armyManager, 30, 30);
    const playerArmy2 = ArmyFactory.createPlayerArmyAtGrid(scene, armyManager, 55, 55); // 敵の視界内

    if (!enemyArmy || !playerArmy1 || !playerArmy2) {
      throw new Error('Failed to create armies');
    }

    // 敵からプレイヤー2が見える
    expect(visionSystem.canSeeArmy(enemyArmy, playerArmy2)).toBe(true);

    // プレイヤー1からはプレイヤー2が見えない（敵の視界は共有されない）
    expect(visionSystem.canSeeArmy(playerArmy1, playerArmy2)).toBe(false);

    // プレイヤー勢力の視界データを取得しても、敵の視界は含まれない
    const playerSharedVision = visionSystem.getSharedVisionForFaction('player', [playerArmy1]);

    // プレイヤーの視界タイルに敵の視界は含まれない
    const playerPos2 = playerArmy2.getPosition();
    const gridPos = mapManager.pixelToGrid(playerPos2.x, playerPos2.y);
    const tileKey = `${gridPos.x},${gridPos.y}`;

    expect(playerSharedVision.visibleTiles.has(tileKey)).toBe(false);
  });

  test('敵同士でも視界を共有する', () => {
    // 敵軍団を3つ作成
    const enemyArmy1 = ArmyFactory.createEnemyArmyAtGrid(scene, armyManager, 10, 10);

    const enemyCommander2 = CharacterFactory.createCommander(scene, 0, 0, 'shadow', '敵偵察兵');
    const enemyArmy2 = armyManager.createArmyAtGrid(enemyCommander2, 30, 30, 'enemy');

    const enemyArmy3 = ArmyFactory.createEnemyArmyAtGrid(scene, armyManager, 35, 35); // 軍団2の視界内

    if (!enemyArmy1 || !enemyArmy2 || !enemyArmy3) {
      throw new Error('Failed to create armies');
    }

    // 軍団1単独では軍団3が見えない
    expect(visionSystem.canSeeArmy(enemyArmy1, enemyArmy3)).toBe(false);

    // 軍団2単独では軍団3が見える（影忍なので視界が広い）
    expect(visionSystem.canSeeArmy(enemyArmy2, enemyArmy3)).toBe(true);

    // 敵勢力の共有視界では軍団3が見える
    expect(visionSystem.isVisibleByFaction(enemyArmy3, 'enemy', [enemyArmy1, enemyArmy2])).toBe(
      true,
    );
  });

  test('異なる勢力間で視界キャッシュが混在しない', () => {
    const playerArmy = ArmyFactory.createPlayerArmyAtGrid(scene, armyManager, 10, 10);
    const enemyArmy = ArmyFactory.createEnemyArmyAtGrid(scene, armyManager, 50, 50);

    if (!playerArmy || !enemyArmy) {
      throw new Error('Failed to create armies');
    }

    // プレイヤー勢力の視界を計算
    const playerVision1 = visionSystem.getSharedVisionForFaction('player', [playerArmy]);

    // 敵勢力の視界を計算
    const enemyVision = visionSystem.getSharedVisionForFaction('enemy', [enemyArmy]);

    // プレイヤー勢力の視界を再度計算（キャッシュから取得されるはず）
    const playerVision2 = visionSystem.getSharedVisionForFaction('player', [playerArmy]);

    // プレイヤーの視界タイル数は変わらない
    expect(playerVision2.visibleTiles.size).toBe(playerVision1.visibleTiles.size);

    // 視界タイルが混在していない（完全に異なるセット）
    const playerTiles = Array.from(playerVision2.visibleTiles);
    const enemyTiles = Array.from(enemyVision.visibleTiles);

    const intersection = playerTiles.filter((tile) => enemyTiles.includes(tile));
    expect(intersection.length).toBe(0);
  });
});
