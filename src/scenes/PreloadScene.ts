import * as Phaser from 'phaser';
import { TILEMAP_ASSETS } from '../config/mapConfig';

export class PreloadScene extends Phaser.Scene {
  constructor() {
    super({ key: 'PreloadScene' });
  }

  preload(): void {
    // プログレスバーの作成
    const width = this.cameras.main.width;
    const height = this.cameras.main.height;

    const progressBar = this.add.graphics();
    const progressBox = this.add.graphics();
    progressBox.fillStyle(0x222222, 0.8);
    progressBox.fillRect(width / 2 - 160, height / 2 - 25, 320, 50);

    const loadingText = this.make.text({
      x: width / 2,
      y: height / 2 - 50,
      text: 'Loading...',
      style: {
        font: '20px monospace',
        color: '#ffffff',
      },
    });
    loadingText.setOrigin(0.5, 0.5);

    const percentText = this.make.text({
      x: width / 2,
      y: height / 2,
      text: '0%',
      style: {
        font: '18px monospace',
        color: '#ffffff',
      },
    });
    percentText.setOrigin(0.5, 0.5);

    const assetText = this.make.text({
      x: width / 2,
      y: height / 2 + 50,
      text: '',
      style: {
        font: '18px monospace',
        color: '#ffffff',
      },
    });
    assetText.setOrigin(0.5, 0.5);

    // ローディングイベント
    this.load.on('progress', (value: number) => {
      percentText.setText(`${parseInt((value * 100).toString())}%`);
      progressBar.clear();
      progressBar.fillStyle(0xffffff, 1);
      progressBar.fillRect(width / 2 - 150, height / 2 - 15, 300 * value, 30);
    });

    this.load.on('fileprogress', (file: { key: string }) => {
      assetText.setText(`Loading asset: ${file.key}`);
    });

    this.load.on('complete', () => {
      progressBar.destroy();
      progressBox.destroy();
      loadingText.destroy();
      percentText.destroy();
      assetText.destroy();

      // ゲームシーンへ遷移
      this.scene.start('GameScene');
    });

    // タイルマップアセットの読み込み
    this.loadTilemapAssets();

    // キャラクターアセットの読み込み
    this.loadCharacterAssets();

    // マップデータの読み込み
    this.loadMapData();

    // 戦闘エフェクトの読み込み
    this.loadCombatEffects();

    // 効果音の読み込み
    this.loadSoundAssets();
    
    // 拠点アセットの読み込み
    this.loadBaseAssets();
  }

  private loadTilemapAssets(): void {
    // 各タイルマップ画像を読み込み
    // 16x16のタイルセットとして読み込む
    const tileSize = 16;

    this.load.spritesheet('tilemap-base', `assets/images/tilemaps/${TILEMAP_ASSETS.base}.png`, {
      frameWidth: tileSize,
      frameHeight: tileSize,
    });

    this.load.spritesheet('tilemap-road', `assets/images/tilemaps/${TILEMAP_ASSETS.road}.png`, {
      frameWidth: tileSize,
      frameHeight: tileSize,
    });

    this.load.spritesheet('tilemap-forest', `assets/images/tilemaps/${TILEMAP_ASSETS.forest}.png`, {
      frameWidth: tileSize,
      frameHeight: tileSize,
    });

    this.load.spritesheet('tilemap-desert', `assets/images/tilemaps/${TILEMAP_ASSETS.desert}.png`, {
      frameWidth: tileSize,
      frameHeight: tileSize,
    });

    this.load.spritesheet('tilemap-soil', `assets/images/tilemaps/${TILEMAP_ASSETS.soil}.png`, {
      frameWidth: tileSize,
      frameHeight: tileSize,
    });

    this.load.spritesheet('tilemap-sea', `assets/images/tilemaps/${TILEMAP_ASSETS.sea}.png`, {
      frameWidth: tileSize,
      frameHeight: tileSize,
    });

    this.load.spritesheet(
      'tilemap-mountain1',
      `assets/images/tilemaps/${TILEMAP_ASSETS.mountain1}.png`,
      { frameWidth: tileSize, frameHeight: tileSize },
    );

    this.load.spritesheet(
      'tilemap-mountain2',
      `assets/images/tilemaps/${TILEMAP_ASSETS.mountain2}.png`,
      { frameWidth: tileSize, frameHeight: tileSize },
    );

    this.load.spritesheet(
      'tilemap-mountain3',
      `assets/images/tilemaps/${TILEMAP_ASSETS.mountain3}.png`,
      { frameWidth: tileSize, frameHeight: tileSize },
    );
  }

  private loadCharacterAssets(): void {
    // 咲耶のキャラクター画像を読み込み
    // 16x16のキャラクタースプライトとして読み込む
    this.load.spritesheet('sakuya', 'assets/images/characters/Sakuya-1.png', {
      frameWidth: 16,
      frameHeight: 16,
    });

    // キャラクター顔画像を読み込み
    // 一時的に全キャラクターで咲耶の顔画像を使用
    this.load.image('characterFace', 'assets/images/characters/SakuyaFace.jpg');
  }

  private loadMapData(): void {
    // テスト用マップデータを読み込み
    this.load.json('testMap', 'assets/data/maps/testMap.json');
  }

  private loadCombatEffects(): void {
    // 手裏剣画像を読み込み
    this.load.image('shuriken', 'assets/images/weapons/shuriken.png');

    // 爆発エフェクトを個別に読み込み
    for (let i = 1; i <= 7; i++) {
      this.load.image(`explode-${i}`, `assets/images/effects/explode-${i}.png`);
    }
  }

  private loadSoundAssets(): void {
    // 敵発見時の効果音を読み込み
    this.load.audio('enemyFound', 'assets/sounds/EnemyFound.mp3');
  }
  
  private loadBaseAssets(): void {
    // pipo-map001.pngを読み込み（城のスプライトを含む）
    this.load.spritesheet('tilemap', 'assets/images/tilemaps/pipo-map001.png', {
      frameWidth: 16,
      frameHeight: 16,
    });
    
    // アイコン用のダミー画像（今は武器画像を流用）
    this.load.image('icons', 'assets/images/weapons/shuriken.png');
  }

  create(): void {
    // アセットのロードが完了したら自動的にcompleteイベントが発火し、
    // GameSceneへ遷移する
  }
}
