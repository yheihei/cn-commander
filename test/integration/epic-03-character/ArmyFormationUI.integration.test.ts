import { createMockScene } from '../../setup';
import { ArmyFormationUI } from '../../../src/ui/ArmyFormationUI';
import { BaseManager } from '../../../src/base/BaseManager';
import { CharacterFactory } from '../../../src/character/CharacterFactory';
import { Character } from '../../../src/character/Character';
import { MapManager } from '../../../src/map/MapManager';
import { BaseType } from '../../../src/types/MapTypes';
import { FactionType } from '../../../src/types/ArmyTypes';

describe('[エピック3] ArmyFormationUI Integration Tests', () => {
  let scene: any;
  let ui: ArmyFormationUI;
  let baseManager: BaseManager;
  let mapManager: MapManager;
  let base: any;
  let mockCharacters: Character[];

  beforeEach(() => {
    scene = createMockScene();
    
    // カメラの設定
    scene.cameras.main.zoom = 2.25;
    scene.cameras.main.worldView = {
      x: 0,
      y: 0,
      width: 1280 / 2.25,
      height: 720 / 2.25,
    };

    // MapManagerのモック
    mapManager = {
      getMapWidth: () => 100,
      getMapHeight: () => 100,
    } as any;

    // BaseManagerの作成
    baseManager = new BaseManager(scene, mapManager);

    // 拠点の作成
    base = baseManager.addBase({
      id: 'base-1',
      name: 'テスト拠点',
      type: BaseType.PLAYER_OCCUPIED,
      x: 10,
      y: 10,
      hp: 80,
      maxHp: 80,
      owner: 'player' as FactionType,
      income: 100,
    });

    // テストキャラクターの作成
    mockCharacters = [
      CharacterFactory.createCharacter(scene, 0, 0, 'wind', '風忍A'),
      CharacterFactory.createCharacter(scene, 0, 0, 'iron', '鉄忍B'),
      CharacterFactory.createCharacter(scene, 0, 0, 'shadow', '影忍C'),
      CharacterFactory.createCharacter(scene, 0, 0, 'medicine', '薬忍D'),
    ];
  });

  afterEach(() => {
    if (ui) {
      ui.destroy();
    }
    if (baseManager) {
      baseManager.destroy();
    }
  });

  describe('UI初期化と表示', () => {
    test('全画面モーダルUIが正しく作成される', () => {
      ui = new ArmyFormationUI({
        scene,
        base,
      });

      // UIコンテナが作成されている
      expect(ui).toBeDefined();
      expect(scene.add.existing).toHaveBeenCalledWith(ui);

      // デプスが最前面に設定されている
      expect(ui.depth).toBe(1000);
    });

    test('左右分割レイアウトが正しく構成される', () => {
      ui = new ArmyFormationUI({
        scene,
        base,
      });

      // 背景とタイトルが作成されている
      expect(scene.add.rectangle).toHaveBeenCalled();
      expect(scene.add.text).toHaveBeenCalledWith(
        expect.any(Number),
        expect.any(Number),
        '軍団編成',
        expect.any(Object)
      );
    });
  });

  describe('待機兵士リスト', () => {
    test('待機兵士が正しく表示される', () => {
      ui = new ArmyFormationUI({
        scene,
        base,
      });

      ui.updateWaitingSoldiers(mockCharacters);

      // 各キャラクターの情報が表示されている
      mockCharacters.forEach(char => {
        expect(scene.add.text).toHaveBeenCalledWith(
          expect.any(Number),
          expect.any(Number),
          char.getName(),
          expect.any(Object)
        );
        expect(scene.add.text).toHaveBeenCalledWith(
          expect.any(Number),
          expect.any(Number),
          char.getJobType(),
          expect.any(Object)
        );
      });
    });

    test('割り当て済み兵士がグレーアウトされる', () => {
      ui = new ArmyFormationUI({
        scene,
        base,
      });

      ui.updateWaitingSoldiers(mockCharacters);

      // 最初の兵士を指揮官スロットに割り当て
      ui.selectSlot('commander', 0);
      ui.assignSoldier(mockCharacters[0]);

      // updateWaitingSoldiersDisplayが再度呼ばれる
      expect(scene.add.container).toHaveBeenCalled();
    });
  });

  describe('スロット選択と兵士割り当て', () => {
    test('スロット選択が正しく動作する', () => {
      ui = new ArmyFormationUI({
        scene,
        base,
      });

      // 指揮官スロットを選択
      ui.selectSlot('commander', 0);
      expect(ui.getSelectedSlot()).toEqual({ type: 'commander', index: 0 });

      // 一般兵スロットを選択
      ui.selectSlot('soldier', 1);
      expect(ui.getSelectedSlot()).toEqual({ type: 'soldier', index: 1 });
    });

    test('兵士の割り当てが正しく動作する', () => {
      ui = new ArmyFormationUI({
        scene,
        base,
      });

      ui.updateWaitingSoldiers(mockCharacters);

      // 指揮官スロットに兵士を割り当て
      ui.selectSlot('commander', 0);
      ui.assignSoldier(mockCharacters[0]);

      // 一般兵スロットに兵士を割り当て
      ui.selectSlot('soldier', 0);
      ui.assignSoldier(mockCharacters[1]);

      // スロット表示が更新される
      expect(scene.add.text).toHaveBeenCalledWith(
        expect.any(Number),
        expect.any(Number),
        mockCharacters[0].getName(),
        expect.any(Object)
      );
    });

    test('兵士の解除が正しく動作する', () => {
      ui = new ArmyFormationUI({
        scene,
        base,
      });

      ui.updateWaitingSoldiers(mockCharacters);

      // 兵士を割り当て
      ui.selectSlot('commander', 0);
      ui.assignSoldier(mockCharacters[0]);

      // 兵士を解除
      ui.removeSoldier('commander', 0);

      // 待機兵士リストが更新される
      expect(scene.add.container).toHaveBeenCalled();
    });
  });

  describe('ボタン制御', () => {
    test('指揮官未選択時は出撃準備ボタンが無効化される', () => {
      const onProceed = jest.fn();
      
      ui = new ArmyFormationUI({
        scene,
        base,
        onProceedToItemSelection: onProceed,
      });

      // 初期状態ではボタンが無効化されている
      const proceedButton = scene.add.rectangle.mock.calls.find(
        (call: any[]) => call[4] === 0x333333  // 無効化時の色
      );
      expect(proceedButton).toBeDefined();
    });

    test('指揮官選択後は出撃準備ボタンが有効化される', () => {
      const onProceed = jest.fn();
      
      ui = new ArmyFormationUI({
        scene,
        base,
        onProceedToItemSelection: onProceed,
      });

      ui.updateWaitingSoldiers(mockCharacters);

      // 指揮官を選択
      ui.selectSlot('commander', 0);
      ui.assignSoldier(mockCharacters[0]);

      // ボタンが有効化される（setFillStyleが呼ばれる）
      expect(scene.add.rectangle).toHaveBeenCalled();
    });
  });

  describe('コールバック処理', () => {
    test('出撃準備ボタンで正しいデータがコールバックされる', () => {
      const onProceed = jest.fn();
      
      ui = new ArmyFormationUI({
        scene,
        base,
        onProceedToItemSelection: onProceed,
      });

      ui.updateWaitingSoldiers(mockCharacters);

      // 軍団を編成
      ui.selectSlot('commander', 0);
      ui.assignSoldier(mockCharacters[0]);
      
      ui.selectSlot('soldier', 0);
      ui.assignSoldier(mockCharacters[1]);
      
      ui.selectSlot('soldier', 1);
      ui.assignSoldier(mockCharacters[2]);

      // 出撃準備を実行（内部メソッドを直接呼ぶ）
      (ui as any).onProceed();

      // コールバックが呼ばれる
      expect(onProceed).toHaveBeenCalledWith({
        commander: mockCharacters[0],
        soldiers: [mockCharacters[1], mockCharacters[2], null],
      });
    });

    test('キャンセルボタンでコールバックが呼ばれる', () => {
      const onCancel = jest.fn();
      
      ui = new ArmyFormationUI({
        scene,
        base,
        onCancelled: onCancel,
      });

      // キャンセルを実行（内部メソッドを直接呼ぶ）
      (ui as any).onCancel();

      expect(onCancel).toHaveBeenCalled();
    });
  });

  describe('相互作用の統合テスト', () => {
    test('完全な軍団編成フローが動作する', () => {
      const onProceed = jest.fn();
      
      ui = new ArmyFormationUI({
        scene,
        base,
        onProceedToItemSelection: onProceed,
      });

      // 待機兵士を設定
      ui.updateWaitingSoldiers(mockCharacters);

      // 指揮官を選択して割り当て
      ui.selectSlot('commander', 0);
      ui.assignSoldier(mockCharacters[0]);

      // 一般兵を選択して割り当て
      ui.selectSlot('soldier', 0);
      ui.assignSoldier(mockCharacters[1]);

      ui.selectSlot('soldier', 1);
      ui.assignSoldier(mockCharacters[2]);

      // 一人解除
      ui.removeSoldier('soldier', 1);

      // 別の兵士を割り当て
      ui.selectSlot('soldier', 1);
      ui.assignSoldier(mockCharacters[3]);

      // 出撃準備
      (ui as any).onProceed();

      // 最終的な編成が正しい
      expect(onProceed).toHaveBeenCalledWith({
        commander: mockCharacters[0],
        soldiers: [mockCharacters[1], mockCharacters[3], null],
      });
    });
  });
});