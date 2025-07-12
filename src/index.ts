import * as Phaser from 'phaser';
import gameConfig from './config/gameConfig';
import BootScene from './scenes/BootScene';
import { PreloadScene } from './scenes/PreloadScene';
import { GameScene } from './scenes/GameScene';

// シーンを設定に追加
gameConfig.scene = [BootScene, PreloadScene, GameScene];

// ゲームインスタンスを作成
const game = new Phaser.Game(gameConfig);

// グローバルに公開（デバッグ用）
if (typeof window !== 'undefined') {
  (window as any).game = game;
}

console.log('クリプト忍者咲耶コマンダー - Game Started');
console.log(`Resolution: ${gameConfig.width}x${gameConfig.height}`);
console.log(`Target FPS: ${gameConfig.fps?.target}`);