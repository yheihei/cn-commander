import * as Phaser from 'phaser';
import { Base } from './Base';
import { BaseData, BaseType } from '../types/MapTypes';
import { MapManager } from '../map/MapManager';

/**
 * 拠点管理クラス
 * 全ての拠点の生成、管理、更新を行う
 */
export class BaseManager {
  private scene: Phaser.Scene;
  private bases: Map<string, Base>;
  private baseGroup: Phaser.GameObjects.Group;
  
  // 収入計算用
  private lastIncomeUpdate: number = 0;
  private static readonly INCOME_UPDATE_INTERVAL = 60000; // 1分 = 60000ms
  
  constructor(scene: Phaser.Scene, _mapManager: MapManager) {
    this.scene = scene;
    // mapManager is kept for future use
    this.bases = new Map();
    this.baseGroup = scene.add.group();
  }
  
  /**
   * 拠点を追加
   */
  addBase(baseData: BaseData): Base {
    // 既存チェック
    if (this.bases.has(baseData.id)) {
      console.warn(`Base with id ${baseData.id} already exists`);
      return this.bases.get(baseData.id)!;
    }
    
    // 拠点作成
    const base = new Base(this.scene, baseData);
    this.bases.set(baseData.id, base);
    // BaseはContainerなので、Groupに追加しない
    
    // クリックイベントの設定（テスト環境ではスキップ）
    if (typeof jest === 'undefined' && base.on) {
      base.on('pointerdown', () => {
        this.scene.events.emit('baseSelected', base);
      });
    }
    
    return base;
  }
  
  /**
   * IDで拠点を取得
   */
  getBase(id: string): Base | null {
    return this.bases.get(id) || null;
  }
  
  /**
   * 全ての拠点を取得
   */
  getAllBases(): Base[] {
    return Array.from(this.bases.values());
  }
  
  /**
   * 所有者で拠点を取得
   */
  getBasesByOwner(owner: 'player' | 'enemy' | 'neutral'): Base[] {
    return this.getAllBases().filter(base => base.getOwner() === owner);
  }
  
  /**
   * 指定位置の拠点を取得
   * @param x タイルX座標
   * @param y タイルY座標
   */
  getBaseAtPosition(x: number, y: number): Base | null {
    for (const base of this.bases.values()) {
      const pos = base.getPosition();
      // 2x2タイルの拠点なので、範囲をチェック
      if (x >= pos.x && x < pos.x + 2 && y >= pos.y && y < pos.y + 2) {
        return base;
      }
    }
    return null;
  }
  
  /**
   * 指定位置から最も近い拠点を取得
   * @param x タイルX座標
   * @param y タイルY座標
   * @param filter フィルター条件
   */
  getNearestBase(
    x: number, 
    y: number, 
    filter?: (base: Base) => boolean
  ): Base | null {
    let nearestBase: Base | null = null;
    let minDistance = Infinity;
    
    for (const base of this.bases.values()) {
      if (filter && !filter(base)) continue;
      
      const pos = base.getPosition();
      const dx = pos.x + 1 - x; // 拠点の中心を基準
      const dy = pos.y + 1 - y;
      const distance = Math.sqrt(dx * dx + dy * dy);
      
      if (distance < minDistance) {
        minDistance = distance;
        nearestBase = base;
      }
    }
    
    return nearestBase;
  }
  
  /**
   * 収入を計算
   */
  calculateIncome(owner: 'player' | 'enemy'): number {
    const bases = this.getBasesByOwner(owner);
    return bases.reduce((total, base) => total + base.getIncome(), 0);
  }
  
  /**
   * 拠点の状態を更新
   */
  update(_deltaTime: number): void {
    const currentTime = this.scene.time.now;
    
    // 収入更新のタイミングチェック
    if (currentTime - this.lastIncomeUpdate >= BaseManager.INCOME_UPDATE_INTERVAL) {
      this.lastIncomeUpdate = currentTime;
      
      // プレイヤーの収入を計算してイベント発火
      const playerIncome = this.calculateIncome('player');
      this.scene.events.emit('incomeUpdate', { player: playerIncome });
      
      // 敵の収入も計算（AI用）
      const enemyIncome = this.calculateIncome('enemy');
      this.scene.events.emit('enemyIncomeUpdate', { enemy: enemyIncome });
    }
  }
  
  /**
   * 初期拠点配置（テスト用）
   */
  setupInitialBases(): void {
    // 味方本拠地
    this.addBase({
      id: 'player_hq',
      name: '甲賀の里',
      type: BaseType.PLAYER_HQ,
      x: 10,
      y: 10,
      maxHp: 200,
      hp: 200,
      income: 200,
      owner: 'player'
    });
    
    // 敵本拠地
    this.addBase({
      id: 'enemy_hq',
      name: '風魔の砦',
      type: BaseType.ENEMY_HQ,
      x: 40,
      y: 40,
      maxHp: 200,
      hp: 200,
      income: 200,
      owner: 'enemy'
    });
    
    // 中立拠点
    this.addBase({
      id: 'neutral_1',
      name: '山間の城',
      type: BaseType.NEUTRAL,
      x: 25,
      y: 15,
      maxHp: 80,
      hp: 80,
      income: 100,
      owner: 'neutral'
    });
    
    this.addBase({
      id: 'neutral_2',
      name: '平原の砦',
      type: BaseType.NEUTRAL,
      x: 15,
      y: 30,
      maxHp: 80,
      hp: 80,
      income: 100,
      owner: 'neutral'
    });
  }
  
  /**
   * クリーンアップ
   */
  destroy(): void {
    this.bases.forEach(base => base.destroy());
    this.bases.clear();
    this.baseGroup.destroy();
  }
}