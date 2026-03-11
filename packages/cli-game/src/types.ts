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
