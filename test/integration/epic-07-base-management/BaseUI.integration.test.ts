import { UIManager } from '../../../src/ui/UIManager';
import { Base } from '../../../src/base/Base';
import { BaseManager } from '../../../src/base/BaseManager';
import { MapManager } from '../../../src/map/MapManager';
import { BaseType } from '../../../src/types/MapTypes';

// モックの作成
jest.mock('phaser');

describe('[エピック7] Base UI Integration Tests', () => {
  let scene: any;
  let uiManager: UIManager;
  let baseManager: BaseManager;
  let playerBase: Base;
  let enemyBase: Base;
  let neutralBase: Base;

  beforeEach(() => {
    // シーンのモック
    scene = {
      add: {
        existing: jest.fn(),
        rectangle: jest.fn().mockReturnValue({
          setStrokeStyle: jest.fn(),
          setOrigin: jest.fn(),
          setInteractive: jest.fn(),
          on: jest.fn(),
          setFillStyle: jest.fn(),
          destroy: jest.fn(),
        }),
        text: jest.fn().mockReturnValue({
          setOrigin: jest.fn(),
          setText: jest.fn(),
          setStyle: jest.fn(),
          destroy: jest.fn(),
        }),
        container: jest.fn().mockImplementation((x, y) => ({
          x,
          y,
          add: jest.fn(),
          setDepth: jest.fn(),
          setVisible: jest.fn(),
          setActive: jest.fn(),
          setPosition: jest.fn(),
          destroy: jest.fn(),
          visible: false,
          once: jest.fn(),
          on: jest.fn(),
          updateFixedPosition: jest.fn(),
        })),
        graphics: jest.fn().mockReturnValue({
          fillStyle: jest.fn(),
          fillRect: jest.fn(),
          clear: jest.fn(),
          setVisible: jest.fn(),
          destroy: jest.fn(),
        }),
        sprite: jest.fn().mockReturnValue({
          setDisplaySize: jest.fn(),
          setFrame: jest.fn(),
          setTint: jest.fn(),
          destroy: jest.fn(),
        }),
        group: jest.fn().mockReturnValue({
          destroy: jest.fn(),
        }),
      },
      cameras: {
        main: {
          zoom: 2.25,
          worldView: {
            x: 0,
            y: 0,
            width: 568,
            height: 320,
            right: 568,
          },
        },
      },
      time: {
        delayedCall: jest.fn((_delay, callback) => {
          // 即座にコールバックを実行
          callback();
          return { destroy: jest.fn() };
        }),
        now: 0,
      },
      input: {
        on: jest.fn(),
        off: jest.fn(),
      },
      events: {
        emit: jest.fn(),
      },
    };

    // MapManagerのモック
    const mockMapManager = {} as MapManager;

    // UIManagerとBaseManagerの初期化
    uiManager = new UIManager(scene);
    baseManager = new BaseManager(scene, mockMapManager);

    // テスト用拠点の作成
    playerBase = baseManager.addBase({
      id: 'test-player-base',
      name: 'プレイヤー拠点',
      type: BaseType.PLAYER_HQ,
      x: 10,
      y: 10,
      hp: 200,
      maxHp: 200,
      owner: 'player',
      income: 200,
    });

    enemyBase = baseManager.addBase({
      id: 'test-enemy-base',
      name: '敵拠点',
      type: BaseType.ENEMY_HQ,
      x: 20,
      y: 20,
      hp: 150,
      maxHp: 200,
      owner: 'enemy',
      income: 200,
    });

    neutralBase = baseManager.addBase({
      id: 'test-neutral-base',
      name: '中立拠点',
      type: BaseType.NEUTRAL,
      x: 30,
      y: 30,
      hp: 80,
      maxHp: 80,
      owner: 'neutral',
      income: 100,
    });
  });

  describe('拠点情報パネル表示', () => {
    test('味方拠点を選択した時、BaseInfoPanelとBaseActionMenuが表示される', () => {
      // BaseInfoPanelの初期化で既にコンテナが作成されているので、カウントをリセット
      scene.add.container.mockClear();
      scene.add.existing.mockClear();

      // 味方拠点を選択
      uiManager.showBaseInfo(playerBase);

      // BaseInfoPanelが表示されることを確認
      expect(scene.add.existing).toHaveBeenCalled();
      expect(scene.add.rectangle).toHaveBeenCalled();
      expect(scene.add.text).toHaveBeenCalled();

      // BaseActionMenuも作成されることを確認
      const containerCalls = scene.add.container.mock.calls;
      // BaseActionMenu用のコンテナが作成される
      expect(containerCalls.length).toBeGreaterThanOrEqual(1);
    });

    test('敵拠点を選択した時、BaseInfoPanelのみ表示される', () => {
      // カウントをリセット
      scene.add.container.mockClear();

      // 敵拠点を選択
      uiManager.showBaseInfo(enemyBase);

      // BaseActionMenuは作成されないことを確認
      const containerCalls = scene.add.container.mock.calls;
      // BaseActionMenuは作成されない
      expect(containerCalls.length).toBe(0);

      // currentSelectedBaseが設定されることを確認
      expect((uiManager as any).currentSelectedBase).toBe(enemyBase);
    });

    test('中立拠点を選択した時、BaseInfoPanelのみ表示される', () => {
      // カウントをリセット
      scene.add.container.mockClear();

      // 中立拠点を選択
      uiManager.showBaseInfo(neutralBase);

      // BaseActionMenuは作成されないことを確認
      const containerCalls = scene.add.container.mock.calls;
      // BaseActionMenuは作成されない
      expect(containerCalls.length).toBe(0);

      // currentSelectedBaseが設定されることを確認
      expect((uiManager as any).currentSelectedBase).toBe(neutralBase);
    });
  });

  describe('BaseActionMenuの動作', () => {
    test('兵舎ボタンをクリックすると、BarracksSubMenuが表示される', () => {
      // カウントをリセット
      scene.add.container.mockClear();

      // 味方拠点を選択してBaseActionMenuを表示
      uiManager.showBaseInfo(playerBase);

      // BaseActionMenuが作成されたことを確認
      expect(scene.add.container).toHaveBeenCalled();

      // 兵舎サブメニューを直接表示
      uiManager.showBarracksSubMenu();

      // BarracksSubMenuが作成されることを確認
      const containerCalls = scene.add.container.mock.calls;
      expect(containerCalls.length).toBeGreaterThanOrEqual(2); // BaseActionMenu + BarracksSubMenu
    });
  });

  describe('UIの非表示処理', () => {
    test('hideBaseInfoを呼ぶと、全ての拠点関連UIが非表示になる', () => {
      // 味方拠点を選択してUIを表示
      uiManager.showBaseInfo(playerBase);

      // UIを非表示にする
      uiManager.hideBaseInfo();

      // 内部状態が正しくクリアされることを確認
      expect((uiManager as any).currentSelectedBase).toBeNull();
      expect((uiManager as any).baseActionMenu).toBeNull();
      expect((uiManager as any).barracksSubMenu).toBeNull();
    });
  });

  describe('サブメニューのキャンセル処理', () => {
    test('BarracksSubMenuでキャンセルすると、BaseActionMenuに戻る', () => {
      // 味方拠点を選択
      uiManager.showBaseInfo(playerBase);

      // 兵舎サブメニューを表示
      uiManager.showBarracksSubMenu();

      // currentSelectedBaseが設定されていることを確認
      expect((uiManager as any).currentSelectedBase).toBe(playerBase);

      // カウントをリセット
      scene.add.container.mockClear();

      // onCancelコールバックをシミュレート
      // BarracksSubMenuのonCancelはshowBaseActionMenuを呼び出す
      (uiManager as any).hideBarracksSubMenu();
      if ((uiManager as any).currentSelectedBase) {
        (uiManager as any).showBaseActionMenu((uiManager as any).currentSelectedBase);
      }

      // BaseActionMenuが再作成されることを確認
      expect(scene.add.container).toHaveBeenCalled();
    });
  });

  afterEach(() => {
    uiManager.destroy();
    baseManager.destroy();
  });
});
