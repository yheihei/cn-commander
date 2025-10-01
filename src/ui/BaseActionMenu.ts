import * as Phaser from 'phaser';

export interface BaseActionMenuConfig {
  x: number;
  y: number;
  scene: Phaser.Scene;
  onBarracks?: () => void;
  onFactory?: () => void;
  onHospital?: () => void;
  onWarehouse?: () => void;
  onCancel?: () => void;
}

export class BaseActionMenu extends Phaser.GameObjects.Container {
  private background: Phaser.GameObjects.Rectangle;
  private barracksButton: Phaser.GameObjects.Container;
  private factoryButton: Phaser.GameObjects.Container;
  private hospitalButton: Phaser.GameObjects.Container;
  private warehouseButton: Phaser.GameObjects.Container;
  private onBarracksCallback?: () => void;
  private onFactoryCallback?: () => void;
  private onHospitalCallback?: () => void;
  private onWarehouseCallback?: () => void;
  private onCancelCallback?: () => void;

  constructor(config: BaseActionMenuConfig) {
    super(config.scene, config.x, config.y);

    this.onBarracksCallback = config.onBarracks;
    this.onFactoryCallback = config.onFactory;
    this.onHospitalCallback = config.onHospital;
    this.onWarehouseCallback = config.onWarehouse;
    this.onCancelCallback = config.onCancel;

    // メニューの背景（4つのボタン用に高さを調整）
    this.background = config.scene.add.rectangle(0, 0, 120, 210, 0x333333, 0.9);
    this.background.setStrokeStyle(2, 0xffffff);
    this.add(this.background);

    // 兵舎ボタン
    this.barracksButton = this.createButton('兵舎', 0, -75, () => {
      if (this.onBarracksCallback) {
        this.onBarracksCallback();
      }
      this.hide();
    });
    this.add(this.barracksButton);

    // 生産工場ボタン
    this.factoryButton = this.createButton('生産工場', 0, -25, () => {
      if (this.onFactoryCallback) {
        this.onFactoryCallback();
      }
      this.hide();
    });
    this.add(this.factoryButton);

    // 医療施設ボタン
    this.hospitalButton = this.createButton('医療施設', 0, 25, () => {
      if (this.onHospitalCallback) {
        this.onHospitalCallback();
      }
      this.hide();
    });
    this.add(this.hospitalButton);

    // 倉庫ボタン
    this.warehouseButton = this.createButton('倉庫', 0, 75, () => {
      if (this.onWarehouseCallback) {
        this.onWarehouseCallback();
      }
      this.hide();
    });
    this.add(this.warehouseButton);

    // Containerを配置
    config.scene.add.existing(this);

    // UIレイヤーの最前面に表示
    this.setDepth(999);

    // 入力イベントの設定
    this.setupInputHandlers();

    // 画面外クリックの検知
    this.setupOutsideClickHandler();
  }

  private createButton(
    text: string,
    x: number,
    y: number,
    onClick: () => void,
  ): Phaser.GameObjects.Container {
    const button = this.scene.add.container(x, y);

    // ボタンの背景
    const buttonBg = this.scene.add.rectangle(0, 0, 100, 40, 0x555555);
    buttonBg.setStrokeStyle(1, 0xaaaaaa);
    buttonBg.setInteractive({ useHandCursor: true });

    // ボタンのテキスト（ピクセルパーフェクト設定）
    const buttonText = this.scene.add.text(0, 0, text, {
      fontSize: '14px',
      fontFamily: 'monospace, "Courier New", Courier',
      color: '#ffffff',
      resolution: 2,
      padding: { x: 2, y: 2 },
    });
    buttonText.setOrigin(0.5);
    // ピクセルパーフェクトレンダリングのため位置を整数に丸める（テスト環境では省略）
    if (buttonText.setPosition) {
      buttonText.setPosition(Math.round(buttonText.x), Math.round(buttonText.y));
    }

    button.add([buttonBg, buttonText]);

    // ホバー効果
    buttonBg.on('pointerover', () => {
      buttonBg.setFillStyle(0x777777);
    });

    buttonBg.on('pointerout', () => {
      buttonBg.setFillStyle(0x555555);
    });

    // クリックイベント
    buttonBg.on('pointerdown', onClick);

    return button;
  }

  private setupInputHandlers(): void {
    // メニュー自体へのクリックはイベントを停止
    this.background.setInteractive();
    this.background.on('pointerdown', (pointer: Phaser.Input.Pointer) => {
      pointer.event.stopPropagation();
    });
  }

  private setupOutsideClickHandler(): void {
    // 画面全体のクリックイベントを監視
    const clickHandler = (pointer: Phaser.Input.Pointer) => {
      // sceneが破棄されている場合は処理をスキップ
      if (!this.scene || !this.scene.cameras) {
        return;
      }

      // メニューの画面座標での範囲を計算
      const cam = this.scene.cameras.main;
      const menuScreenX = this.x - cam.worldView.x;
      const menuScreenY = this.y - cam.worldView.y;
      const halfWidth = 60;
      const halfHeight = 105;

      // メニューの範囲外をクリックした場合（画面座標で判定）
      if (
        pointer.x < menuScreenX - halfWidth ||
        pointer.x > menuScreenX + halfWidth ||
        pointer.y < menuScreenY - halfHeight ||
        pointer.y > menuScreenY + halfHeight
      ) {
        if (this.onCancelCallback) {
          this.onCancelCallback();
        }
        this.hide();
      }
    };

    // 次のフレームでイベントリスナーを追加（即座に閉じるのを防ぐ）
    this.scene.time.delayedCall(0, () => {
      // UIが破棄されている場合は処理をスキップ
      if (!this.scene || !this.active) {
        return;
      }

      this.scene.input.on('pointerdown', clickHandler);

      // メニューが破棄される時にリスナーを削除
      this.once('destroy', () => {
        if (this.scene && this.scene.input) {
          this.scene.input.off('pointerdown', clickHandler);
        }
      });
    });
  }

  public show(): void {
    this.setVisible(true);
    this.setActive(true);
  }

  public hide(): void {
    this.destroy();
  }

  public setPosition(x: number, y: number): this {
    // 固定位置UIとして設定（引数のx,yはワールド座標として受け取る）
    return super.setPosition(x, y);
  }

  public updateFixedPosition(screenX: number, screenY: number): void {
    // 画面座標からワールド座標に変換して配置
    const cam = this.scene.cameras.main;
    const worldX = cam.worldView.x + screenX;
    const worldY = cam.worldView.y + screenY;
    this.setPosition(worldX, worldY);
  }
}
