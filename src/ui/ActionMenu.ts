import * as Phaser from 'phaser';

export interface ActionMenuConfig {
  x: number;
  y: number;
  scene: Phaser.Scene;
  onMove?: () => void;
  onStandby?: () => void;
  onAttackTarget?: () => void;
  onClearAttackTarget?: () => void;
  onCancel?: () => void;
  hasAttackTarget?: boolean;
}

export class ActionMenu extends Phaser.GameObjects.Container {
  private background: Phaser.GameObjects.Rectangle;
  private moveButton: Phaser.GameObjects.Container;
  private standbyButton: Phaser.GameObjects.Container;
  private attackTargetButton: Phaser.GameObjects.Container;
  private onMoveCallback?: () => void;
  private onStandbyCallback?: () => void;
  private onAttackTargetCallback?: () => void;
  private onClearAttackTargetCallback?: () => void;
  private onCancelCallback?: () => void;
  private hasAttackTarget: boolean;

  constructor(config: ActionMenuConfig) {
    super(config.scene, config.x, config.y);

    this.onMoveCallback = config.onMove;
    this.onStandbyCallback = config.onStandby;
    this.onAttackTargetCallback = config.onAttackTarget;
    this.onClearAttackTargetCallback = config.onClearAttackTarget;
    this.onCancelCallback = config.onCancel;
    this.hasAttackTarget = config.hasAttackTarget || false;

    // メニューの背景（3つのボタン用に高さを調整）
    this.background = config.scene.add.rectangle(0, 0, 120, 160, 0x333333, 0.9);
    this.background.setStrokeStyle(2, 0xffffff);
    this.add(this.background);

    // 移動ボタン
    this.moveButton = this.createButton('移動', 0, -50, () => {
      if (this.onMoveCallback) {
        this.onMoveCallback();
      }
      this.hide();
    });
    this.add(this.moveButton);

    // 攻撃目標指定/解除ボタン
    const attackButtonText = this.hasAttackTarget ? '攻撃目標解除' : '攻撃目標指定';
    const attackButtonCallback = this.hasAttackTarget
      ? () => {
          if (this.onClearAttackTargetCallback) {
            this.onClearAttackTargetCallback();
          }
          this.hide();
        }
      : () => {
          if (this.onAttackTargetCallback) {
            this.onAttackTargetCallback();
          }
          this.hide();
        };

    this.attackTargetButton = this.createButton(attackButtonText, 0, 0, attackButtonCallback);
    this.add(this.attackTargetButton);

    // 待機ボタン
    this.standbyButton = this.createButton('待機', 0, 50, () => {
      if (this.onStandbyCallback) {
        this.onStandbyCallback();
      }
      this.hide();
    });
    this.add(this.standbyButton);

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
      const halfHeight = 80;

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
      this.scene.input.on('pointerdown', clickHandler);

      // メニューが破棄される時にリスナーを削除
      this.once('destroy', () => {
        this.scene.input.off('pointerdown', clickHandler);
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
