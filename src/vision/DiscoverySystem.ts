import { Army } from '../army/Army';
import { VisionSystem } from './VisionSystem';
import { DiscoveryEvent } from '../types/VisionTypes';
import { FactionType } from '../types/ArmyTypes';

export class DiscoverySystem {
  private discoveredArmies: Set<string> = new Set();
  private discoveryHistory: DiscoveryEvent[] = [];

  // 軍団発見時のコールバック
  public onArmyDiscovered?: (army: Army, event: DiscoveryEvent) => void;

  constructor(private visionSystem: VisionSystem) {}

  /**
   * 全観測軍団から見える敵軍団をチェックして発見状態を更新（視界共有版）
   */
  checkDiscovery(observers: Army[], targets: Army[]): void {
    // プレイヤー側の軍団のみを観測者として使用
    const playerObservers = observers.filter((army) => army.isPlayerArmy());

    // 敵軍団のみを対象として使用
    const enemyTargets = targets.filter((army) => army.isEnemyArmy());

    // プレイヤー勢力の視界共有チェック
    if (playerObservers.length > 0) {
      const playerFaction = playerObservers[0].getOwner();
      this.checkFactionDiscovery(playerFaction, playerObservers, enemyTargets);
    }
  }

  /**
   * 勢力単位での発見チェック（視界共有を考慮）
   */
  checkFactionDiscovery(faction: FactionType, factionArmies: Army[], targetArmies: Army[]): void {
    targetArmies.forEach((target) => {
      // 既に発見済みならスキップ
      if (this.isDiscovered(target.getId())) {
        return;
      }

      // 勢力の共有視界から見えるかチェック
      if (this.visionSystem.isVisibleByFaction(target, faction, factionArmies)) {
        // 最も近い観測者を発見者とする
        const discoverer = this.findClosestObserver(target, factionArmies);
        if (discoverer) {
          this.discoverArmy(target, discoverer);
        }
      }
    });
  }

  /**
   * 対象に最も近い観測者を見つける
   */
  private findClosestObserver(target: Army, observers: Army[]): Army | null {
    let closestObserver: Army | null = null;
    let minDistance = Infinity;

    const targetPos = target.getPosition();

    observers.forEach((observer) => {
      const observerPos = observer.getPosition();
      const distance = Math.sqrt(
        Math.pow(targetPos.x - observerPos.x, 2) + Math.pow(targetPos.y - observerPos.y, 2),
      );

      if (distance < minDistance) {
        minDistance = distance;
        closestObserver = observer;
      }
    });

    return closestObserver;
  }

  /**
   * 軍団を発見済みとしてマーク
   */
  private discoverArmy(discoveredArmy: Army, discovererArmy: Army): void {
    const armyId = discoveredArmy.getId();

    // 既に発見済みなら何もしない
    if (this.discoveredArmies.has(armyId)) {
      return;
    }

    // 発見済みとしてマーク
    this.discoveredArmies.add(armyId);

    // 軍団の表示状態を更新
    discoveredArmy.setDiscovered(true);

    // 発見イベントを記録
    const event: DiscoveryEvent = {
      discoveredArmy: armyId,
      discovererArmy: discovererArmy.getId(),
      position: discoveredArmy.getPosition(),
      timestamp: Date.now(),
    };

    this.discoveryHistory.push(event);

    // コールバックを呼び出し
    if (this.onArmyDiscovered) {
      this.onArmyDiscovered(discoveredArmy, event);
    }

    console.log(
      `Army ${discovererArmy.getName()} discovered enemy army ${discoveredArmy.getName()}`,
    );
  }

  /**
   * 指定した軍団が発見済みかどうか
   */
  isDiscovered(armyId: string): boolean {
    return this.discoveredArmies.has(armyId);
  }

  /**
   * 発見情報をリセット（新しいステージ開始時など）
   */
  resetDiscoveries(): void {
    this.discoveredArmies.clear();
    this.discoveryHistory = [];
  }

  /**
   * 発見履歴を取得
   */
  getDiscoveryHistory(): DiscoveryEvent[] {
    return [...this.discoveryHistory];
  }

  /**
   * 発見済み軍団のIDリストを取得
   */
  getDiscoveredArmyIds(): string[] {
    return Array.from(this.discoveredArmies);
  }

  /**
   * 軍団の初期表示状態を設定
   */
  initializeArmyVisibility(army: Army): void {
    if (army.isPlayerArmy()) {
      // プレイヤー軍団は常に表示
      army.setDiscovered(true);
    } else if (army.isEnemyArmy()) {
      // 敵軍団は初期状態で非表示（既に発見済みでない限り）
      const isAlreadyDiscovered = this.isDiscovered(army.getId());
      army.setDiscovered(isAlreadyDiscovered);
    } else {
      // 中立軍団は常に表示（今後の拡張用）
      army.setDiscovered(true);
    }
  }

  /**
   * デバッグ用：強制的に軍団を発見状態にする
   */
  forceDiscoverArmy(armyId: string): void {
    this.discoveredArmies.add(armyId);
  }
}
