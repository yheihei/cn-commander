import * as Phaser from "phaser";

export interface ActionMenuConfig {
  x: number;
  y: number;
  scene: Phaser.Scene;
  onMove?: () => void;
  onCancel?: () => void;
}

export class ActionMenu extends Phaser.GameObjects.Container {
  private background: Phaser.GameObjects.Rectangle;
  private moveButton: Phaser.GameObjects.Container;
  private onMoveCallback?: () => void;
  private onCancelCallback?: () => void;

  constructor(config: ActionMenuConfig) {
    super(config.scene, config.x, config.y);

    this.onMoveCallback = config.onMove;
    this.onCancelCallback = config.onCancel;

    // メニューの背景
    this.background = config.scene.add.rectangle(0, 0, 120, 60, 0x333333, 0.9);
    this.background.setStrokeStyle(2, 0xffffff);
    this.add(this.background);

    // 移動ボタン
    this.moveButton = this.createButton("移動", 0, 0);
    this.add(this.moveButton);

    // Containerを配置
    config.scene.add.existing(this);
    
    // UIレイヤーの最前面に表示
    this.setDepth(999);

    // 入力イベントの設定
    this.setupInputHandlers();

    // 画面外クリックの検知
    this.setupOutsideClickHandler();
  }

  private createButton(text: string, x: number, y: number): Phaser.GameObjects.Container {
    const button = this.scene.add.container(x, y);

    // ボタンの背景
    const buttonBg = this.scene.add.rectangle(0, 0, 100, 40, 0x555555);
    buttonBg.setStrokeStyle(1, 0xaaaaaa);
    buttonBg.setInteractive({ useHandCursor: true });

    // ボタンのテキスト
    const buttonText = this.scene.add.text(0, 0, text, {
      fontSize: "16px",
      color: "#ffffff",
    });
    buttonText.setOrigin(0.5);

    button.add([buttonBg, buttonText]);

    // ホバー効果
    buttonBg.on("pointerover", () => {
      buttonBg.setFillStyle(0x777777);
    });

    buttonBg.on("pointerout", () => {
      buttonBg.setFillStyle(0x555555);
    });

    // クリックイベント
    buttonBg.on("pointerdown", () => {
      if (this.onMoveCallback) {
        this.onMoveCallback();
      }
      this.hide();
    });

    return button;
  }

  private setupInputHandlers(): void {
    // メニュー自体へのクリックはイベントを停止
    this.background.setInteractive();
    this.background.on("pointerdown", (pointer: Phaser.Input.Pointer) => {
      pointer.event.stopPropagation();
    });
  }

  private setupOutsideClickHandler(): void {
    // 画面全体のクリックイベントを監視
    const clickHandler = (pointer: Phaser.Input.Pointer) => {
      // メニューの範囲外をクリックした場合
      const bounds = this.getBounds();
      if (!bounds.contains(pointer.worldX, pointer.worldY)) {
        if (this.onCancelCallback) {
          this.onCancelCallback();
        }
        this.hide();
      }
    };

    // 次のフレームでイベントリスナーを追加（即座に閉じるのを防ぐ）
    this.scene.time.delayedCall(0, () => {
      this.scene.input.on("pointerdown", clickHandler);
      
      // メニューが破棄される時にリスナーを削除
      this.once("destroy", () => {
        this.scene.input.off("pointerdown", clickHandler);
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
    // 画面内に収まるように位置を調整
    const cam = this.scene.cameras.main;
    const menuWidth = 120;
    const menuHeight = 60;

    // 右端チェック
    if (x + menuWidth / 2 > cam.worldView.right) {
      x = cam.worldView.right - menuWidth / 2;
    }

    // 左端チェック
    if (x - menuWidth / 2 < cam.worldView.left) {
      x = cam.worldView.left + menuWidth / 2;
    }

    // 下端チェック
    if (y + menuHeight / 2 > cam.worldView.bottom) {
      y = cam.worldView.bottom - menuHeight / 2;
    }

    // 上端チェック
    if (y - menuHeight / 2 < cam.worldView.top) {
      y = cam.worldView.top + menuHeight / 2;
    }

    return super.setPosition(x, y);
  }
}