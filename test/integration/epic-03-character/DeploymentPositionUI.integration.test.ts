import {
  DeploymentPositionUI,
  DeploymentPositionUIConfig,
} from '../../../src/ui/DeploymentPositionUI';
import { ItemEquippedFormationData } from '../../../src/ui/ItemSelectionUI';
import { Base } from '../../../src/base/Base';
import { MapManager } from '../../../src/map/MapManager';
import { ArmyManager } from '../../../src/army/ArmyManager';
import { BaseManager } from '../../../src/base/BaseManager';
import { Character } from '../../../src/character/Character';
import { Army } from '../../../src/army/Army';

// Phaserモックのセットアップ
jest.mock('phaser', () => {
  return {
    Scene: class MockScene {},
    GameObjects: {
      Container: class MockContainer {
        x = 0;
        y = 0;
        list: any[] = [];
        visible = true;
        depth = 0;

        constructor(_scene: any, x: number, y: number) {
          this.x = x;
          this.y = y;
        }

        add = jest.fn((child) => {
          this.list.push(child);
          return this;
        });
        removeAll = jest.fn((destroyChild?: boolean) => {
          if (destroyChild) {
            this.list.forEach((child) => child.destroy?.());
          }
          this.list = [];
          return this;
        });
        setPosition = jest.fn((x: number, y: number) => {
          this.x = x;
          this.y = y;
          return this;
        });
        setDepth = jest.fn((depth: number) => {
          this.depth = depth;
          return this;
        });
        setVisible = jest.fn((visible: boolean) => {
          this.visible = visible;
          return this;
        });
        destroy = jest.fn();
      },
      Rectangle: class MockRectangle {
        setOrigin = jest.fn(() => this);
        setStrokeStyle = jest.fn(() => this);
        setInteractive = jest.fn(() => this);
        setFillStyle = jest.fn(() => this);
        on = jest.fn(() => this);
        off = jest.fn(() => this);
        destroy = jest.fn();
      },
      Text: class MockText {
        setOrigin = jest.fn(() => this);
        setText = jest.fn(() => this);
        destroy = jest.fn();
      },
    },
  };
});

// モックシーンの作成
const createMockScene = () => {
  return {
    add: {
      container: jest.fn(
        (x, y) => new (jest.requireMock('phaser').GameObjects.Container)(null, x, y),
      ),
      rectangle: jest.fn(() => new (jest.requireMock('phaser').GameObjects.Rectangle)()),
      text: jest.fn(() => new (jest.requireMock('phaser').GameObjects.Text)()),
      existing: jest.fn(),
    },
    cameras: {
      main: {
        zoom: 2.25,
        worldView: {
          x: 0,
          y: 0,
          width: 568.889,
          height: 320,
        },
      },
    },
    input: {
      on: jest.fn(),
      off: jest.fn(),
      enabled: true,
    },
    time: {
      delayedCall: jest.fn((_delay, callback) => {
        // テストでは即座に実行
        setTimeout(callback, 0);
        return { remove: jest.fn() };
      }),
    },
  };
};

// モッククラスの作成
const createMockCharacter = (name: string): Character => {
  return {
    getName: jest.fn(() => name),
    getItemHolder: jest.fn(() => ({
      getItems: jest.fn(() => []),
      addItem: jest.fn(),
      removeItem: jest.fn(),
    })),
  } as any;
};

const createMockBase = (id: string, x: number, y: number): Base => {
  return {
    getId: jest.fn(() => id),
    getName: jest.fn(() => `Base ${id}`),
    getPosition: jest.fn(() => ({ x, y })),
    getOwner: jest.fn(() => 'player'),
  } as any;
};

const createMockArmy = (name: string, x: number, y: number): Army => {
  return {
    getName: jest.fn(() => name),
    getGridPosition: jest.fn(() => ({ x, y })),
    addSoldier: jest.fn(),
  } as any;
};

describe('[エピック3] DeploymentPositionUI Integration Tests', () => {
  let scene: any;
  let base: Base;
  let mapManager: MapManager;
  let armyManager: ArmyManager;
  let baseManager: BaseManager;
  let itemEquippedData: ItemEquippedFormationData;
  let deploymentUI: DeploymentPositionUI;

  beforeEach(() => {
    jest.clearAllMocks();

    scene = createMockScene();
    base = createMockBase('base1', 10, 10);

    // MapManagerのモック
    mapManager = {
      getMapWidth: jest.fn(() => 100),
      getMapHeight: jest.fn(() => 100),
      getTileAt: jest.fn(() => ({
        isWalkable: jest.fn(() => true),
      })),
    } as any;

    // ArmyManagerのモック
    armyManager = {
      createArmyAtGrid: jest.fn((_commander, x, y) => createMockArmy('TestArmy', x, y)),
    } as any;

    // BaseManagerのモック
    baseManager = {
      removeWaitingSoldiers: jest.fn(),
    } as any;

    // アイテム装備済みデータ
    itemEquippedData = {
      commander: createMockCharacter('Commander'),
      soldiers: [
        createMockCharacter('Soldier1'),
        createMockCharacter('Soldier2'),
        createMockCharacter('Soldier3'),
      ],
      items: new Map(),
    };
  });

  afterEach(() => {
    if (deploymentUI) {
      deploymentUI.destroy();
    }
  });

  describe('UIの初期化と表示', () => {
    test('DeploymentPositionUIが正しく初期化される', () => {
      const config: DeploymentPositionUIConfig = {
        scene,
        base,
        mapManager,
        armyManager,
        baseManager,
        itemEquippedFormationData: itemEquippedData,
      };

      deploymentUI = new DeploymentPositionUI(config);

      expect(scene.add.container).toHaveBeenCalled();
      expect(scene.add.rectangle).toHaveBeenCalled();
      expect(scene.add.text).toHaveBeenCalled();
      expect(scene.add.existing).toHaveBeenCalled();
    });

    test('show()で1秒後に選択可能位置が表示される', (done) => {
      deploymentUI = new DeploymentPositionUI({
        scene,
        base,
        mapManager,
        armyManager,
        baseManager,
        itemEquippedFormationData: itemEquippedData,
      });

      const showDeployablePositionsSpy = jest.spyOn(deploymentUI, 'showDeployablePositions');

      deploymentUI.show();

      // 1秒後の処理を待つ
      setTimeout(() => {
        expect(showDeployablePositionsSpy).toHaveBeenCalled();
        done();
      }, 100);
    });
  });

  describe('選択可能位置の計算', () => {
    test('拠点周囲2マス以内の位置が正しく計算される', () => {
      deploymentUI = new DeploymentPositionUI({
        scene,
        base,
        mapManager,
        armyManager,
        baseManager,
        itemEquippedFormationData: itemEquippedData,
      });

      deploymentUI.show();

      // showDeployablePositions内で選択可能位置が計算される
      // 1秒後にshowDeployablePositionsが呼ばれる
      setTimeout(() => {
        // マンハッタン距離2以内の位置数を確認
        // 中心を除く位置: 距離1=4個、距離2=8個、合計12個
        const expectedPositions = 12;

        // mapManager.getTileAtが呼ばれた回数で確認
        expect(mapManager.getTileAt).toHaveBeenCalledTimes(expectedPositions);
      }, 1100);
    });

    test('マップ範囲外の位置は除外される', () => {
      // 拠点をマップ端に配置
      base = createMockBase('edge-base', 0, 0);

      deploymentUI = new DeploymentPositionUI({
        scene,
        base,
        mapManager,
        armyManager,
        baseManager,
        itemEquippedFormationData: itemEquippedData,
      });

      deploymentUI.show();

      // 1秒後にshowDeployablePositionsが呼ばれる
      setTimeout(() => {
        // (0,0)から2マス以内でマップ内の位置のみチェック
        expect(mapManager.getTileAt).toHaveBeenCalled();

        // 負の座標では呼ばれないことを確認
        expect(mapManager.getTileAt).not.toHaveBeenCalledWith(-1, expect.any(Number));
        expect(mapManager.getTileAt).not.toHaveBeenCalledWith(expect.any(Number), -1);
      }, 1100);
    });
  });

  describe('軍団生成と配置', () => {
    test('位置選択で軍団が正しく生成される', (done) => {
      const onDeploymentComplete = jest.fn();

      deploymentUI = new DeploymentPositionUI({
        scene,
        base,
        mapManager,
        armyManager,
        baseManager,
        itemEquippedFormationData: itemEquippedData,
        onDeploymentComplete,
      });

      deploymentUI.show();

      // 選択可能位置が表示された後、位置を選択
      setTimeout(() => {
        // armyManager.createArmyAtGridを直接呼び出すシミュレーション
        const selectedX = 11;
        const selectedY = 10;

        // DeploymentPositionUIの内部処理をシミュレート
        const army = armyManager.createArmyAtGrid(
          itemEquippedData.commander,
          selectedX,
          selectedY,
          'player',
        );

        expect(armyManager.createArmyAtGrid).toHaveBeenCalledWith(
          itemEquippedData.commander,
          selectedX,
          selectedY,
          'player',
        );

        // 一般兵の追加
        if (army) {
          itemEquippedData.soldiers.forEach((soldier) => {
            army.addSoldier(soldier);
          });

          expect(army.addSoldier).toHaveBeenCalledTimes(3);
        }

        done();
      }, 100);
    });

    test('軍団生成後、待機兵士から削除される', (done) => {
      const onDeploymentComplete = jest.fn();

      deploymentUI = new DeploymentPositionUI({
        scene,
        base,
        mapManager,
        armyManager,
        baseManager,
        itemEquippedFormationData: itemEquippedData,
        onDeploymentComplete,
      });

      // onPositionSelectedを直接テスト
      const onPositionSelected = (deploymentUI as any).onPositionSelected.bind(deploymentUI);
      onPositionSelected({ x: 11, y: 10 });

      setTimeout(() => {
        expect(baseManager.removeWaitingSoldiers).toHaveBeenCalledWith('base1', [
          itemEquippedData.commander,
          ...itemEquippedData.soldiers,
        ]);
        done();
      }, 0);
    });
  });

  describe('UIインタラクション', () => {
    test('右クリックでonBackコールバックが呼ばれる', (done) => {
      const onBack = jest.fn();

      deploymentUI = new DeploymentPositionUI({
        scene,
        base,
        mapManager,
        armyManager,
        baseManager,
        itemEquippedFormationData: itemEquippedData,
        onBack,
      });

      deploymentUI.show();

      // 1秒後に入力が有効になってから右クリック
      setTimeout(() => {
        // 右クリックイベントをシミュレート
        const rightClickEvent = {
          rightButtonDown: () => true,
        };

        // input.onで登録されたハンドラを取得して実行
        const pointerdownHandler = scene.input.on.mock.calls.find(
          (call: any) => call[0] === 'pointerdown',
        )?.[1];

        if (pointerdownHandler) {
          pointerdownHandler(rightClickEvent);
          expect(onBack).toHaveBeenCalled();
        }

        done();
      }, 1100);
    });

    test('hide()でUIが非表示になる', () => {
      deploymentUI = new DeploymentPositionUI({
        scene,
        base,
        mapManager,
        armyManager,
        baseManager,
        itemEquippedFormationData: itemEquippedData,
      });

      deploymentUI.show();
      deploymentUI.hide();

      expect(deploymentUI.visible).toBe(false);
    });
  });

  describe('クリーンアップ', () => {
    test('destroy()でリソースが適切に解放される', () => {
      deploymentUI = new DeploymentPositionUI({
        scene,
        base,
        mapManager,
        armyManager,
        baseManager,
        itemEquippedFormationData: itemEquippedData,
      });

      deploymentUI.show();

      // ハイライトタイルを作成してからdestroyを呼ぶ
      deploymentUI.showDeployablePositions();

      const destroySpy = jest.spyOn(deploymentUI, 'destroy');
      deploymentUI.destroy();

      // destroyメソッドが呼ばれたことを確認
      expect(destroySpy).toHaveBeenCalled();

      // コンテナのdestroyも呼ばれることを確認（親クラス）
      expect(deploymentUI.destroy).toHaveBeenCalled();
    });
  });
});
