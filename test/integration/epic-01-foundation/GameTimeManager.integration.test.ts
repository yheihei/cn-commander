import { GameTimeManager } from '../../../src/time/GameTimeManager';

describe('[エピック1] GameTimeManager Integration Tests', () => {
  let gameTimeManager: GameTimeManager;

  beforeEach(() => {
    gameTimeManager = new GameTimeManager();
  });

  describe('基本動作', () => {
    test('初期状態はポーズされていない', () => {
      expect(gameTimeManager.getIsPaused()).toBe(false);
    });

    test('pause()でポーズ状態になる', () => {
      gameTimeManager.pause();
      expect(gameTimeManager.getIsPaused()).toBe(true);
    });

    test('resume()でポーズが解除される', () => {
      gameTimeManager.pause();
      gameTimeManager.resume();
      expect(gameTimeManager.getIsPaused()).toBe(false);
    });

    test('pause()を複数回呼んでも問題ない', () => {
      gameTimeManager.pause();
      gameTimeManager.pause();
      expect(gameTimeManager.getIsPaused()).toBe(true);
    });

    test('resume()を複数回呼んでも問題ない', () => {
      gameTimeManager.pause();
      gameTimeManager.resume();
      gameTimeManager.resume();
      expect(gameTimeManager.getIsPaused()).toBe(false);
    });
  });

  describe('delta調整', () => {
    test('ポーズ中はupdate()が0を返す', () => {
      gameTimeManager.pause();
      const adjustedDelta = gameTimeManager.update(100);
      expect(adjustedDelta).toBe(0);
    });

    test('通常時はupdate()が渡されたdeltaを返す', () => {
      const delta = 16.67; // 約60FPSのdelta
      const adjustedDelta = gameTimeManager.update(delta);
      expect(adjustedDelta).toBe(delta);
    });

    test('ポーズ→再開でdeltaが正しく返される', () => {
      // 通常時
      let adjustedDelta = gameTimeManager.update(16);
      expect(adjustedDelta).toBe(16);

      // ポーズ
      gameTimeManager.pause();
      adjustedDelta = gameTimeManager.update(16);
      expect(adjustedDelta).toBe(0);

      // 再開
      gameTimeManager.resume();
      adjustedDelta = gameTimeManager.update(16);
      expect(adjustedDelta).toBe(16);
    });
  });

  describe('累積ゲーム時間', () => {
    test('初期状態の累積時間は0', () => {
      expect(gameTimeManager.getTotalElapsedTime()).toBe(0);
    });

    test('update()で累積時間が増加する', () => {
      gameTimeManager.update(100);
      gameTimeManager.update(50);
      expect(gameTimeManager.getTotalElapsedTime()).toBe(150);
    });

    test('ポーズ中は累積時間が増加しない', () => {
      gameTimeManager.update(100);
      gameTimeManager.pause();
      gameTimeManager.update(50);
      gameTimeManager.update(50);

      // ポーズ中の100msは累積されない
      expect(gameTimeManager.getTotalElapsedTime()).toBe(100);
    });

    test('ポーズ→再開後は累積時間が再び増加する', () => {
      gameTimeManager.update(100);
      gameTimeManager.pause();
      gameTimeManager.update(50); // ポーズ中なので加算されない
      gameTimeManager.resume();
      gameTimeManager.update(50);

      expect(gameTimeManager.getTotalElapsedTime()).toBe(150);
    });

    test('reset()で累積時間とポーズ状態がリセットされる', () => {
      gameTimeManager.update(100);
      gameTimeManager.pause();
      gameTimeManager.reset();

      expect(gameTimeManager.getTotalElapsedTime()).toBe(0);
      expect(gameTimeManager.getIsPaused()).toBe(false);
    });
  });

  describe('実使用シナリオ', () => {
    test('ゲーム開始→メニュー表示→メニュー閉じる', () => {
      // ゲーム開始（3フレーム）
      gameTimeManager.update(16);
      gameTimeManager.update(16);
      gameTimeManager.update(16);
      expect(gameTimeManager.getTotalElapsedTime()).toBe(48);

      // メニュー表示でポーズ
      gameTimeManager.pause();
      gameTimeManager.update(16);
      gameTimeManager.update(16);
      // ポーズ中なので時間は進まない
      expect(gameTimeManager.getTotalElapsedTime()).toBe(48);

      // メニューを閉じて再開
      gameTimeManager.resume();
      gameTimeManager.update(16);
      gameTimeManager.update(16);
      expect(gameTimeManager.getTotalElapsedTime()).toBe(80);
    });

    test('複数のモーダルUIが連続して開閉される', () => {
      // 通常プレイ
      gameTimeManager.update(100);

      // モーダルUI1を開く
      gameTimeManager.pause();
      gameTimeManager.update(50); // 停止
      expect(gameTimeManager.getTotalElapsedTime()).toBe(100);

      // モーダルUI1を閉じて即座にモーダルUI2を開く
      gameTimeManager.resume();
      gameTimeManager.pause();
      gameTimeManager.update(50); // 停止
      expect(gameTimeManager.getTotalElapsedTime()).toBe(100);

      // モーダルUI2を閉じる
      gameTimeManager.resume();
      gameTimeManager.update(100);
      expect(gameTimeManager.getTotalElapsedTime()).toBe(200);
    });

    test('長時間のポーズでも問題ない', () => {
      gameTimeManager.update(100);
      gameTimeManager.pause();

      // 1000フレーム分ポーズ
      for (let i = 0; i < 1000; i++) {
        gameTimeManager.update(16);
      }

      // 時間は進んでいない
      expect(gameTimeManager.getTotalElapsedTime()).toBe(100);

      // 再開後は正常に動作
      gameTimeManager.resume();
      gameTimeManager.update(100);
      expect(gameTimeManager.getTotalElapsedTime()).toBe(200);
    });
  });

  describe('境界値', () => {
    test('delta=0でも正常に動作する', () => {
      const adjustedDelta = gameTimeManager.update(0);
      expect(adjustedDelta).toBe(0);
      expect(gameTimeManager.getTotalElapsedTime()).toBe(0);
    });

    test('非常に大きなdelta値でも正常に動作する', () => {
      const largeDelta = 10000; // 10秒
      const adjustedDelta = gameTimeManager.update(largeDelta);
      expect(adjustedDelta).toBe(largeDelta);
      expect(gameTimeManager.getTotalElapsedTime()).toBe(largeDelta);
    });

    test('非常に小さなdelta値でも正常に動作する', () => {
      const smallDelta = 0.001;
      const adjustedDelta = gameTimeManager.update(smallDelta);
      expect(adjustedDelta).toBe(smallDelta);
      expect(gameTimeManager.getTotalElapsedTime()).toBe(smallDelta);
    });
  });
});
