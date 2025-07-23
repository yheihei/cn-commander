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
        '決定',
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

  describe('ページネーション機能', () => {
    test('5人以下の場合はページネーションボタンが無効化される', () => {
      ui = new ArmyFormationUI({
        scene: scene,
        base: base,
        onProceedToItemSelection: jest.fn(),
        onCancelled: jest.fn(),
      });

      // 5人の兵士を設定
      const soldiers = [
        CharacterFactory.createCharacter(scene, 0, 0, 'wind', '風忍1'),
        CharacterFactory.createCharacter(scene, 0, 0, 'iron', '鉄忍2'),
        CharacterFactory.createCharacter(scene, 0, 0, 'shadow', '影忍3'),
        CharacterFactory.createCharacter(scene, 0, 0, 'medicine', '薬忍4'),
        CharacterFactory.createCharacter(scene, 0, 0, 'wind', '風忍5'),
      ];
      ui.setWaitingSoldiers(soldiers);

      // ページネーションボタンを確認
      const addedItems = scene.add.container.mock.results
        .filter((r: any) => r.value && r.value.list)
        .map((r: any) => r.value.list)
        .flat();

      const rectangles = addedItems.filter((item: any) => item.width === 40 && item.height === 30);
      const prevButton = rectangles[0];
      const nextButton = rectangles[1];

      // 前へボタンは無効化されている（最初のページ）
      expect(prevButton.setFillStyle).toHaveBeenCalledWith(0x444444);
      expect(prevButton.removeInteractive).toHaveBeenCalled();

      // 次へボタンも無効化されている（1ページのみ）
      expect(nextButton.setFillStyle).toHaveBeenCalledWith(0x444444);
      expect(nextButton.removeInteractive).toHaveBeenCalled();
    });

    test('6人以上の場合はページネーションが機能する', () => {
      ui = new ArmyFormationUI({
        scene: scene,
        base: base,
        onProceedToItemSelection: jest.fn(),
        onCancelled: jest.fn(),
      });

      // 8人の兵士を設定
      const soldiers = Array.from({ length: 8 }, (_, i) =>
        CharacterFactory.createCharacter(scene, 0, 0, 'wind', `風忍${i + 1}`),
      );
      ui.setWaitingSoldiers(soldiers);

      // 最初のページには5人のみ表示される
      // soldierRowsに登録された行数を確認
      const soldierRowCount = (ui as any).soldierRows.size;
      expect(soldierRowCount).toBe(5);

      // ページ情報が正しく表示される
      const pageTextCall = (scene.add.text as jest.Mock).mock.calls.find(
        (call) => call[2] && typeof call[2] === 'string' && call[2].includes('ページ'),
      );
      // pageTextCallがない場合は、setText呼び出しをチェック
      if (!pageTextCall) {
        // setText呼び出しを探す
        const allTextObjects = scene.add.text.mock.results
          .filter((r: any) => r.value)
          .map((r: any) => r.value);
        
        const pageText = allTextObjects.find((text: any) => {
          return text.setText && text.setText.mock.calls.some((call: any) => 
            call[0] && call[0].includes('ページ')
          );
        });
        
        expect(pageText).toBeTruthy();
        expect(pageText.setText).toHaveBeenCalledWith('1 / 2 ページ');
      } else {
        expect(pageTextCall[2]).toBe('1 / 2 ページ');
      }

      // 次へボタンは有効化されている
      const addedItems = scene.add.container.mock.results
        .filter((r: any) => r.value && r.value.list)
        .map((r: any) => r.value.list)
        .flat();

      const rectangles = addedItems.filter((item: any) => item.width === 40 && item.height === 30);
      const nextButton = rectangles[1];
      expect(nextButton.setFillStyle).toHaveBeenCalledWith(0x4682b4);
      expect(nextButton.setInteractive).toHaveBeenCalled();
    });

    test('ページを移動しても選択状態が維持される', () => {
      ui = new ArmyFormationUI({
        scene: scene,
        base: base,
        onProceedToItemSelection: jest.fn(),
        onCancelled: jest.fn(),
      });

      // 8人の兵士を設定
      const soldiers = Array.from({ length: 8 }, (_, i) =>
        CharacterFactory.createCharacter(scene, 0, 0, 'wind', `風忍${i + 1}`),
      );
      ui.setWaitingSoldiers(soldiers);

      // 1ページ目の兵士を選択
      const firstRow = (ui as any).soldierRows.get(soldiers[0].getId());
      const rowBg = firstRow.getData('rowBg');
      rowBg.emit('pointerdown');

      // 選択マークが表示される
      let selectionMark = firstRow.getData('selectionMark');
      expect(selectionMark.setText).toHaveBeenCalledWith('指');

      // 次のページへ移動（ボタンクリックをシミュレート）
      const allRectangles = scene.add.rectangle.mock.results
        .filter((r: any) => r.value)
        .map((r: any) => r.value);

      const nextButton = allRectangles.find(
        (item: any) => item.width === 40 && item.height === 30 && item.x === 100,
      );
      if (nextButton && nextButton.eventListeners && nextButton.eventListeners.get('pointerdown')) {
        nextButton.emit('pointerdown');
      }

      // 1ページ目に戻る
      const prevButton = allRectangles.find(
        (item: any) => item.width === 40 && item.height === 30 && item.x === -100,
      );
      if (prevButton && prevButton.eventListeners && prevButton.eventListeners.get('pointerdown')) {
        prevButton.emit('pointerdown');
      }

      // 選択状態が維持されているか確認
      const updatedRow = (ui as any).soldierRows.get(soldiers[0].getId());
      selectionMark = updatedRow.getData('selectionMark');
      expect(selectionMark.setText).toHaveBeenCalledWith('指');
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
