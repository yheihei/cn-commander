import * as Phaser from 'phaser';

export default class BootScene extends Phaser.Scene {
  private loadingText?: Phaser.GameObjects.Text;
  private progressBar?: Phaser.GameObjects.Graphics;
  private progressBox?: Phaser.GameObjects.Graphics;

  constructor() {
    super({ key: 'BootScene' });
  }

  preload(): void {
    const width = this.cameras.main.width;
    const height = this.cameras.main.height;

    // ロゴテキスト
    const logoText = this.add.text(width / 2, height / 2 - 100, 'クリプト忍者咲耶コマンダー', {
      font: '48px sans-serif',
      color: '#ffffff',
    });
    logoText.setOrigin(0.5, 0.5);

    // プログレスボックス（背景）
    this.progressBox = this.add.graphics();
    this.progressBox.fillStyle(0x222222, 0.8);
    this.progressBox.fillRect(width / 2 - 160, height / 2, 320, 50);

    // プログレスバー
    this.progressBar = this.add.graphics();

    // ローディングテキスト
    this.loadingText = this.add.text(width / 2, height / 2 + 60, 'Loading...', {
      font: '20px sans-serif',
      color: '#ffffff',
    });
    this.loadingText.setOrigin(0.5, 0.5);

    // アセットの読み込み進捗を監視
    this.load.on('progress', (value: number) => {
      if (this.progressBar) {
        this.progressBar.clear();
        this.progressBar.fillStyle(0xffffff, 1);
        this.progressBar.fillRect(width / 2 - 150, height / 2 + 10, 300 * value, 30);
      }

      if (this.loadingText) {
        this.loadingText.setText(`Loading... ${Math.floor(value * 100)}%`);
      }
    });

    this.load.on('complete', () => {
      if (this.progressBar) {
        this.progressBar.destroy();
      }
      if (this.progressBox) {
        this.progressBox.destroy();
      }
      if (this.loadingText) {
        this.loadingText.destroy();
      }
    });

    // ここで実際のアセットを読み込む
    // 例: this.load.image('ninja', 'assets/images/ninja.png');
    // 例: this.load.spritesheet('tiles', 'assets/images/tiles.png', { frameWidth: 16, frameHeight: 16 });
  }

  create(): void {
    // タイトル画面のテキストを表示
    const titleText = this.add.text(
      this.cameras.main.centerX,
      this.cameras.main.centerY - 50,
      'クリプト忍者咲耶コマンダー',
      {
        font: '48px sans-serif',
        color: '#ffffff',
        align: 'center',
        lineSpacing: 10,
      },
    );
    titleText.setOrigin(0.5);

    // 開始ボタン
    const startButton = this.add.text(
      this.cameras.main.centerX,
      this.cameras.main.centerY + 50,
      'クリックして開始',
      {
        font: '24px sans-serif',
        color: '#ffffff',
        backgroundColor: '#444444',
        padding: { x: 20, y: 10 },
      },
    );
    startButton.setOrigin(0.5);
    startButton.setInteractive();

    // ホバー効果
    startButton.on('pointerover', () => {
      startButton.setBackgroundColor('#666666');
    });

    startButton.on('pointerout', () => {
      startButton.setBackgroundColor('#444444');
    });

    // クリックでPreloadSceneへ遷移
    startButton.on('pointerdown', () => {
      this.scene.start('PreloadScene');
    });

    // FPS表示（デバッグ用）
    this.add.text(10, 10, 'FPS: 30', {
      font: '16px sans-serif',
      color: '#00ff00',
    });

    // 解像度情報表示（デバッグ用）
    this.add.text(10, 30, `Resolution: ${this.game.config.width}x${this.game.config.height}`, {
      font: '16px sans-serif',
      color: '#00ff00',
    });
  }

  update(_time: number, _delta: number): void {
    // FPS表示を更新
    const fps = this.game.loop.actualFps;
    const fpsText = this.children.list[this.children.list.length - 2] as Phaser.GameObjects.Text;
    if (fpsText) {
      fpsText.setText(`FPS: ${Math.round(fps)}`);
    }
  }
}
