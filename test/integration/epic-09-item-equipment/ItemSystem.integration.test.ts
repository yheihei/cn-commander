import {
  Weapon,
  WeaponFactory,
  ConsumableFactory,
  ItemHolder,
  RangeChecker,
} from '../../../src/item';
import { ItemType, WeaponType } from '../../../src/types/ItemTypes';

describe('[エピック9] ItemSystem Integration Tests', () => {
  describe('アイテム基本システム', () => {
    describe('Weapon生成と基本動作', () => {
      test('忍者刀を正しく生成できる', () => {
        const sword = WeaponFactory.createWeapon('ninja_sword');

        expect(sword.id).toBe('ninja_sword');
        expect(sword.name).toBe('忍者刀');
        expect(sword.type).toBe(ItemType.WEAPON);
        expect(sword.weaponType).toBe(WeaponType.SWORD);
        expect(sword.attackBonus).toBe(15);
        expect(sword.minRange).toBe(1);
        expect(sword.maxRange).toBe(3);
        expect(sword.durability).toBe(100);
        expect(sword.maxDurability).toBe(100);
        expect(sword.price).toBe(300);
      });

      test('手裏剣を正しく生成できる', () => {
        const shuriken = WeaponFactory.createWeapon('shuriken');

        expect(shuriken.id).toBe('shuriken');
        expect(shuriken.name).toBe('手裏剣');
        expect(shuriken.weaponType).toBe(WeaponType.PROJECTILE);
        expect(shuriken.attackBonus).toBe(5);
        expect(shuriken.minRange).toBe(2);
        expect(shuriken.maxRange).toBe(6);
        expect(shuriken.durability).toBe(100);
        expect(shuriken.price).toBe(200);
      });

      test('武器の使用により耐久度が減少する', () => {
        const sword = WeaponFactory.createWeapon('ninja_sword');

        expect(sword.canUse()).toBe(true);
        expect(sword.getDurabilityPercentage()).toBe(100);

        sword.use();

        expect(sword.durability).toBe(99);
        expect(sword.getDurabilityPercentage()).toBe(99);
        expect(sword.canUse()).toBe(true);
      });

      test('耐久度0の武器は使用できない', () => {
        const sword = WeaponFactory.createWeapon('ninja_sword');

        // 耐久度を0まで減らす
        for (let i = 0; i < 100; i++) {
          sword.use();
        }

        expect(sword.durability).toBe(0);
        expect(sword.canUse()).toBe(false);
        expect(sword.getDurabilityPercentage()).toBe(0);

        // 使用を試みても耐久度は減らない
        sword.use();
        expect(sword.durability).toBe(0);
      });
    });

    describe('Consumable生成と基本動作', () => {
      test('兵糧丸を正しく生成できる', () => {
        const healingPill = ConsumableFactory.createConsumable('healing_pill');

        expect(healingPill.id).toBe('healing_pill');
        expect(healingPill.name).toBe('兵糧丸');
        expect(healingPill.type).toBe(ItemType.CONSUMABLE);
        expect(healingPill.effect).toBe('heal_full');
        expect(healingPill.uses).toBe(1);
        expect(healingPill.maxUses).toBe(1);
        expect(healingPill.price).toBe(50);
      });

      test('消耗品の使用により使用回数が減少する', () => {
        const healingPill = ConsumableFactory.createConsumable('healing_pill');

        expect(healingPill.canUse()).toBe(true);

        const used = healingPill.use();

        expect(used).toBe(true);
        expect(healingPill.uses).toBe(0);
        expect(healingPill.canUse()).toBe(false);

        // 使用回数0で再使用を試みる
        const usedAgain = healingPill.use();
        expect(usedAgain).toBe(false);
        expect(healingPill.uses).toBe(0);
      });
    });

    describe('ItemHolder（アイテム所持管理）', () => {
      let holder: ItemHolder;

      beforeEach(() => {
        holder = new ItemHolder();
      });

      test('最大4個までアイテムを所持できる', () => {
        const sword1 = WeaponFactory.createWeapon('ninja_sword');
        const sword2 = WeaponFactory.createWeapon('ninja_sword');
        const shuriken = WeaponFactory.createWeapon('shuriken');
        const pill = ConsumableFactory.createConsumable('healing_pill');
        const extraSword = WeaponFactory.createWeapon('ninja_sword');

        expect(holder.addItem(sword1)).toBe(true);
        expect(holder.addItem(sword2)).toBe(true);
        expect(holder.addItem(shuriken)).toBe(true);
        expect(holder.addItem(pill)).toBe(true);
        expect(holder.getItemCount()).toBe(4);

        // 5個目は追加できない
        expect(holder.addItem(extraSword)).toBe(false);
        expect(holder.getItemCount()).toBe(4);
      });

      test('武器の自動装備が正しく動作する', () => {
        const sword = WeaponFactory.createWeapon('ninja_sword');
        const shuriken = WeaponFactory.createWeapon('shuriken');

        // 最初の武器を追加すると自動装備される
        holder.addItem(sword);
        expect(holder.getEquippedWeapon()).toBe(sword);

        // より攻撃力の低い武器を追加しても装備は変わらない
        holder.addItem(shuriken);
        expect(holder.getEquippedWeapon()).toBe(sword);
      });

      test('装備中の武器を削除すると次の最適な武器が自動装備される', () => {
        const sword = WeaponFactory.createWeapon('ninja_sword');
        const shuriken = WeaponFactory.createWeapon('shuriken');

        holder.addItem(sword);
        holder.addItem(shuriken);
        expect(holder.getEquippedWeapon()).toBe(sword);

        // 装備中の武器を削除
        holder.removeItem(sword);
        expect(holder.getEquippedWeapon()).toBe(shuriken);
      });

      test('耐久度0の武器は自動装備されない', () => {
        const sword = WeaponFactory.createWeapon('ninja_sword');
        const shuriken = WeaponFactory.createWeapon('shuriken');

        // 忍者刀の耐久度を0にする
        for (let i = 0; i < 100; i++) {
          sword.use();
        }

        holder.addItem(sword);
        expect(holder.getEquippedWeapon()).toBeNull();

        holder.addItem(shuriken);
        expect(holder.getEquippedWeapon()).toBe(shuriken);
      });

      test('アイテムの種類別取得が正しく動作する', () => {
        const sword = WeaponFactory.createWeapon('ninja_sword');
        const shuriken = WeaponFactory.createWeapon('shuriken');
        const pill1 = ConsumableFactory.createConsumable('healing_pill');
        const pill2 = ConsumableFactory.createConsumable('healing_pill');

        holder.addItem(sword);
        holder.addItem(shuriken);
        holder.addItem(pill1);
        holder.addItem(pill2);

        const weapons = holder.getWeapons();
        expect(weapons).toHaveLength(2);
        expect(weapons).toContain(sword);
        expect(weapons).toContain(shuriken);

        const consumables = holder.getConsumables();
        expect(consumables).toHaveLength(2);
        expect(consumables).toContain(pill1);
        expect(consumables).toContain(pill2);
      });
    });

    describe('RangeChecker（射程チェック）', () => {
      let rangeChecker: RangeChecker;
      let sword: Weapon;
      let shuriken: Weapon;

      beforeEach(() => {
        rangeChecker = new RangeChecker();
        sword = WeaponFactory.createWeapon('ninja_sword');
        shuriken = WeaponFactory.createWeapon('shuriken');
      });

      test('刀剣の射程判定が正しく動作する', () => {
        const attackerPos = { x: 5, y: 5 };

        // 射程内（1-3マス）
        expect(rangeChecker.isInRange(attackerPos, { x: 6, y: 5 }, sword)).toBe(true); // 1マス
        expect(rangeChecker.isInRange(attackerPos, { x: 7, y: 5 }, sword)).toBe(true); // 2マス
        expect(rangeChecker.isInRange(attackerPos, { x: 8, y: 5 }, sword)).toBe(true); // 3マス

        // 射程外
        expect(rangeChecker.isInRange(attackerPos, { x: 5, y: 5 }, sword)).toBe(false); // 0マス（同じ位置）
        expect(rangeChecker.isInRange(attackerPos, { x: 9, y: 5 }, sword)).toBe(false); // 4マス
      });

      test('手裏剣の射程判定が正しく動作する', () => {
        const attackerPos = { x: 5, y: 5 };

        // 射程内（2-6マス）
        expect(rangeChecker.isInRange(attackerPos, { x: 7, y: 5 }, shuriken)).toBe(true); // 2マス
        expect(rangeChecker.isInRange(attackerPos, { x: 8, y: 7 }, shuriken)).toBe(true); // 3マス（斜め）
        expect(rangeChecker.isInRange(attackerPos, { x: 11, y: 5 }, shuriken)).toBe(true); // 6マス

        // 射程外
        expect(rangeChecker.isInRange(attackerPos, { x: 6, y: 5 }, shuriken)).toBe(false); // 1マス（近すぎ）
        expect(rangeChecker.isInRange(attackerPos, { x: 12, y: 5 }, shuriken)).toBe(false); // 7マス（遠すぎ）
      });

      test('攻撃可能位置の取得が正しく動作する', () => {
        const attackerPos = { x: 5, y: 5 };

        const swordPositions = rangeChecker.getAttackablePositions(attackerPos, sword);
        const shurikenPositions = rangeChecker.getAttackablePositions(attackerPos, shuriken);

        // 刀剣：射程1-3の正方形から中心を除いた範囲
        expect(swordPositions.length).toBeGreaterThan(0);
        expect(swordPositions.some((pos) => pos.x === 6 && pos.y === 5)).toBe(true);
        expect(swordPositions.some((pos) => pos.x === 5 && pos.y === 5)).toBe(false); // 自分の位置は含まない

        // 手裏剣：射程2-6の範囲
        expect(shurikenPositions.length).toBeGreaterThan(swordPositions.length);
        expect(shurikenPositions.some((pos) => pos.x === 7 && pos.y === 5)).toBe(true);
        expect(shurikenPositions.some((pos) => pos.x === 6 && pos.y === 5)).toBe(false); // 射程1は含まない
      });
    });

    describe('実使用シナリオ', () => {
      test('キャラクターの装備とアイテム使用の流れ', () => {
        const holder = new ItemHolder();
        const sword = WeaponFactory.createWeapon('ninja_sword');
        const shuriken = WeaponFactory.createWeapon('shuriken');
        const healingPill = ConsumableFactory.createConsumable('healing_pill');

        // アイテムを追加
        holder.addItem(sword);
        holder.addItem(shuriken);
        holder.addItem(healingPill);

        // 自動装備確認（攻撃力の高い忍者刀が装備される）
        expect(holder.getEquippedWeapon()).toBe(sword);

        // 戦闘で武器を使用
        const equipped = holder.getEquippedWeapon();
        expect(equipped).not.toBeNull();

        if (equipped) {
          for (let i = 0; i < 10; i++) {
            equipped.use();
          }
          expect(equipped.durability).toBe(90);
        }

        // 回復アイテムを使用
        expect(healingPill.canUse()).toBe(true);
        healingPill.use();
        expect(healingPill.canUse()).toBe(false);

        // 使用済みアイテムも所持枠を占有
        expect(holder.getItemCount()).toBe(3);
      });

      test('複数キャラクターでの武器共有はできない', () => {
        const holder1 = new ItemHolder();
        const holder2 = new ItemHolder();
        const sword = WeaponFactory.createWeapon('ninja_sword');

        // 同じ武器インスタンスを複数のホルダーに追加できるが、実際のゲームでは避けるべき
        holder1.addItem(sword);
        holder2.addItem(sword);

        // それぞれ独立して管理される
        expect(holder1.getEquippedWeapon()).toBe(sword);
        expect(holder2.getEquippedWeapon()).toBe(sword);

        // 一方で削除しても他方には影響しない
        holder1.removeItem(sword);
        expect(holder1.getEquippedWeapon()).toBeNull();
        expect(holder2.getEquippedWeapon()).toBe(sword);
      });
    });
  });
});
