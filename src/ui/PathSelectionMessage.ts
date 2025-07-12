import * as Phaser from "phaser";

export class PathSelectionMessage extends Phaser.GameObjects.Container {
  private background: Phaser.GameObjects.Rectangle;
  private messageText: Phaser.GameObjects.Text;
  private onClickCallback?: () => void;

  constructor(scene: Phaser.Scene, onClickCallback?: () => void) {
    // Containerは初期位置0,0で作成
    super(scene, 0, 0);

    this.onClickCallback = onClickCallback;

    // メッセージの背景
    this.background = scene.add.rectangle(0, 0, 400, 44, 0x000000, 0.8);
    this.background.setStrokeStyle(2, 0xffffff);
    this.add(this.background);

    // メッセージテキスト
    this.messageText = scene.add.text(0, 0, "移動経路を4地点まで選択してください", {
      fontSize: "16px",
      color: "#ffffff",
      padding: { x: 4, y: 2 }
    });
    this.messageText.setOrigin(0.5);
    this.add(this.messageText);

    // Containerを配置
    scene.add.existing(this);
    
    // UIレイヤーの最前面に表示
    this.setDepth(1000);
    
    // 初期状態は非表示
    this.setVisible(false);

    // 画面全体のクリックを検知
    this.setupClickHandler();
  }

  private setupClickHandler(): void {
    // 3秒後にイベントリスナーを追加（メッセージを一定時間表示）
    this.scene.time.delayedCall(3000, () => {
      const clickHandler = () => {
        if (this.visible && this.onClickCallback) {
          this.onClickCallback();
        }
      };
      
      this.scene.input.on("pointerdown", clickHandler);
      
      // メッセージが破棄される時にリスナーを削除
      this.once("destroy", () => {
        this.scene.input.off("pointerdown", clickHandler);
      });
    });
  }

  public updateMessage(text: string): void {
    this.messageText.setText(text);
  }

  public show(): void {
    this.setVisible(true);
    
    // カメラの現在のビューポートを取得
    const camera = this.scene.cameras.main;
    
    // カメラの表示範囲の中央下部に配置
    const centerX = camera.worldView.centerX;
    const bottomY = camera.worldView.bottom - 50;
    
    this.setPosition(centerX, bottomY);
    
    console.log('PathSelectionMessage positioned at:', {
      x: centerX,
      y: bottomY,
      worldView: {
        left: camera.worldView.left,
        right: camera.worldView.right,
        top: camera.worldView.top,
        bottom: camera.worldView.bottom,
        centerX: camera.worldView.centerX,
        centerY: camera.worldView.centerY
      }
    });
  }

  public hide(): void {
    this.setVisible(false);
  }
}