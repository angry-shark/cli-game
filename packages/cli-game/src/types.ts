/**
 * 游戏类型定义
 */

/** 2D 坐标 */
export interface Point2D {
  x: number;
  y: number;
}

/** 游戏状态 */
export enum GameState {
  EXPLORE = 'explore',
  COMBAT = 'combat',
  INVENTORY = 'inventory',
  MESSAGE = 'message',
  LEVEL_UP = 'level_up',
  GAME_OVER = 'game_over'
}

/** 战斗回合状态 */
export enum CombatState {
  PLAYER_TURN = 'player_turn',
  ENEMY_TURN = 'enemy_turn'
}

/** 实体类型 */
export enum EntityType {
  PLAYER = 'player',
  NPC = 'npc',
  ENEMY = 'enemy',
  CHEST = 'chest',
  DOOR = 'door',
  ITEM = 'item'
}

/** 地图实体 */
export interface Entity {
  id: string;
  type: EntityType;
  name: string;
  position: Point2D;
  char: string;
  color: string;
  hp?: number;
  maxHp?: number;
  attack?: number;
  defense?: number;
  dialogue?: string[];
  isHostile?: boolean;
  isOpen?: boolean;
  loot?: string[];
  skills?: Skill[];       // 敌人技能
  buffs?: Buff[];         // 当前增益效果
  mp?: number;            // 敌人法力值
  maxMp?: number;
}

/** 玩家数据 */
export interface PlayerData {
  name: string;
  level: number;
  hp: number;
  maxHp: number;
  mp: number;
  maxMp: number;
  exp: number;
  maxExp: number;
  attack: number;
  defense: number;
  gold: number;
  position: Point2D;
  skills: PlayerSkills;  // 技能数据
  buffs: Buff[];         // 当前增益效果
  // 加点系统
  statPoints: number;    // 可用属性点
  baseAttack: number;    // 基础攻击（不含装备加成）
  baseDefense: number;   // 基础防御（不含装备加成）
  baseMaxHp: number;     // 基础生命上限
  baseMaxMp: number;     // 基础法力上限
}

/** Buff/Debuff 效果 */
export interface Buff {
  type: 'attack' | 'defense' | 'speed' | 'poison' | 'stun';
  value: number;
  duration: number;  // 剩余回合数
  source: string;    // 来源（技能名）
}

/** 物品类型 */
export enum ItemType {
  WEAPON = 'weapon',
  ARMOR = 'armor',
  HELMET = 'helmet',
  SHIELD = 'shield',
  RING = 'ring',
  CONSUMABLE = 'consumable',
  MATERIAL = 'material'
}

/** 物品稀有度 */
export enum ItemRarity {
  COMMON = 'common',
  UNCOMMON = 'uncommon',
  RARE = 'rare',
  EPIC = 'epic',
  LEGENDARY = 'legendary'
}

/** 物品效果 */
export interface ItemEffect {
  type: 'heal' | 'restore_mp' | 'buff_attack' | 'buff_defense';
  value: number;
  duration?: number;
}

/** 物品定义 */
export interface Item {
  id: string;
  name: string;
  type: ItemType;
  rarity: ItemRarity;
  description: string;
  char: string;
  color: string;
  stackable: boolean;
  maxStack?: number;
  effects?: ItemEffect[];
  stats?: {
    attack?: number;
    defense?: number;
    hp?: number;
    mp?: number;
    speed?: number;
    critical?: number;
  };
  equippable?: boolean;
  equipSlot?: ItemType;
}

/** 背包槽位 */
export interface InventorySlot {
  item: Item;
  quantity: number;
}

/** 装备槽位 */
export interface EquipmentSlots {
  weapon?: Item;
  armor?: Item;
  helmet?: Item;
  shield?: Item;
  ring?: Item;
}

/** 地图瓦片 */
export interface Tile {
  char: string;
  color: string;
  bgColor?: string;
  walkable: boolean;
  transparent: boolean;
  width?: number;
  description?: string;
}

/** 地图数据 */
export interface GameMap {
  width: number;
  height: number;
  tiles: Tile[][];
  explored: boolean[][];
  visible: boolean[][];
}

/** 消息日志条目 */
export interface LogMessage {
  text: string;
  color: string;
  turn: number;
}

/** 游戏配置 */
export interface GameConfig {
  mapWidth: number;
  mapHeight: number;
  viewportWidth: number;
  viewportHeight: number;
  fovRadius: number;
  maxDungeonLevel: number;
}

/** 技能类型 */
export enum SkillType {
  ATTACK = 'attack',      // 攻击技能
  HEAL = 'heal',          // 治疗技能
  BUFF = 'buff',          // 增益技能
  DEBUFF = 'debuff',      // 减益技能
  SPECIAL = 'special'     // 特殊技能
}

/** 技能效果 */
export interface SkillEffect {
  type: 'damage' | 'heal' | 'buff_attack' | 'buff_defense' | 'buff_speed' | 'stun' | 'poison';
  value: number;
  duration?: number;      // 持续回合数
  target: 'self' | 'enemy' | 'all_enemies';
}

/** 技能定义 */
export interface Skill {
  id: string;
  name: string;
  description: string;
  type: SkillType;
  icon: string;
  effects: SkillEffect[];
  cooldown: number;       // 冷却回合数
  currentCooldown: number; // 当前冷却
  mpCost: number;         // 法力消耗
  power: number;          // 威力系数
}

/** 玩家技能数据 */
export interface PlayerSkills {
  learned: string[];      // 已学习的技能ID
  equipped: string[];     // 装备的技能ID（最多4个）
  cooldowns: Record<string, number>; // 技能冷却
}
