/**
 * 物品数据库
 */

import { Item, ItemType, ItemRarity } from './types.js';

export const ITEM_DATABASE: Record<string, Item> = {
  // 武器
  'wooden_sword': {
    id: 'wooden_sword',
    name: '木剑',
    type: ItemType.WEAPON,
    rarity: ItemRarity.COMMON,
    description: '一把普通的木剑，新手冒险者的标配',
    char: '⚔️',
    color: '#8B4513',
    stackable: false,
    stats: { attack: 3 },
    equippable: true,
    equipSlot: ItemType.WEAPON
  },
  'iron_sword': {
    id: 'iron_sword',
    name: '铁剑',
    type: ItemType.WEAPON,
    rarity: ItemRarity.UNCOMMON,
    description: '铁匠打造的长剑，比木剑锋利许多',
    char: '🗡️',
    color: '#A0A0A0',
    stackable: false,
    stats: { attack: 8 },
    equippable: true,
    equipSlot: ItemType.WEAPON
  },
  'steel_sword': {
    id: 'steel_sword',
    name: '钢剑',
    type: ItemType.WEAPON,
    rarity: ItemRarity.RARE,
    description: '精钢锻造的武器，闪烁着冷冽的光芒',
    char: '⚔️',
    color: '#4682B4',
    stackable: false,
    stats: { attack: 15, critical: 5 },
    equippable: true,
    equipSlot: ItemType.WEAPON
  },
  'legendary_sword': {
    id: 'legendary_sword',
    name: '屠龙者',
    type: ItemType.WEAPON,
    rarity: ItemRarity.LEGENDARY,
    description: '传说中勇者使用的圣剑，蕴含着强大的力量',
    char: '🗡️',
    color: '#FFD700',
    stackable: false,
    stats: { attack: 30, critical: 15, hp: 20 },
    equippable: true,
    equipSlot: ItemType.WEAPON
  },
  
  // 防具
  'leather_armor': {
    id: 'leather_armor',
    name: '皮甲',
    type: ItemType.ARMOR,
    rarity: ItemRarity.COMMON,
    description: '用皮革制成的护甲，轻便但防护力有限',
    char: '👕',
    color: '#8B4513',
    stackable: false,
    stats: { defense: 2 },
    equippable: true,
    equipSlot: ItemType.ARMOR
  },
  'chain_mail': {
    id: 'chain_mail',
    name: '锁子甲',
    type: ItemType.ARMOR,
    rarity: ItemRarity.UNCOMMON,
    description: '由金属环编织而成的护甲',
    char: '👕',
    color: '#A0A0A0',
    stackable: false,
    stats: { defense: 5 },
    equippable: true,
    equipSlot: ItemType.ARMOR
  },
  'plate_armor': {
    id: 'plate_armor',
    name: '板甲',
    type: ItemType.ARMOR,
    rarity: ItemRarity.RARE,
    description: '重型板甲，提供优秀的防护',
    char: '🛡️',
    color: '#4682B4',
    stackable: false,
    stats: { defense: 10, hp: 10 },
    equippable: true,
    equipSlot: ItemType.ARMOR
  },
  
  // 头盔
  'leather_helmet': {
    id: 'leather_helmet',
    name: '皮帽',
    type: ItemType.HELMET,
    rarity: ItemRarity.COMMON,
    description: '简单的皮帽',
    char: '🧢',
    color: '#8B4513',
    stackable: false,
    stats: { defense: 1 },
    equippable: true,
    equipSlot: ItemType.HELMET
  },
  'iron_helmet': {
    id: 'iron_helmet',
    name: '铁盔',
    type: ItemType.HELMET,
    rarity: ItemRarity.UNCOMMON,
    description: '坚固的铁头盔',
    char: '🧢',
    color: '#A0A0A0',
    stackable: false,
    stats: { defense: 3, hp: 5 },
    equippable: true,
    equipSlot: ItemType.HELMET
  },
  
  // 盾牌
  'wooden_shield': {
    id: 'wooden_shield',
    name: '木盾',
    type: ItemType.SHIELD,
    rarity: ItemRarity.COMMON,
    description: '木制圆盾',
    char: '🛡️',
    color: '#8B4513',
    stackable: false,
    stats: { defense: 2 },
    equippable: true,
    equipSlot: ItemType.SHIELD
  },
  'iron_shield': {
    id: 'iron_shield',
    name: '铁盾',
    type: ItemType.SHIELD,
    rarity: ItemRarity.UNCOMMON,
    description: '重型铁盾',
    char: '🛡️',
    color: '#A0A0A0',
    stackable: false,
    stats: { defense: 5 },
    equippable: true,
    equipSlot: ItemType.SHIELD
  },
  
  // 戒指
  'health_ring': {
    id: 'health_ring',
    name: '生命戒指',
    type: ItemType.RING,
    rarity: ItemRarity.RARE,
    description: '散发着温暖光芒的戒指',
    char: '💍',
    color: '#FF69B4',
    stackable: false,
    stats: { hp: 20 },
    equippable: true,
    equipSlot: ItemType.RING
  },
  'power_ring': {
    id: 'power_ring',
    name: '力量戒指',
    type: ItemType.RING,
    rarity: ItemRarity.RARE,
    description: '增强力量的魔法戒指',
    char: '💍',
    color: '#DC143C',
    stackable: false,
    stats: { attack: 5 },
    equippable: true,
    equipSlot: ItemType.RING
  },
  
  // 消耗品
  'health_potion': {
    id: 'health_potion',
    name: '生命药水',
    type: ItemType.CONSUMABLE,
    rarity: ItemRarity.COMMON,
    description: '恢复30点生命值',
    char: '🧪',
    color: '#FF0000',
    stackable: true,
    maxStack: 20,
    effects: [{ type: 'heal', value: 30 }]
  },
  'health_potion_large': {
    id: 'health_potion_large',
    name: '大生命药水',
    type: ItemType.CONSUMABLE,
    rarity: ItemRarity.UNCOMMON,
    description: '恢复80点生命值',
    char: '🧪',
    color: '#DC143C',
    stackable: true,
    maxStack: 10,
    effects: [{ type: 'heal', value: 80 }]
  },
  'mana_potion': {
    id: 'mana_potion',
    name: '法力药水',
    type: ItemType.CONSUMABLE,
    rarity: ItemRarity.COMMON,
    description: '恢复20点法力值',
    char: '🧪',
    color: '#0000FF',
    stackable: true,
    maxStack: 20,
    effects: [{ type: 'restore_mp', value: 20 }]
  },
  'strength_scroll': {
    id: 'strength_scroll',
    name: '力量卷轴',
    type: ItemType.CONSUMABLE,
    rarity: ItemRarity.RARE,
    description: '暂时提升攻击力',
    char: '📜',
    color: '#FFD700',
    stackable: true,
    maxStack: 5,
    effects: [{ type: 'buff_attack', value: 10, duration: 10 }]
  },
  
  // 材料
  'herb': {
    id: 'herb',
    name: '草药',
    type: ItemType.MATERIAL,
    rarity: ItemRarity.COMMON,
    description: '常见的药草',
    char: '🌿',
    color: '#228B22',
    stackable: true,
    maxStack: 99
  },
  'iron_ore': {
    id: 'iron_ore',
    name: '铁矿石',
    type: ItemType.MATERIAL,
    rarity: ItemRarity.COMMON,
    description: '含有铁元素的矿石',
    char: '⛏️',
    color: '#808080',
    stackable: true,
    maxStack: 99
  },
  'gold_ore': {
    id: 'gold_ore',
    name: '金矿石',
    type: ItemType.MATERIAL,
    rarity: ItemRarity.UNCOMMON,
    description: '珍贵的金矿石',
    char: '✨',
    color: '#FFD700',
    stackable: true,
    maxStack: 50
  },
  'magic_crystal': {
    id: 'magic_crystal',
    name: '魔法水晶',
    type: ItemType.MATERIAL,
    rarity: ItemRarity.RARE,
    description: '蕴含着魔力的水晶',
    char: '💎',
    color: '#9370DB',
    stackable: true,
    maxStack: 20
  }
};

/** 根据ID创建物品 */
export function createItem(id: string): Item | null {
  const template = ITEM_DATABASE[id];
  if (!template) return null;
  return { ...template };
}

/** 根据稀有度获取随机物品 */
export function getRandomItemByRarity(rarity: string): Item | null {
  const items = Object.values(ITEM_DATABASE).filter(i => i.rarity === rarity);
  if (items.length === 0) return null;
  return createItem(items[Math.floor(Math.random() * items.length)].id);
}

/** 获取随机物品（带权重） */
export function getRandomLoot(): Item | null {
  const rand = Math.random();
  let rarity: ItemRarity;
  
  if (rand < 0.5) rarity = ItemRarity.COMMON;
  else if (rand < 0.75) rarity = ItemRarity.UNCOMMON;
  else if (rand < 0.9) rarity = ItemRarity.RARE;
  else if (rand < 0.98) rarity = ItemRarity.EPIC;
  else rarity = ItemRarity.LEGENDARY;
  
  return getRandomItemByRarity(rarity);
}

/** 稀有度颜色映射 */
export const RARITY_COLORS: Record<string, string> = {
  common: '#A0A0A0',
  uncommon: '#228B22',
  rare: '#4169E1',
  epic: '#9370DB',
  legendary: '#FFD700'
};

/** 物品类型图标 */
export const ITEM_TYPE_ICONS: Record<string, string> = {
  weapon: '⚔️',
  armor: '👕',
  helmet: '🧢',
  shield: '🛡️',
  ring: '💍',
  consumable: '🧪',
  material: '📦'
};
