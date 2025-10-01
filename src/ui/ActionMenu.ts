import * as Phaser from 'phaser';

export interface ActionMenuConfig {
  x: number;
  y: number;
  scene: Phaser.Scene;
  onMove?: () => void;
  onStandby?: () => void;
  onAttackTarget?: () => void;
  onClearAttackTarget?: () => void;
  onInventory?: () => void;
  onGarrison?: () => void;
  onOccupy?: () => void;
  onCancel?: () => void;
  hasAttackTarget?: boolean;
  canGarrison?: boolean;
  canOccupy?: boolean;
}

export class ActionMenu extends Phaser.GameObjects.Container {
  private background: Phaser.GameObjects.Rectangle;
  private moveButton: Phaser.GameObjects.Container;
  private standbyButton: Phaser.GameObjects.Container;
  private attackTargetButton: Phaser.GameObjects.Container;
  private inventoryButton: Phaser.GameObjects.Container;
  private garrisonButton: Phaser.GameObjects.Container | null = null;
  private occupyButton: Phaser.GameObjects.Container | null = null;
  private onMoveCallback?: () => void;
  private onStandbyCallback?: () => void;
  private onAttackTargetCallback?: () => void;
  private onClearAttackTargetCallback?: () => void;
  private onInventoryCallback?: () => void;
  private onGarrisonCallback?: () => void;
  private onOccupyCallback?: () => void;
  private onCancelCallback?: () => void;
  private hasAttackTarget: boolean;
  private canGarrison: boolean;
  private canOccupy: boolean;

  constructor(config: ActionMenuConfig) {
    super(config.scene, config.x, config.y);

    this.onMoveCallback = config.onMove;
    this.onStandbyCallback = config.onStandby;
    this.onAttackTargetCallback = config.onAttackTarget;
    this.onClearAttackTargetCallback = config.onClearAttackTarget;
    this.onInventoryCallback = config.onInventory;
    this.onGarrisonCallback = config.onGarrison;
    this.onOccupyCallback = config.onOccupy;
    this.onCancelCallback = config.onCancel;
    this.hasAttackTarget = config.hasAttackTarget || false;
    this.canGarrison = config.canGarrison || false;
    this.canOccupy = config.canOccupy || false;

    console.log('[ActionMenu] canGarrison:', this.canGarrison);
    console.log('[ActionMenu] canOccupy:', this.canOccupy);

    // メニューの背景（駐留ボタンや占領ボタンがある場合は高さを調整）
    let buttonCount = 4; // 基本ボタン数（移動、攻撃目標、待機、持物）
    if (this.canGarrison) buttonCount++;
    if (this.canOccupy) buttonCount++;
    const menuHeight = 60 + buttonCount * 50;
    this.background = config.scene.add.rectangle(0, 0, 120, menuHeight, 0x333333, 0.9);
    this.background.setStrokeStyle(2, 0xffffff);
    this.add(this.background);

    // ボタンの垂直間隔を調整
    const buttonSpacing = 50;
    let currentY = -(menuHeight / 2) + 50;

    // 移動ボタン
    this.moveButton = this.createButton('移動', 0, currentY, () => {
      if (this.onMoveCallback) {
        this.onMoveCallback();
      }
      this.hide();
    });
    this.add(this.moveButton);
    currentY += buttonSpacing;

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

    this.attackTargetButton = this.createButton(
      attackButtonText,
      0,
      currentY,
      attackButtonCallback,
    );
    this.add(this.attackTargetButton);
    currentY += buttonSpacing;

    // 待機ボタン
    this.standbyButton = this.createButton('待機', 0, currentY, () => {
      if (this.onStandbyCallback) {
        this.onStandbyCallback();
      }
      this.hide();
    });
    this.add(this.standbyButton);
    currentY += buttonSpacing;

    // 持物ボタン
    this.inventoryButton = this.createButton('持物', 0, currentY, () => {
      if (this.onInventoryCallback) {
        this.onInventoryCallback();
      }
      this.hide();
    });
    this.add(this.inventoryButton);
    currentY += buttonSpacing;

    // 駐留ボタン（駐留可能な場合のみ）
    if (this.canGarrison) {
      console.log('[ActionMenu] 駐留ボタンを作成します');
      this.garrisonButton = this.createButton('駐留', 0, currentY, () => {
        if (this.onGarrisonCallback) {
          this.onGarrisonCallback();
        }
        this.hide();
      });
      this.add(this.garrisonButton);
      console.log('[ActionMenu] 駐留ボタンを追加しました');
      currentY += buttonSpacing;
    } else {
      console.log('[ActionMenu] 駐留ボタンは作成されません（canGarrison=false）');
    }

    // 占領ボタン（占領可能な場合のみ）
    if (this.canOccupy) {
      console.log('[ActionMenu] 占領ボタンを作成します');
      this.occupyButton = this.createButton('占領', 0, currentY, () => {
        if (this.onOccupyCallback) {
          this.onOccupyCallback();
        }
        this.hide();
      });
      this.add(this.occupyButton);
      console.log('[ActionMenu] 占領ボタンを追加しました');
    } else {
      console.log('[ActionMenu] 占領ボタンは作成されません（canOccupy=false）');
    }

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
      const halfHeight = this.canGarrison ? 105 : 80;

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
