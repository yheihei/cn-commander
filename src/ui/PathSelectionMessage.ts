import * as Phaser from "phaser";

export class PathSelectionMessage extends Phaser.GameObjects.Container {
  private background: Phaser.GameObjects.Rectangle;
  private messageText: Phaser.GameObjects.Text;
  private onClickCallback?: () => void;

  constructor(scene: Phaser.Scene, onClickCallback?: () => void) {
    // 画面の中央下部に配置（画面下部から70ピクセル上）
    // カメラのズームに関係なく、実際の画面座標を使用
    const screenCenterX = scene.scale.width / 2;
    const screenBottomY = scene.scale.height - 70;
    super(scene, screenCenterX, screenBottomY);

    this.onClickCallback = onClickCallback;

    // メッセージの背景
    this.background = scene.add.rectangle(0, 0, 400, 40, 0x000000, 0.8);
    this.background.setStrokeStyle(2, 0xffffff);
    this.add(this.background);

    // メッセージテキスト
    this.messageText = scene.add.text(0, 0, "移動経路を4地点まで選択してください", {
      fontSize: "18px",
      color: "#ffffff",
    });
    this.messageText.setOrigin(0.5);
    this.add(this.messageText);

    // Containerを配置
    scene.add.existing(this);
    
    // UIレイヤーの最前面に表示
    this.setDepth(1000);
    
    // カメラのスクロールに影響されないようにする
    this.setScrollFactor(0);

    // 画面全体のクリックを検知
    this.setupClickHandler();
  }

  private setupClickHandler(): void {
    // 次のフレームでイベントリスナーを追加（即座に閉じるのを防ぐ）
    this.scene.time.delayedCall(100, () => {
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
  }

  public hide(): void {
    this.setVisible(false);
  }
}