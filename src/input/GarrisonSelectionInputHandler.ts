import * as Phaser from 'phaser';
import { Base } from '../base/Base';
import { BaseManager } from '../base/BaseManager';
import { UIManager } from '../ui/UIManager';

/**
 * 駐留先拠点選択ハンドラー
 * 軍団の駐留先となる拠点を選択するための専用入力ハンドラー
 */
export class GarrisonSelectionInputHandler {
  private scene: Phaser.Scene;
  private baseManager: BaseManager;
  private selectableBases: Base[];
  private onBaseSelected: (base: Base) => void;
  private onCancel: () => void;
  private uiManager: UIManager;
  private isActive = true;
  private hoveredBase: Base | null = null;

  constructor(
    scene: Phaser.Scene,
    baseManager: BaseManager,
    selectableBases: Base[],
    onBaseSelected: (base: Base) => void,
    onCancel: () => void,
    uiManager: UIManager,
  ) {
    this.scene = scene;
    this.baseManager = baseManager;
    this.selectableBases = selectableBases;
    this.onBaseSelected = onBaseSelected;
    this.onCancel = onCancel;
    this.uiManager = uiManager;

    console.log(
      'GarrisonSelectionInputHandler: 駐留先選択モード開始',
      `選択可能拠点数: ${selectableBases.length}`,
    );

    this.highlightBases();
    this.setupInputHandlers();
  }

  /**
   * 入力ハンドラのセットアップ
   */
  private setupInputHandlers(): void {
    this.scene.input.on('pointerdown', this.handlePointerDown);
    this.scene.input.on('pointermove', this.handlePointerMove);
  }

  /**
   * ポインタダウンハンドラ
   */
  private handlePointerDown = (pointer: Phaser.Input.Pointer): void => {
    if (!this.isActive) return;

    // 右クリックでキャンセル
    if (pointer.rightButtonDown()) {
      console.log('GarrisonSelectionInputHandler: 右クリックでキャンセル');
      this.cancel();
      return;
    }

    // 左クリックで拠点選択
    if (pointer.leftButtonDown()) {
      const worldPoint = pointer.positionToCamera(this.scene.cameras.main) as Phaser.Math.Vector2;
      const base = this.findBaseAtPosition(worldPoint.x, worldPoint.y);

      if (base && this.selectableBases.includes(base)) {
        console.log('GarrisonSelectionInputHandler: 拠点選択', base.getName());
        this.selectBase(base);
      }
    }
  };

  /**
   * ポインタ移動ハンドラ
   */
  private handlePointerMove = (pointer: Phaser.Input.Pointer): void => {
    if (!this.isActive) return;

    const worldPoint = pointer.positionToCamera(this.scene.cameras.main) as Phaser.Math.Vector2;
    const base = this.findBaseAtPosition(worldPoint.x, worldPoint.y);

    // ホバー状態の更新
    if (base !== this.hoveredBase) {
      // 前のホバーを解除
      if (this.hoveredBase && this.selectableBases.includes(this.hoveredBase)) {
        this.hoveredBase.setHovered(false);
      }

      // 新しいホバーを設定
      if (base && this.selectableBases.includes(base)) {
        base.setHovered(true);
        this.scene.input.setDefaultCursor('pointer');
      } else {
        this.scene.input.setDefaultCursor('default');
      }

      this.hoveredBase = base;
    }
  };

  /**
   * 指定位置の拠点を検索
   */
  private findBaseAtPosition(x: number, y: number): Base | null {
    // ワールド座標からタイル座標に変換
    const tileX = Math.floor(x / 16);
    const tileY = Math.floor(y / 16);

    // 拠点の検索（拠点は2x2タイルなので、周囲のタイルも確認）
    for (let dx = 0; dx <= 1; dx++) {
      for (let dy = 0; dy <= 1; dy++) {
        const base = this.baseManager.getBaseAtPosition(tileX - dx, tileY - dy);
        if (base) {
          return base;
        }
      }
    }

    return null;
  }

  /**
   * 選択可能な拠点をハイライト
   */
  private highlightBases(): void {
    this.selectableBases.forEach((base) => {
      base.setHighlighted(true, 0xffff00); // 黄色でハイライト
    });
  }

  /**
   * ハイライトをクリア
   */
  private clearHighlights(): void {
    this.selectableBases.forEach((base) => {
      base.setHighlighted(false);
      base.setHovered(false);
    });
  }

  /**
   * 拠点を選択
   */
  private selectBase(base: Base): void {
    this.cleanup();
    this.onBaseSelected(base);

    // 成功メッセージを表示
    this.uiManager.showGuideMessage(`軍団を${base.getName()}に駐留させました`);

    // 3秒後にメッセージを消す
    this.scene.time.delayedCall(3000, () => {
      this.uiManager.hideGuideMessage();
    });
  }

  /**
   * キャンセル処理
   */
  private cancel(): void {
    this.cleanup();
    this.onCancel();
    this.uiManager.hideGuideMessage();
  }

  /**
   * クリーンアップ
   */
  private cleanup(): void {
    this.isActive = false;
    this.clearHighlights();

    // カーソルをデフォルトに戻す
    this.scene.input.setDefaultCursor('default');

    // イベントハンドラを解除
    this.scene.input.off('pointerdown', this.handlePointerDown);
    this.scene.input.off('pointermove', this.handlePointerMove);

    console.log('GarrisonSelectionInputHandler: クリーンアップ完了');
  }

  /**
   * 破棄
   */
  public destroy(): void {
    this.cleanup();
  }
}
