import * as Phaser from 'phaser';
import { Base } from './Base';
import { BaseData, BaseType } from '../types/MapTypes';
import { MapManager } from '../map/MapManager';
import { Character } from '../character/Character';
import { Army } from '../army/Army';
import { IItem, WeaponType } from '../types/ItemTypes';
import { Weapon } from '../item/Weapon';
import { Consumable } from '../item/Consumable';

/**
 * 拠点管理クラス
 * 全ての拠点の生成、管理、更新を行う
 */
export class BaseManager {
  private scene: Phaser.Scene;
  private bases: Map<string, Base>;
  private baseGroup: Phaser.GameObjects.Group;

  // 待機兵士管理（拠点ID => 兵士リスト）
  private waitingSoldiers: Map<string, Character[]> = new Map();

  // 駐留軍団管理（拠点ID => 軍団リスト）
  private stationedArmies: Map<string, Army[]> = new Map();

  // 倉庫アイテム管理（全拠点共通）
  private warehouseItems: IItem[] = [];

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
    const existingBase = this.bases.get(baseData.id);
    if (existingBase) {
      console.warn(`Base with id ${baseData.id} already exists`);
      return existingBase;
    }

    // 拠点作成
    const base = new Base(this.scene, baseData);
    this.bases.set(baseData.id, base);
    console.log(
      `[BaseManager.addBase] 拠点を追加: ${baseData.name} @ (${baseData.x}, ${baseData.y}), ID: ${baseData.id}`,
    );
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
    return this.getAllBases().filter((base) => base.getOwner() === owner);
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
  getNearestBase(x: number, y: number, filter?: (base: Base) => boolean): Base | null {
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
   * 指定位置から指定範囲内の拠点を取得
   * @param x タイルX座標
   * @param y タイルY座標
   * @param range 範囲（マス）
   * @param filter フィルター条件
   */
  getBasesWithinRange(
    x: number,
    y: number,
    range: number,
    filter?: (base: Base) => boolean,
  ): Base[] {
    const basesInRange: Base[] = [];
    console.log(`[BaseManager.getBasesWithinRange] 検索位置: (${x}, ${y}), 範囲: ${range}マス`);

    for (const base of this.bases.values()) {
      if (filter && !filter(base)) {
        console.log(`[BaseManager.getBasesWithinRange] ${base.getName()} はフィルターで除外`);
        continue;
      }

      const pos = base.getPosition();
      const dx = pos.x + 1 - x; // 拠点の中心を基準
      const dy = pos.y + 1 - y;
      const distance = Math.sqrt(dx * dx + dy * dy);

      console.log(
        `[BaseManager.getBasesWithinRange] ${base.getName()}: 位置(${pos.x}, ${pos.y}), 距離=${distance.toFixed(2)}`,
      );

      if (distance <= range) {
        basesInRange.push(base);
        console.log(`[BaseManager.getBasesWithinRange] ${base.getName()} は範囲内！`);
      }
    }

    console.log(`[BaseManager.getBasesWithinRange] 検出された拠点数: ${basesInRange.length}`);
    return basesInRange;
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
   * 待機兵士を取得
   */
  getWaitingSoldiers(baseId: string): Character[] {
    return this.waitingSoldiers.get(baseId) || [];
  }

  /**
   * 待機兵士を追加
   */
  addWaitingSoldier(baseId: string, soldier: Character): void {
    const soldiers = this.waitingSoldiers.get(baseId) || [];
    soldiers.push(soldier);
    this.waitingSoldiers.set(baseId, soldiers);
  }

  /**
   * 待機兵士を削除
   */
  removeWaitingSoldier(baseId: string, soldier: Character): void {
    const soldiers = this.waitingSoldiers.get(baseId) || [];
    const index = soldiers.indexOf(soldier);
    if (index > -1) {
      soldiers.splice(index, 1);
      this.waitingSoldiers.set(baseId, soldiers);
    }
  }

  /**
   * 複数の待機兵士を削除
   */
  removeWaitingSoldiers(baseId: string, soldiersToRemove: Character[]): void {
    const soldiers = this.waitingSoldiers.get(baseId) || [];
    const remaining = soldiers.filter((s) => !soldiersToRemove.includes(s));
    this.waitingSoldiers.set(baseId, remaining);
  }

  /**
   * 駐留軍団を取得
   */
  getStationedArmies(baseId: string): Army[] {
    return this.stationedArmies.get(baseId) || [];
  }

  /**
   * 駐留軍団を追加
   */
  addStationedArmy(baseId: string, army: Army): void {
    const armies = this.stationedArmies.get(baseId) || [];
    armies.push(army);
    this.stationedArmies.set(baseId, armies);
  }

  /**
   * 駐留軍団を削除
   */
  removeStationedArmy(baseId: string, army: Army): void {
    const armies = this.stationedArmies.get(baseId) || [];
    const index = armies.indexOf(army);
    if (index > -1) {
      armies.splice(index, 1);
      this.stationedArmies.set(baseId, armies);
    }
  }

  /**
   * 倉庫アイテムを取得
   */
  getWarehouseItems(): IItem[] {
    return this.warehouseItems;
  }

  /**
   * 倉庫にアイテムを追加
   */
  addWarehouseItem(item: IItem): void {
    this.warehouseItems.push(item);
  }

  /**
   * 倉庫からアイテムを削除
   */
  removeWarehouseItem(item: IItem): boolean {
    const index = this.warehouseItems.indexOf(item);
    if (index > -1) {
      this.warehouseItems.splice(index, 1);
      return true;
    }
    return false;
  }

  /**
   * 倉庫アイテムの初期化（デバッグ用）
   */
  initializeWarehouse(): void {
    // 武器を追加
    for (let i = 0; i < 12; i++) {
      const ninjaSword = new Weapon({
        id: `ninja_sword_${i}`,
        name: '忍者刀',
        weaponType: WeaponType.SWORD,
        attackBonus: 15,
        minRange: 1,
        maxRange: 3,
        maxDurability: 100,
        price: 300,
        description: '標準的な忍者刀',
      });
      this.warehouseItems.push(ninjaSword);
    }

    for (let i = 0; i < 25; i++) {
      const shuriken = new Weapon({
        id: `shuriken_${i}`,
        name: '手裏剣',
        weaponType: WeaponType.PROJECTILE,
        attackBonus: 5,
        minRange: 1,
        maxRange: 6,
        maxDurability: 100,
        price: 200,
        description: '投擲武器',
      });
      this.warehouseItems.push(shuriken);
    }

    // 弓を追加
    for (let i = 0; i < 10; i++) {
      const bow = new Weapon({
        id: `bow_${i}`,
        name: '弓',
        weaponType: WeaponType.PROJECTILE,
        attackBonus: 2,
        minRange: 4,
        maxRange: 12,
        maxDurability: 100,
        price: 400,
        description: '長距離飛び道具',
      });
      this.warehouseItems.push(bow);
    }

    // 消耗品を追加
    for (let i = 0; i < 30; i++) {
      const foodPill = new Consumable({
        id: `food_pill_${i}`,
        name: '兵糧丸',
        effect: 'HP全快',
        maxUses: 1,
        price: 50,
        description: 'HPを全回復する',
      });
      this.warehouseItems.push(foodPill);
    }
  }

  /**
   * 初期拠点配置（テスト用）
   */
  setupInitialBases(): void {
    console.log('[BaseManager] 初期拠点を配置します');

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
      owner: 'player',
    });
    console.log('[BaseManager] 味方本拠地: 甲賀の里 @ (10, 10)');

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
      owner: 'enemy',
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
      owner: 'neutral',
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
      owner: 'neutral',
    });
  }

  /**
   * クリーンアップ
   */
  destroy(): void {
    this.bases.forEach((base) => base.destroy());
    this.bases.clear();
    this.baseGroup.destroy();
  }
}
