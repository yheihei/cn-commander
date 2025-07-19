import { BaseInfoPanel } from '../../../src/ui/BaseInfoPanel';
import { Base } from '../../../src/base/Base';
import { BaseType } from '../../../src/types/MapTypes';
import { createMockScene } from '../../setup';

describe('[エピック12] BaseInfoPanel Integration Tests', () => {
  let scene: any;
  let baseInfoPanel: BaseInfoPanel;
  let mockBase: Base;

  beforeEach(() => {
    scene = createMockScene();

    // BaseInfoPanelの作成
    baseInfoPanel = new BaseInfoPanel({
      scene,
      x: 100,
      y: 100,
      width: 200,
      height: 120,
    });

    // モック拠点の作成
    mockBase = new Base(scene, {
      id: 'test-base',
      name: 'テスト拠点',
      type: BaseType.NEUTRAL,
      x: 10,
      y: 10,
      hp: 80,
      maxHp: 80,
      owner: 'neutral',
    });
  });

  afterEach(() => {
    if (baseInfoPanel) {
      baseInfoPanel.destroy();
    }
    if (mockBase) {
      mockBase.destroy();
    }
  });

  describe('基本機能', () => {
    test('初期状態では非表示', () => {
      expect(baseInfoPanel.visible).toBe(false);
    });

    test('show()で拠点情報を表示', () => {
      baseInfoPanel.show(mockBase);

      expect(baseInfoPanel.visible).toBe(true);
      expect(baseInfoPanel.isVisible()).toBe(true);
    });

    test('hide()でパネルを非表示', () => {
      baseInfoPanel.show(mockBase);
      baseInfoPanel.hide();

      expect(baseInfoPanel.visible).toBe(false);
      expect(baseInfoPanel.isVisible()).toBe(false);
    });
  });

  describe('拠点タイプ別表示', () => {
    test('中立拠点の情報表示', () => {
      const neutralBase = new Base(scene, {
        id: 'neutral-base',
        name: '中立拠点',
        type: BaseType.NEUTRAL,
        x: 5,
        y: 5,
        hp: 80,
        maxHp: 80,
        owner: 'neutral',
      });

      baseInfoPanel.show(neutralBase);
      expect(baseInfoPanel.visible).toBe(true);

      neutralBase.destroy();
    });

    test('味方拠点の情報表示', () => {
      const playerBase = new Base(scene, {
        id: 'player-base',
        name: '味方拠点',
        type: BaseType.PLAYER_HQ,
        x: 5,
        y: 5,
        hp: 200,
        maxHp: 200,
        owner: 'player',
      });

      baseInfoPanel.show(playerBase);
      expect(baseInfoPanel.visible).toBe(true);

      playerBase.destroy();
    });

    test('敵拠点の情報表示', () => {
      const enemyBase = new Base(scene, {
        id: 'enemy-base',
        name: '敵拠点',
        type: BaseType.ENEMY_HQ,
        x: 5,
        y: 5,
        hp: 200,
        maxHp: 200,
        owner: 'enemy',
      });

      baseInfoPanel.show(enemyBase);
      expect(baseInfoPanel.visible).toBe(true);

      enemyBase.destroy();
    });
  });

  describe('UIManagerとの連携', () => {
    test('ArmyInfoPanelと排他的に表示される想定', () => {
      // UIManagerでの排他制御はUIManager側でテスト
      // ここではBaseInfoPanel単体の動作を確認
      baseInfoPanel.show(mockBase);
      expect(baseInfoPanel.visible).toBe(true);

      baseInfoPanel.hide();
      expect(baseInfoPanel.visible).toBe(false);
    });
  });

  describe('パネルのサイズと位置', () => {
    test('初期化時のサイズが正しく設定される', () => {
      expect(baseInfoPanel.getWidth()).toBe(200);
    });

    test('位置が正しく設定される', () => {
      expect(baseInfoPanel.x).toBe(100);
      expect(baseInfoPanel.y).toBe(100);
    });
  });
});
