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
  (window as unknown as { game: Phaser.Game }).game = game;
}

// ブラウザのコンテキストメニューを無効化
// ゲームキャンバスでの右クリックメニューを防ぐ
game.canvas.addEventListener('contextmenu', (e) => {
  e.preventDefault();
  return false;
});

// Game started
