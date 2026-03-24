/**
 * ECS 系统定义
 * 
 * 系统包含游戏逻辑，处理具有特定组件的实体
 */

import { System, World, EntityId } from '../types.js';
import * as Components from '../components/index.js';

// ============================================================
// 基础系统
// ============================================================

/** 移动系统 */
export class MovementSystem implements System {
  readonly name = 'MovementSystem';
  readonly priority = 10;

  init(world: World): void {
    world.on('move', (data: { entity: EntityId; dx: number; dy: number }) => {
      this.handleMove(world, data.entity, data.dx, data.dy);
    });
  }

  update(world: World, deltaTime: number): void {
    // 移动在事件触发时处理
  }

  destroy(world: World): void {}

  private handleMove(world: World, entity: EntityId, dx: number, dy: number): void {
    const pos = world.getComponent<Components.Position>(entity, 'Position');
    if (!pos) {
      console.log('[MovementSystem] No Position component for entity', entity);
      return;
    }

    const newX = pos.x + dx;
    const newY = pos.y + dy;

    console.log(`[MovementSystem] Moving entity ${entity} from (${pos.x}, ${pos.y}) to (${newX}, ${newY})`);

    // 检查碰撞
    if (this.canMoveTo(world, entity, newX, newY)) {
      pos.x = newX;
      pos.y = newY;
      console.log(`[MovementSystem] Move successful, new position: (${pos.x}, ${pos.y})`);
      world.emit('entityMoved', { entity, x: pos.x, y: pos.y });
    } else {
      console.log(`[MovementSystem] Move blocked at (${newX}, ${newY})`);
      world.emit('moveBlocked', { entity, x: newX, y: newY });
    }
  }

  private canMoveTo(world: World, movingEntity: EntityId, x: number, y: number): boolean {
    // 获取所有有 Blocker 和 Position 的实体
    const entities = world.getEntitiesWith('Blocker', 'Position');
    
    for (const entity of entities) {
      // 跳过自己
      if (entity === movingEntity) continue;
      
      const pos = world.getComponent<Components.Position>(entity, 'Position');
      const blocker = world.getComponent<Components.Blocker>(entity, 'Blocker');
      
      if (pos && blocker && blocker.blocksMovement && pos.x === x && pos.y === y) {
        console.log(`[MovementSystem] Blocked by entity ${entity} at (${pos.x}, ${pos.y})`);
        return false;
      }
    }
    
    return true;
  }
}

/** 战斗系统 */
export class CombatSystem implements System {
  readonly name = 'CombatSystem';
  readonly priority = 20;

  init(world: World): void {
    world.on('attack', (data: { attacker: EntityId; target: EntityId }) => {
      this.handleAttack(world, data.attacker, data.target);
    });
  }

  update(world: World, deltaTime: number): void {
    // 处理战斗逻辑
  }

  destroy(world: World): void {}

  private handleAttack(world: World, attacker: EntityId, target: EntityId): void {
    const attackerCombat = world.getComponent<Components.Combat>(attacker, 'Combat');
    const targetCombat = world.getComponent<Components.Combat>(target, 'Combat');
    const targetHealth = world.getComponent<Components.Health>(target, 'Health');
    const targetName = world.getComponent<Components.Name>(target, 'Name');

    if (!attackerCombat || !targetHealth) return;

    // 计算伤害
    const defense = targetCombat?.defense ?? 0;
    const damage = Math.max(1, attackerCombat.attack - defense);
    
    targetHealth.hp -= damage;
    
    world.emit('damage', {
      target,
      damage,
      remainingHp: targetHealth.hp
    });

    if (targetHealth.hp <= 0) {
      world.emit('entityDied', { entity: target, name: targetName?.name });
      
      // 给予经验
      const attackerLevel = world.getComponent<Components.Level>(attacker, 'Level');
      if (attackerLevel) {
        this.giveExp(world, attacker, 10);
      }
    }
  }

  private giveExp(world: World, entity: EntityId, exp: number): void {
    const level = world.getComponent<Components.Level>(entity, 'Level');
    if (!level) return;

    level.exp += exp;
    
    // 检查升级
    if (level.exp >= level.maxExp) {
      level.exp -= level.maxExp;
      level.level++;
      level.maxExp = Math.floor(level.maxExp * 1.5);
      
      // 增加属性点
      const stats = world.getComponent<Components.Stats>(entity, 'Stats');
      if (stats) {
        stats.statPoints += 3;
      }
      
      world.emit('levelUp', { entity, level: level.level });
    }
  }
}

/** 视野系统 */
export class VisibilitySystem implements System {
  readonly name = 'VisibilitySystem';
  readonly priority = 5;

  init(world: World): void {}

  update(world: World, deltaTime: number): void {
    // 获取玩家位置
    const players = world.query({ all: ['PlayerTag', 'Position'] });
    if (players.length === 0) return;

    const player = players[0];
    const playerPos = world.getComponent<Components.Position>(player, 'Position');
    if (!playerPos) return;

    // 更新视野（简化版）
    const radius = 8;
    world.emit('fovUpdated', {
      centerX: playerPos.x,
      centerY: playerPos.y,
      radius
    });
  }

  destroy(world: World): void {}
}

/** AI 系统 */
export class AISystem implements System {
  readonly name = 'AISystem';
  readonly priority = 30;

  init(world: World): void {}

  update(world: World, deltaTime: number): void {
    const entities = world.query({ all: ['AI', 'Position', 'Faction'] });
    
    for (const entity of entities) {
      const ai = world.getComponent<Components.AI>(entity, 'AI');
      const faction = world.getComponent<Components.Faction>(entity, 'Faction');
      
      if (!ai || faction?.factionType !== 'hostile') continue;

      // 简单 AI：向玩家移动
      this.moveTowardsPlayer(world, entity);
    }
  }

  destroy(world: World): void {}

  private moveTowardsPlayer(world: World, entity: EntityId): void {
    const entityPos = world.getComponent<Components.Position>(entity, 'Position');
    if (!entityPos) return;

    const players = world.query({ all: ['PlayerTag', 'Position'] });
    if (players.length === 0) return;

    const playerPos = world.getComponent<Components.Position>(players[0], 'Position');
    if (!playerPos) return;

    const dx = Math.sign(playerPos.x - entityPos.x);
    const dy = Math.sign(playerPos.y - entityPos.y);

    if (dx !== 0 || dy !== 0) {
      world.emit('move', { entity, dx, dy });
    }
  }
}

/** Buff/Debuff 系统 */
export class BuffSystem implements System {
  readonly name = 'BuffSystem';
  readonly priority = 15;

  init(world: World): void {}

  update(world: World, deltaTime: number): void {
    const entities = world.getEntitiesWith('Buffs');
    
    for (const entity of entities) {
      const buffs = world.getComponent<Components.Buffs>(entity, 'Buffs');
      if (!buffs || buffs.list.length === 0) continue;

      // 减少持续时间
      buffs.list = buffs.list.filter(buff => {
        buff.duration -= deltaTime;
        return buff.duration > 0;
      });
    }
  }

  destroy(world: World): void {}
}

/** 技能冷却系统 */
export class SkillCooldownSystem implements System {
  readonly name = 'SkillCooldownSystem';
  readonly priority = 25;

  init(world: World): void {}

  update(world: World, deltaTime: number): void {
    const entities = world.getEntitiesWith('Skills');
    
    for (const entity of entities) {
      const skills = world.getComponent<Components.Skills>(entity, 'Skills');
      if (!skills) continue;

      // 减少冷却时间
      for (const [skillId, cooldown] of skills.cooldowns) {
        const newCooldown = cooldown - deltaTime;
        if (newCooldown <= 0) {
          skills.cooldowns.delete(skillId);
        } else {
          skills.cooldowns.set(skillId, newCooldown);
        }
      }
    }
  }

  destroy(world: World): void {}
}

/** 物品使用系统 */
export class ItemUseSystem implements System {
  readonly name = 'ItemUseSystem';
  readonly priority = 40;

  init(world: World): void {
    world.on('useItem', (data: { user: EntityId; item: EntityId }) => {
      this.handleUseItem(world, data.user, data.item);
    });
  }

  update(world: World, deltaTime: number): void {}

  destroy(world: World): void {}

  private handleUseItem(world: World, user: EntityId, item: EntityId): void {
    const itemData = world.getComponent<Components.Item>(item, 'Item');
    const effect = world.getComponent<Components.ItemEffect>(item, 'ItemEffect');
    
    if (!itemData) return;

    // 处理消耗品效果
    if (effect) {
      switch (effect.effectType) {
        case 'heal': {
          const health = world.getComponent<Components.Health>(user, 'Health');
          if (health) {
            health.hp = Math.min(health.maxHp, health.hp + effect.value);
            world.emit('healed', { entity: user, amount: effect.value });
          }
          break;
        }
        case 'restore_mp': {
          const mana = world.getComponent<Components.Mana>(user, 'Mana');
          if (mana) {
            mana.mp = Math.min(mana.maxMp, mana.mp + effect.value);
            world.emit('manaRestored', { entity: user, amount: effect.value });
          }
          break;
        }
      }

      // 消耗物品
      if (itemData.stackable && itemData.quantity > 1) {
        itemData.quantity--;
      } else {
        // 从背包移除
        world.emit('removeFromInventory', { owner: user, item });
        world.destroyEntity(item);
      }
    }
  }
}

/** 装备系统 */
export class EquipmentSystem implements System {
  readonly name = 'EquipmentSystem';
  readonly priority = 35;

  init(world: World): void {
    world.on('equip', (data: { entity: EntityId; item: EntityId }) => {
      this.handleEquip(world, data.entity, data.item);
    });
    
    world.on('unequip', (data: { entity: EntityId; slot: string }) => {
      this.handleUnequip(world, data.entity, data.slot);
    });
  }

  update(world: World, deltaTime: number): void {}

  destroy(world: World): void {}

  private handleEquip(world: World, entity: EntityId, item: EntityId): void {
    const itemData = world.getComponent<Components.Item>(item, 'Item');
    const equipment = world.getComponent<Components.Equipment>(item, 'Equipment');
    const slots = world.getComponent<Components.EquipmentSlots>(entity, 'EquipmentSlots');
    const combat = world.getComponent<Components.Combat>(entity, 'Combat');
    
    if (!itemData || !equipment || !slots) return;

    // 卸下当前装备
    if (equipment.slot !== 'none' && slots[equipment.slot as keyof Components.EquipmentSlots]) {
      this.handleUnequip(world, entity, equipment.slot);
    }

    // 装备新物品
    // 使用类型断言处理动态属性赋值
    (slots as any)[equipment.slot] = item;
    equipment.equipped = true;

    // 应用属性加成
    if (combat) {
      const stats = world.getComponent<Components.ItemStats>(item, 'ItemStats');
      if (stats) {
        combat.attack += stats.attack;
        combat.defense += stats.defense;
        combat.speed += stats.speed;
        combat.critical += stats.critical;
      }
    }

    world.emit('itemEquipped', { entity, item });
  }

  private handleUnequip(world: World, entity: EntityId, slot: string): void {
    const slots = world.getComponent<Components.EquipmentSlots>(entity, 'EquipmentSlots');
    const combat = world.getComponent<Components.Combat>(entity, 'Combat');
    
    if (!slots) return;

    const itemId = (slots as any)[slot] as number | undefined;
    if (!itemId) return;

    const item = world.getComponent<Components.Equipment>(itemId, 'Equipment');
    const stats = world.getComponent<Components.ItemStats>(itemId, 'ItemStats');

    if (item) {
      item.equipped = false;
    }

    // 移除属性加成
    if (combat && stats) {
      combat.attack -= stats.attack;
      combat.defense -= stats.defense;
      combat.speed -= stats.speed;
      combat.critical -= stats.critical;
    }

    (slots as any)[slot] = undefined;
    world.emit('itemUnequipped', { entity, slot, item: itemId });
  }
}

/** 生成系统 */
export class SpawnSystem implements System {
  readonly name = 'SpawnSystem';
  readonly priority = 1;

  init(world: World): void {
    world.on('spawn', (data: { type: string; x: number; y: number }) => {
      this.spawnEntity(world, data.type, data.x, data.y);
    });
  }

  update(world: World, deltaTime: number): void {}

  destroy(world: World): void {}

  private spawnEntity(world: World, type: string, x: number, y: number): EntityId {
    const entity = world.createEntity();
    
    // 基础组件
    world.addComponent(entity, new Components.Position(x, y));
    world.addComponent(entity, new Components.Render());
    world.addComponent(entity, new Components.Name(type));
    
    // 根据类型添加组件...
    // 这里可以根据配置表生成不同的实体
    
    return entity;
  }
}

/** 回合系统 */
export class TurnSystem implements System {
  readonly name = 'TurnSystem';
  readonly priority = 0;
  
  private currentTurn: number = 0;

  init(world: World): void {}

  update(world: World, deltaTime: number): void {
    // 管理回合逻辑
  }

  nextTurn(world: World): void {
    this.currentTurn++;
    
    const turnEntities = world.getEntitiesWith('Turn');
    for (const entity of turnEntities) {
      const turn = world.getComponent<Components.Turn>(entity, 'Turn');
      if (turn) {
        turn.turn = this.currentTurn;
      }
    }
    
    world.emit('turnChanged', { turn: this.currentTurn });
  }

  destroy(world: World): void {}
}

// ============================================================
// 导出所有系统
// ============================================================

export const ALL_SYSTEMS = [
  MovementSystem,
  CombatSystem,
  VisibilitySystem,
  AISystem,
  BuffSystem,
  SkillCooldownSystem,
  ItemUseSystem,
  EquipmentSystem,
  SpawnSystem,
  TurnSystem
] as const;
