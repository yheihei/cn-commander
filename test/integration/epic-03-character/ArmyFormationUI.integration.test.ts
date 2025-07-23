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
      right: 1280 / 2.25,
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
      CharacterFactory.createCharacter(scene, 0, 0, 'wind', '風忍E'),
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

    test('タイトルとボタンが正しく表示される', () => {
      ui = new ArmyFormationUI({
        scene,
        base,
      });

      // タイトルが表示されている
      expect(scene.add.text).toHaveBeenCalledWith(
        expect.any(Number),
        expect.any(Number),
        '軍団編成',
        expect.any(Object),
      );

      // ボタンが作成されている
      expect(scene.add.text).toHaveBeenCalledWith(
        expect.any(Number),
        expect.any(Number),
        'アイテム選択',
        expect.any(Object),
      );
      expect(scene.add.text).toHaveBeenCalledWith(
        expect.any(Number),
        expect.any(Number),
        'キャンセル',
        expect.any(Object),
      );
    });
  });

  describe('待機兵士テーブル', () => {
    test('テーブルヘッダーが正しく表示される', () => {
      ui = new ArmyFormationUI({
        scene,
        base,
      });

      // ヘッダーテキストが作成されている
      const headers = ['名前', '職業', 'HP', '攻撃', '防御', '速さ', '移動', '視界', '選択'];
      headers.forEach((header) => {
        expect(scene.add.text).toHaveBeenCalledWith(
          expect.any(Number),
          expect.any(Number),
          header,
          expect.any(Object),
        );
      });
    });

    test('待機兵士が正しく表示される', () => {
      ui = new ArmyFormationUI({
        scene,
        base,
      });

      ui.setWaitingSoldiers(mockCharacters);

      // 各キャラクターの情報が表示されている
      mockCharacters.forEach((char) => {
        expect(scene.add.text).toHaveBeenCalledWith(
          expect.any(Number),
          expect.any(Number),
          char.getName(),
          expect.any(Object),
        );
      });

      // 職業名が正しく変換されて表示される
      expect(scene.add.text).toHaveBeenCalledWith(
        expect.any(Number),
        expect.any(Number),
        '風忍', // windが風忍に変換
        expect.any(Object),
      );
      expect(scene.add.text).toHaveBeenCalledWith(
        expect.any(Number),
        expect.any(Number),
        '鉄忍', // ironが鉄忍に変換
        expect.any(Object),
      );
    });

    test('偶数行に背景色が設定される', () => {
      ui = new ArmyFormationUI({
        scene,
        base,
      });

      ui.setWaitingSoldiers(mockCharacters);

      // 偶数行（0, 2, 4）に背景が作成される
      const backgroundCalls = scene.add.rectangle.mock.calls.filter(
        (call: any[]) => call[4] === 0x333333,
      );
      expect(backgroundCalls.length).toBeGreaterThanOrEqual(3);
    });
  });

  describe('兵士選択機能', () => {
    test('最初の選択で指揮官になる', () => {
      ui = new ArmyFormationUI({
        scene,
        base,
      });

      ui.setWaitingSoldiers(mockCharacters);

      // 最初の兵士をクリック
      const soldierRow = (ui as any).soldierRows.get(mockCharacters[0].getId());
      const rowBg = soldierRow.getData('rowBg');
      rowBg.emit('pointerdown');

      // 指揮官マークが表示される
      const selectionMark = soldierRow.getData('selectionMark');
      expect(selectionMark.setText).toHaveBeenCalledWith('指');
      expect(selectionMark.setColor).toHaveBeenCalledWith('#ff0000');
    });

    test('2人目以降の選択で一般兵になる', () => {
      ui = new ArmyFormationUI({
        scene,
        base,
      });

      ui.setWaitingSoldiers(mockCharacters);

      // 最初の兵士を指揮官として選択
      const commanderRow = (ui as any).soldierRows.get(mockCharacters[0].getId());
      commanderRow.getData('rowBg').emit('pointerdown');

      // 2人目を選択
      const soldierRow = (ui as any).soldierRows.get(mockCharacters[1].getId());
      soldierRow.getData('rowBg').emit('pointerdown');

      // 一般兵マークが表示される
      const selectionMark = soldierRow.getData('selectionMark');
      expect(selectionMark.setText).toHaveBeenCalledWith('兵');
      expect(selectionMark.setColor).toHaveBeenCalledWith('#0088ff');
    });

    test('最大4人まで選択可能', () => {
      ui = new ArmyFormationUI({
        scene,
        base,
      });

      ui.setWaitingSoldiers(mockCharacters);

      // 4人選択
      for (let i = 0; i < 4; i++) {
        const row = (ui as any).soldierRows.get(mockCharacters[i].getId());
        row.getData('rowBg').emit('pointerdown');
      }

      // 5人目を選択しようとする
      const fifthRow = (ui as any).soldierRows.get(mockCharacters[4].getId());
      const fifthMark = fifthRow.getData('selectionMark');
      fifthRow.getData('rowBg').emit('pointerdown');

      // 5人目は選択されない（マークが空のまま）
      expect(fifthMark.setText).not.toHaveBeenCalledWith('兵');
    });
  });

  describe('兵士選択解除機能', () => {
    test('指揮官を右クリックで全選択解除', () => {
      ui = new ArmyFormationUI({
        scene,
        base,
      });

      ui.setWaitingSoldiers(mockCharacters);

      // 3人選択
      for (let i = 0; i < 3; i++) {
        const row = (ui as any).soldierRows.get(mockCharacters[i].getId());
        row.getData('rowBg').emit('pointerdown');
      }

      // 指揮官を右クリック
      const commanderRow = (ui as any).soldierRows.get(mockCharacters[0].getId());
      commanderRow.getData('rowBg').emit('pointerdown', { rightButtonDown: () => true });

      // 全員の選択が解除される
      for (let i = 0; i < 3; i++) {
        const row = (ui as any).soldierRows.get(mockCharacters[i].getId());
        const mark = row.getData('selectionMark');
        expect(mark.setText).toHaveBeenCalledWith('');
      }
    });

    test('一般兵を右クリックで個別解除', () => {
      ui = new ArmyFormationUI({
        scene,
        base,
      });

      ui.setWaitingSoldiers(mockCharacters);

      // 3人選択
      for (let i = 0; i < 3; i++) {
        const row = (ui as any).soldierRows.get(mockCharacters[i].getId());
        row.getData('rowBg').emit('pointerdown');
      }

      // 2人目（一般兵）を右クリック
      const soldierRow = (ui as any).soldierRows.get(mockCharacters[1].getId());
      soldierRow.getData('rowBg').emit('pointerdown', { rightButtonDown: () => true });

      // 2人目だけ選択解除される
      const mark = soldierRow.getData('selectionMark');
      expect(mark.setText).toHaveBeenLastCalledWith('');

      // 他の兵士は選択されたまま
      const commanderMark = (ui as any).soldierRows
        .get(mockCharacters[0].getId())
        .getData('selectionMark');
      expect(commanderMark.setText).toHaveBeenLastCalledWith('指');
    });
  });

  describe('ボタン制御', () => {
    test('兵士未選択時はアイテム選択ボタンが無効化される', () => {
      ui = new ArmyFormationUI({
        scene,
        base,
      });

      // 初期状態でボタンの背景を取得
      const buttonBg = (ui as any).proceedButton.getData('background');

      // 無効化状態
      expect(buttonBg.setFillStyle).toHaveBeenCalledWith(0x333333);
      expect(buttonBg.disableInteractive).toHaveBeenCalled();
    });

    test('兵士選択後はアイテム選択ボタンが有効化される', () => {
      ui = new ArmyFormationUI({
        scene,
        base,
      });

      ui.setWaitingSoldiers(mockCharacters);

      // 兵士を選択
      const row = (ui as any).soldierRows.get(mockCharacters[0].getId());
      row.getData('rowBg').emit('pointerdown');

      // ボタンが有効化される
      const buttonBg = (ui as any).proceedButton.getData('background');
      expect(buttonBg.setFillStyle).toHaveBeenCalledWith(0x555555);
      expect(buttonBg.setInteractive).toHaveBeenCalledWith({ useHandCursor: true });
    });
  });

  describe('コールバック処理', () => {
    test('アイテム選択ボタンで正しいFormationDataが渡される', () => {
      const onProceed = jest.fn();

      ui = new ArmyFormationUI({
        scene,
        base,
        onProceedToItemSelection: onProceed,
      });

      ui.setWaitingSoldiers(mockCharacters);

      // 軍団を編成（指揮官1 + 一般兵2）
      for (let i = 0; i < 3; i++) {
        const row = (ui as any).soldierRows.get(mockCharacters[i].getId());
        row.getData('rowBg').emit('pointerdown');
      }

      // アイテム選択を実行
      (ui as any).onProceed();

      // 正しいデータ構造でコールバックが呼ばれる
      expect(onProceed).toHaveBeenCalledWith({
        commander: mockCharacters[0],
        soldiers: [mockCharacters[1], mockCharacters[2]],
      });
    });

    test('キャンセルボタンでコールバックが呼ばれる', () => {
      const onCancel = jest.fn();

      ui = new ArmyFormationUI({
        scene,
        base,
        onCancelled: onCancel,
      });

      // キャンセルを実行
      (ui as any).onCancel();

      expect(onCancel).toHaveBeenCalled();
    });
  });

  describe('ホバーエフェクト', () => {
    test('未選択行にホバーすると背景色が変わる', () => {
      ui = new ArmyFormationUI({
        scene,
        base,
      });

      ui.setWaitingSoldiers(mockCharacters);

      const row = (ui as any).soldierRows.get(mockCharacters[0].getId());
      const rowBg = row.getData('rowBg');

      // ホバー開始
      rowBg.emit('pointerover');
      expect(rowBg.setFillStyle).toHaveBeenCalledWith(0x444444, 0.3);

      // ホバー終了
      rowBg.emit('pointerout');
      expect(rowBg.setFillStyle).toHaveBeenCalledWith(0x000000, 0);
    });

    test('選択済み行にホバーしても背景色は変わらない', () => {
      ui = new ArmyFormationUI({
        scene,
        base,
      });

      ui.setWaitingSoldiers(mockCharacters);

      // 兵士を選択
      const row = (ui as any).soldierRows.get(mockCharacters[0].getId());
      const rowBg = row.getData('rowBg');
      rowBg.emit('pointerdown');

      // 選択後の色をクリア
      rowBg.setFillStyle.mockClear();

      // ホバーしても色が変わらない
      rowBg.emit('pointerover');
      expect(rowBg.setFillStyle).not.toHaveBeenCalled();
    });
  });

  describe('完全な編成フロー', () => {
    test('選択、解除、再選択を含む完全なフローが動作する', () => {
      const onProceed = jest.fn();

      ui = new ArmyFormationUI({
        scene,
        base,
        onProceedToItemSelection: onProceed,
      });

      ui.setWaitingSoldiers(mockCharacters);

      // 4人選択
      for (let i = 0; i < 4; i++) {
        const row = (ui as any).soldierRows.get(mockCharacters[i].getId());
        row.getData('rowBg').emit('pointerdown');
      }

      // 3人目を解除
      const thirdRow = (ui as any).soldierRows.get(mockCharacters[2].getId());
      thirdRow.getData('rowBg').emit('pointerdown', { rightButtonDown: () => true });

      // 5人目を新たに選択
      const fifthRow = (ui as any).soldierRows.get(mockCharacters[4].getId());
      fifthRow.getData('rowBg').emit('pointerdown');

      // アイテム選択へ
      (ui as any).onProceed();

      // 最終的な編成が正しい
      expect(onProceed).toHaveBeenCalledWith({
        commander: mockCharacters[0],
        soldiers: [mockCharacters[1], mockCharacters[3], mockCharacters[4]],
      });
    });
  });
});
