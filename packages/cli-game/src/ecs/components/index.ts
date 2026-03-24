/**
 * ECS 组件定义
 * 
 * 组件是纯数据结构，不包含逻辑
 */

import { Component } from '../types.js';

// ============================================================
// 基础组件
// ============================================================

/** 位置组件 */
export class Position implements Component {
  readonly type = 'Position';
  constructor(
    public x: number = 0,
    public y: number = 0
  ) {}
}

/** 渲染组件 */
export class Render implements Component {
  readonly type = 'Render';
  constructor(
    public char: string = '',
    public color: string = '#FFFFFF',
    public bgColor?: string,
    public zIndex: number = 0
  ) {}
}

/** 名称组件 */
export class Name implements Component {
  readonly type = 'Name';
  constructor(
    public name: string = '',
    public description: string = ''
  ) {}
}

// ============================================================
// 战斗组件
// ============================================================

/** 生命值组件 */
export class Health implements Component {
  readonly type = 'Health';
  constructor(
    public hp: number = 100,
    public maxHp: number = 100
  ) {}
}

/** 法力值组件 */
export class Mana implements Component {
  readonly type = 'Mana';
  constructor(
    public mp: number = 50,
    public maxMp: number = 50
  ) {}
}

/** 战斗属性组件 */
export class Combat implements Component {
  readonly type = 'Combat';
  constructor(
    public attack: number = 10,
    public defense: number = 5,
    public speed: number = 10,
    public critical: number = 5
  ) {}
}

/** 阵营组件 */
export class Faction implements Component {
  readonly type = 'Faction';
  constructor(
    public factionType: 'player' | 'friendly' | 'hostile' | 'neutral' = 'neutral'
  ) {}
}

/** AI 组件 */
export class AI implements Component {
  readonly type = 'AI';
  constructor(
    public aiType: 'passive' | 'aggressive' | 'coward' = 'passive',
    public detectionRange: number = 8,
    public patrolRange: number = 5
  ) {}
}

// ============================================================
// 角色成长组件
// ============================================================

/** 等级组件 */
export class Level implements Component {
  readonly type = 'Level';
  constructor(
    public level: number = 1,
    public exp: number = 0,
    public maxExp: number = 100
  ) {}
}

/** 属性点组件 */
export class Stats implements Component {
  readonly type = 'Stats';
  constructor(
    public strength: number = 10,
    public dexterity: number = 10,
    public constitution: number = 10,
    public intelligence: number = 10,
    public statPoints: number = 0
  ) {}
}

// ============================================================
// 物品组件
// ============================================================

/** 物品组件 */
export class Item implements Component {
  readonly type = 'Item';
  constructor(
    public id: string = '',
    public itemType: 'weapon' | 'armor' | 'helmet' | 'shield' | 'ring' | 'consumable' | 'material' = 'material',
    public rarity: 'common' | 'uncommon' | 'rare' | 'epic' | 'legendary' = 'common',
    public stackable: boolean = false,
    public quantity: number = 1,
    public maxStack: number = 99
  ) {}
}

/** 装备组件 */
export class Equipment implements Component {
  readonly type = 'Equipment';
  constructor(
    public slot: 'weapon' | 'armor' | 'helmet' | 'shield' | 'ring' | 'none' = 'none',
    public equipped: boolean = false
  ) {}
}

/** 物品属性组件 */
export class ItemStats implements Component {
  readonly type = 'ItemStats';
  constructor(
    public attack: number = 0,
    public defense: number = 0,
    public hp: number = 0,
    public mp: number = 0,
    public speed: number = 0,
    public critical: number = 0
  ) {}
}

/** 物品效果组件（消耗品） */
export class ItemEffect implements Component {
  readonly type = 'ItemEffect';
  constructor(
    public effectType: 'heal' | 'restore_mp' | 'buff' | 'damage' | 'teleport' = 'heal',
    public value: number = 0,
    public duration: number = 0
  ) {}
}

// ============================================================
// 背包组件
// ============================================================

/** 背包组件 */
export class Inventory implements Component {
  readonly type = 'Inventory';
  public items: number[] = []; // 存储实体的 ID
  public capacity: number = 30;
  
  constructor(capacity: number = 30) {
    this.capacity = capacity;
  }
}

/** 装备栏组件 */
export class EquipmentSlots implements Component {
  readonly type = 'EquipmentSlots';
  public weapon?: number;
  public armor?: number;
  public helmet?: number;
  public shield?: number;
  public ring?: number;
}

/** 金币组件 */
export class Gold implements Component {
  readonly type = 'Gold';
  constructor(public amount: number = 0) {}
}

// ============================================================
// 技能组件
// ============================================================

/** 技能数据 */
export interface SkillData {
  id: string;
  name: string;
  description: string;
  icon: string;
  type: 'attack' | 'heal' | 'buff' | 'debuff';
  power: number;
  mpCost: number;
  cooldown: number;
  currentCooldown: number;
}

/** 技能组件 */
export class Skills implements Component {
  readonly type = 'Skills';
  public learned: string[] = [];
  public equipped: string[] = [];
  public cooldowns: Map<string, number> = new Map();
  
  constructor(skills: string[] = []) {
    this.learned = skills;
    this.equipped = skills.slice(0, 4);
  }
}

/** Buff/Debuff 效果 */
export interface BuffData {
  type: string;
  value: number;
  duration: number;
  source: string;
}

/** Buff 组件 */
export class Buffs implements Component {
  readonly type = 'Buffs';
  public list: BuffData[] = [];
}

// ============================================================
// 地图组件
// ============================================================

/** 地图类型组件 */
export class MapType implements Component {
  readonly type = 'MapType';
  constructor(
    public mapType: 'town' | 'wilderness' | 'dungeon' = 'town',
    public level: number = 1
  ) {}
}

/** 传送门组件 */
export class Portal implements Component {
  readonly type = 'Portal';
  constructor(
    public targetMap: string = '',
    public targetX: number = 0,
    public targetY: number = 0,
    public direction: 'north' | 'south' | 'east' | 'west' | 'dungeon' = 'north'
  ) {}
}

/** 阻挡组件（墙壁等） */
export class Blocker implements Component {
  readonly type = 'Blocker';
  constructor(
    public blocksMovement: boolean = true,
    public blocksVision: boolean = true
  ) {}
}

/** 门组件 */
export class Door implements Component {
  readonly type = 'Door';
  constructor(
    public isOpen: boolean = false,
    public isLocked: boolean = false,
    public keyId?: string
  ) {}
}

/** 容器组件（宝箱等） */
export class Container implements Component {
  readonly type = 'Container';
  public items: number[] = [];
  public isOpen: boolean = false;
  
  constructor(items: number[] = []) {
    this.items = items;
  }
}

// ============================================================
// 交互组件
// ============================================================

/** 对话组件 */
export class Dialogue implements Component {
  readonly type = 'Dialogue';
  public currentLine: number = 0;
  
  constructor(public lines: string[] = []) {}
  
  getCurrentLine(): string {
    if (this.lines.length === 0) return '';
    return this.lines[this.currentLine % this.lines.length];
  }
  
  nextLine(): void {
    this.currentLine++;
  }
}

/** 商店组件 */
export class Shop implements Component {
  readonly type = 'Shop';
  public items: string[] = [];
  public buyRate: number = 0.5;
  public sellRate: number = 1.0;
  
  constructor(items: string[] = []) {
    this.items = items;
  }
}

// ============================================================
// 游戏状态组件
// ============================================================

/** 玩家标记组件 */
export class PlayerTag implements Component {
  readonly type = 'PlayerTag';
}

/** 游戏状态组件 */
export class GameState implements Component {
  readonly type = 'GameState';
  constructor(
    public state: 'explore' | 'combat' | 'inventory' | 'dialogue' | 'menu' | 'game_over' = 'explore'
  ) {}
}

/** 战斗状态组件 */
export class CombatState implements Component {
  readonly type = 'CombatState';
  constructor(
    public inCombat: boolean = false,
    public turn: 'player' | 'enemy' = 'player',
    public enemies: number[] = []
  ) {}
}

/** 回合数组件 */
export class Turn implements Component {
  readonly type = 'Turn';
  constructor(public turn: number = 0) {}
}

// ============================================================
// 导出所有组件类型
// ============================================================

export const ALL_COMPONENTS = [
  Position, Render, Name,
  Health, Mana, Combat, Faction, AI,
  Level, Stats,
  Item, Equipment, ItemStats, ItemEffect,
  Inventory, EquipmentSlots, Gold,
  Skills, Buffs,
  MapType, Portal, Blocker, Door, Container,
  Dialogue, Shop,
  PlayerTag, GameState, CombatState, Turn
] as const;
