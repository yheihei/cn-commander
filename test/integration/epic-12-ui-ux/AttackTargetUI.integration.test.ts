import { ActionMenu } from '../../../src/ui/ActionMenu';
import { ArmyInfoPanel } from '../../../src/ui/ArmyInfoPanel';
import { ArmyFactory } from '../../../src/army/ArmyFactory';
import { ArmyManager } from '../../../src/army/ArmyManager';
import { MapManager } from '../../../src/map/MapManager';
import { TileType } from '../../../src/types/TileTypes';
import { MapData } from '../../../src/types/MapTypes';
import { createMockScene } from '../../setup';

describe('[エピック12] 攻撃目標指定UI統合テスト', () => {
  let scene: any;
  let armyManager: ArmyManager;
  let mapManager: MapManager;

  beforeEach(() => {
    scene = createMockScene();

    // 簡易的なマップデータを作成
    const mapData: MapData = {
      name: 'testMap',
      width: 50,
      height: 50,
      tileSize: 16,
      layers: [
        {
          name: 'terrain',
          tiles: Array(50)
            .fill(null)
            .map(() => Array(50).fill(TileType.PLAIN)),
          visible: true,
        },
      ],
      startPositions: {
        player: { x: 10, y: 10 },
        enemy: { x: 40, y: 40 },
      },
      bases: [],
    };

    mapManager = new MapManager(scene);
    mapManager.loadMap(mapData);
    armyManager = new ArmyManager(scene);
  });

  describe('ActionMenuの攻撃目標指定オプション', () => {
    test('ActionMenuに攻撃目標指定オプションが表示される', () => {
      const onMove = jest.fn();
      const onStandby = jest.fn();
      const onAttackTarget = jest.fn();
      const onCancel = jest.fn();

      new ActionMenu({
        scene,
        x: 100,
        y: 100,
        onMove,
        onStandby,
        onAttackTarget,
        onCancel,
        onOccupy: jest.fn(),
        canOccupy: false,
      });

      // 3つのボタンが作成されることを確認（移動、攻撃目標指定、待機）
      // 占領ボタンはcanOccupy=falseなので作成されない
      const rectangleCalls = scene.add.rectangle.mock.calls;

      // 背景と3つのボタンの背景で計4回rectangleが呼ばれる
      expect(rectangleCalls.length).toBe(4);

      // 背景の高さが210に調整されていることを確認（3つのボタン用: 60 + 3 * 50）
      const backgroundCall = rectangleCalls[0];
      expect(backgroundCall[3]).toBe(210); // height引数 (x, y, width, height, fillColor, fillAlpha)
    });

    test('攻撃目標指定ボタンをクリックするとコールバックが呼ばれる', () => {
      const onMove = jest.fn();
      const onStandby = jest.fn();
      const onAttackTarget = jest.fn();
      const onCancel = jest.fn();

      new ActionMenu({
        scene,
        x: 100,
        y: 100,
        onMove,
        onStandby,
        onAttackTarget,
        onCancel,
        onOccupy: jest.fn(),
        canOccupy: false,
      });

      // ボタンのクリックイベントをシミュレート
      // 2番目のボタン（攻撃目標指定）のpointerdownハンドラーを取得
      const attackTargetButtonBg = scene.add.rectangle.mock.results[2].value;
      const pointerdownHandler = attackTargetButtonBg.on.mock.calls.find(
        (call: any) => call[0] === 'pointerdown',
      )?.[1];

      expect(pointerdownHandler).toBeDefined();

      // ハンドラーを実行
      pointerdownHandler();

      // コールバックが呼ばれたことを確認
      expect(onAttackTarget).toHaveBeenCalled();
      expect(onMove).not.toHaveBeenCalled();
      expect(onStandby).not.toHaveBeenCalled();
    });
  });

  describe('ArmyInfoPanelの攻撃目標表示', () => {
    test('攻撃目標が設定されている軍団の情報を表示する', () => {
      // プレイヤー軍団を作成
      const playerArmy = ArmyFactory.createPlayerArmyAtGrid(scene, armyManager, 10, 10);

      // 敵軍団を作成
      const enemyArmy = ArmyFactory.createEnemyArmyAtGrid(scene, armyManager, 20, 20);

      if (!playerArmy || !enemyArmy) {
        throw new Error('Failed to create armies');
      }

      // 攻撃目標を設定
      playerArmy.setAttackTarget(enemyArmy);

      // ArmyInfoPanelを作成
      const armyInfoPanel = new ArmyInfoPanel({
        scene,
        x: 100,
        y: 100,
        width: 300,
        height: 400,
      });

      // 軍団情報を更新
      armyInfoPanel.updateArmyInfo(playerArmy);

      // 状態テキストに攻撃目標が含まれることを確認
      // statusTextのsetTextメソッドが呼ばれているか確認
      const textInstances = scene.add.text.mock.results;
      const statusTextInstance = textInstances[1]?.value; // 2番目のテキストがstatusText

      expect(statusTextInstance).toBeDefined();
      expect(statusTextInstance.setText).toHaveBeenCalled();

      // setTextが攻撃目標情報を含むテキストで呼ばれたか確認
      const setTextCalls = statusTextInstance.setText.mock.calls;
      const hasAttackTargetCall = setTextCalls.some(
        (call: any) => call[0] && call[0].includes('攻撃目標:'),
      );

      expect(hasAttackTargetCall).toBe(true);
    });

    test('攻撃目標が設定されていない場合は表示されない', () => {
      const playerArmy = ArmyFactory.createPlayerArmyAtGrid(scene, armyManager, 10, 10);

      if (!playerArmy) {
        throw new Error('Failed to create army');
      }

      const armyInfoPanel = new ArmyInfoPanel({
        scene,
        x: 100,
        y: 100,
        width: 300,
        height: 400,
      });

      // 軍団情報を更新（攻撃目標なし）
      armyInfoPanel.updateArmyInfo(playerArmy);

      // 状態テキストに攻撃目標が含まれないことを確認
      const textSetCalls = scene.add.text.mock.results
        .map((result: any) => result.value.setText.mock.calls)
        .flat();

      const hasAttackTarget = textSetCalls.some(
        (call: any) => call[0] && call[0].includes('攻撃目標:'),
      );

      expect(hasAttackTarget).toBe(false);
    });
  });

  describe('視覚的フィードバックの統合', () => {
    test('メニューの範囲外をクリックするとキャンセルされる', () => {
      const onMove = jest.fn();
      const onStandby = jest.fn();
      const onAttackTarget = jest.fn();
      const onCancel = jest.fn();

      // delayedCallをモック化して、コールバックを即座に実行
      scene.time.delayedCall = jest.fn((_delay: number, callback: () => void) => {
        callback(); // 即座に実行
      });

      new ActionMenu({
        scene,
        x: 100,
        y: 100,
        onMove,
        onStandby,
        onAttackTarget,
        onCancel,
        onOccupy: jest.fn(),
        canOccupy: false,
      });

      // delayedCallが呼ばれたことを確認
      expect(scene.time.delayedCall).toHaveBeenCalled();

      // 画面クリックのハンドラーを取得
      const pointerdownHandler = scene.input.on.mock.calls.find(
        (call: any) => call[0] === 'pointerdown',
      )?.[1];

      expect(pointerdownHandler).toBeDefined();

      // カメラのworldViewを設定（ActionMenuのメニュー範囲判定で使用）
      scene.cameras.main.worldView = {
        x: 0,
        y: 0,
        left: 0,
        right: 1280,
        top: 0,
        bottom: 720,
      };

      // メニューの範囲外をクリック（メニューは100,100、範囲は±60,±80）
      const pointer = { x: 300, y: 300 };
      pointerdownHandler(pointer);

      // キャンセルコールバックが呼ばれたことを確認
      expect(onCancel).toHaveBeenCalled();
    });
  });
});
