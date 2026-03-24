/**
 * 基于 ECS 架构的游戏核心逻辑
 * 
 * 这是原 game.ts 的 ECS 重构版本
 */

import * as ROT from 'rot-js';
import { 
  ECSWorld, Components, Systems, EntityId, World
} from '../ecs/index.js';
import { 
  Point2D, Tile, GameMap, LogMessage, 
  InventorySlot, EquipmentSlots as OldEquipmentSlots,
  GameConfig, Item as OldItem, CombatState as OldCombatState
} from './types.js';
import { createItem, getRandomLoot, RARITY_COLORS, ITEM_TYPE_ICONS } from '../data/items.js';
import { createSkill, getEnemyDefaultSkill } from '../data/skills.js';
import { TownMapManager } from '../map/town-map-manager.js';
import { TOWN_TILES, Building } from '../map/town-generator.js';
import { InteriorManager, BuildingInterior } from '../map/building-interior.js';
import { WorldMapManager, WorldMapType, PortalDirection } from '../map/world-map.js';
import { WildernessMapManager } from '../map/wilderness-map-manager.js';
import { WildernessMap } from '../map/wilderness-generator.js';

/** 重新导出物品相关常量 */
export { RARITY_COLORS, ITEM_TYPE_ICONS };

/** 当前地图类型 */
export enum MapType {
  TOWN = 'town',
  WILDERNESS = 'wilderness',
  DUNGEON = 'dungeon'
}

/** 默认游戏配置 */
const DEFAULT_CONFIG: GameConfig = {
  mapWidth: 80,
  mapHeight: 24,
  viewportWidth: 40,
  viewportHeight: 20,
  fovRadius: 12,
  maxDungeonLevel: 10
};

/** 地下城瓦片定义 */
export const DUNGEON_TILES = {
  WALL: { char: '██', color: '#808080', bgColor: '#2F2F2F', walkable: false, transparent: false },
  FLOOR: { char: '░░', color: '#1a1a1a', bgColor: '#1a1a1a', walkable: true, transparent: true },
  STAIRS_DOWN: { char: '⬇️', color: '#FFD700', bgColor: '#1a1a1a', walkable: false, transparent: true },
  STAIRS_UP: { char: '⬆️', color: '#FFD700', bgColor: '#1a1a1a', walkable: false, transparent: true }
};

/** 敌人模板 */
const ENTITY_TEMPLATES: Record<string, {
  name: string;
  char: string;
  color: string;
  hp: number;
  attack: number;
  defense: number;
  isHostile: boolean;
  dialogue?: string[];
}> = {
  'villager': { 
    name: '村民', char: '👴', color: '#FFA500', hp: 20, attack: 3, defense: 1, isHostile: false,
    dialogue: ['欢迎来到地下城！', '小心深处的怪物。'] 
  },
  'merchant': { 
    name: '商人', char: '👲', color: '#FFD700', hp: 30, attack: 3, defense: 1, isHostile: false,
    dialogue: ['需要补给吗？', '我这里有好东西。'] 
  },
  'slime': { name: '史莱姆', char: '🟢', color: '#32CD32', hp: 15, attack: 3, defense: 0, isHostile: true },
  'goblin': { name: '哥布林', char: '👺', color: '#228B22', hp: 25, attack: 5, defense: 1, isHostile: true },
  'skeleton': { name: '骷髅', char: '💀', color: '#F5F5DC', hp: 20, attack: 6, defense: 0, isHostile: true },
  'bat': { name: '蝙蝠', char: '🦇', color: '#800080', hp: 10, attack: 3, defense: 0, isHostile: true },
  'orc': { name: '兽人', char: '👹', color: '#006400', hp: 35, attack: 8, defense: 2, isHostile: true },
  'troll': { name: '巨魔', char: '🧌', color: '#008000', hp: 50, attack: 10, defense: 3, isHostile: true },
  'spider': { name: '蜘蛛', char: '🕷️', color: '#4B0082', hp: 12, attack: 4, defense: 0, isHostile: true },
  'snake': { name: '毒蛇', char: '🐍', color: '#556B2F', hp: 18, attack: 5, defense: 0, isHostile: true },
  'ghost': { name: '幽灵', char: '👻', color: '#E0E0E0', hp: 25, attack: 7, defense: 1, isHostile: true },
  'dragon': { name: '幼龙', char: '🐉', color: '#FF4500', hp: 80, attack: 15, defense: 5, isHostile: true }
};

/** 基于 ECS 的游戏主类 */
export class GameECS {
  private world: World;
  private config: GameConfig;
  onUpdate: () => void;
  
  // ECS 实体引用
  private playerEntity!: EntityId;
  
  // 地图系统（保留原地图管理器）
  private mapType: MapType = MapType.TOWN;
  private worldMap: WorldMapManager;
  private townManager: TownMapManager;
  private interiorManager: InteriorManager;
  private currentInterior: BuildingInterior | null = null;
  private currentBuilding: Building | null = null;
  private inBuilding: boolean = false;
  private wildernessManager: WildernessMapManager;
  
  // 地下城数据
  private dungeonMap!: GameMap;
  private dungeonLevel: number = 1;
  
  // 游戏状态
  private messages: LogMessage[] = [];
  private gameOver: boolean = false;
  private turn: number = 0;
  private godMode: boolean = true;
  
  // 视野
  private fov: InstanceType<typeof ROT.FOV.PreciseShadowcasting>;
  
  // 库存选择（UI 状态）
  private selectedInventoryIndex: number = 0;
  private inventoryFilter: string | null = null;

  constructor(onUpdate: () => void, config: Partial<GameConfig> = {}) {
    this.config = { ...DEFAULT_CONFIG, ...config };
    this.onUpdate = onUpdate;
    
    // 创建 ECS 世界
    this.world = new ECSWorld();
    
    // 初始化地图系统
    this.worldMap = new WorldMapManager();
    this.townManager = new TownMapManager(26);
    this.townManager.initialize(0, 0);
    this.interiorManager = new InteriorManager();
    this.wildernessManager = new WildernessMapManager({ difficulty: 1 });
    
    // 注册 ECS 系统
    this.registerSystems();
    
    // 创建玩家
    this.playerEntity = this.createPlayer();
    
    // 初始化视野
    this.fov = new ROT.FOV.PreciseShadowcasting((x, y) => {
      return this.isTransparent(x, y);
    });
    
    // 加载初始地图
    this.loadInitialMap();
    
    // 初始消息
    this.addMessage('🏘️ 欢迎来到新手村！城镇边缘有传送门通往野外。', '#00FF00');
    this.addMessage('探索世界，前往更远的城镇！', '#FFD700');
  }

  /** 注册 ECS 系统 */
  private registerSystems(): void {
    this.world.registerSystem(new Systems.MovementSystem());
    this.world.registerSystem(new Systems.CombatSystem());
    this.world.registerSystem(new Systems.VisibilitySystem());
    this.world.registerSystem(new Systems.AISystem());
    this.world.registerSystem(new Systems.BuffSystem());
    this.world.registerSystem(new Systems.SkillCooldownSystem());
    this.world.registerSystem(new Systems.ItemUseSystem());
    this.world.registerSystem(new Systems.EquipmentSystem());
    this.world.registerSystem(new Systems.SpawnSystem());
    this.world.registerSystem(new Systems.TurnSystem());
  }

  /** 创建玩家实体 */
  private createPlayer(): EntityId {
    const player = this.world.createEntity();
    
    // 基础组件
    this.world.addComponent(player, new Components.Name('勇者'));
    this.world.addComponent(player, new Components.Position(0, 0));
    this.world.addComponent(player, new Components.Render('🧙', '#FFD700'));
    this.world.addComponent(player, new Components.PlayerTag());
    
    // 战斗组件
    this.world.addComponent(player, new Components.Health(100, 100));
    this.world.addComponent(player, new Components.Mana(50, 50));
    this.world.addComponent(player, new Components.Combat(10, 5, 10, 5));
    this.world.addComponent(player, new Components.Faction('player'));
    
    // 成长组件
    this.world.addComponent(player, new Components.Level(1, 0, 100));
    this.world.addComponent(player, new Components.Stats(10, 10, 10, 10, 0));
    
    // 背包组件
    this.world.addComponent(player, new Components.Inventory(30));
    this.world.addComponent(player, new Components.EquipmentSlots());
    this.world.addComponent(player, new Components.Gold(0));
    
    // 技能组件
    this.world.addComponent(player, new Components.Skills(['slash', 'first_aid', 'focus']));
    this.world.addComponent(player, new Components.Buffs());
    
    // 游戏状态组件
    this.world.addComponent(player, new Components.GameState('explore'));
    this.world.addComponent(player, new Components.CombatState());
    this.world.addComponent(player, new Components.Turn(0));
    
    // 初始化背包物品
    this.initPlayerInventory(player);
    
    return player;
  }

  /** 初始化玩家背包 */
  private initPlayerInventory(player: EntityId): void {
    // 创建初始物品
    const potion = this.createItemEntity('health_potion');
    const sword = this.createItemEntity('rusty_sword');
    
    // 添加到背包
    const inventory = this.world.getComponent<Components.Inventory>(player, 'Inventory');
    if (inventory) {
      inventory.items.push(potion, sword);
    }
  }

  /** 创建物品实体 */
  private createItemEntity(itemId: string): EntityId {
    const item = this.world.createEntity();
    
    // 从原 items.ts 获取物品数据
    const itemData = createItem(itemId);
    
    if (!itemData) {
      // 如果物品不存在，创建一个默认物品
      this.world.addComponent(item, new Components.Name('未知物品', '一个神秘的物品'));
      this.world.addComponent(item, new Components.Render('?', '#888888'));
      this.world.addComponent(item, new Components.Item('unknown', 'material', 'common', false, 1, 1));
      return item;
    }
    
    this.world.addComponent(item, new Components.Name(itemData.name, itemData.description || ''));
    this.world.addComponent(item, new Components.Render(itemData.char, itemData.color));
    this.world.addComponent(item, new Components.Item(
      itemData.id,
      itemData.type,
      itemData.rarity,
      itemData.stackable,
      1,
      itemData.stackable ? 99 : 1
    ));
    
    if (itemData.equippable) {
      this.world.addComponent(item, new Components.Equipment(
        itemData.equipSlot as any || 'none',
        false
      ));
    }
    
    if (itemData.stats) {
      this.world.addComponent(item, new Components.ItemStats(
        itemData.stats.attack || 0,
        itemData.stats.defense || 0,
        itemData.stats.hp || 0,
        itemData.stats.mp || 0,
        itemData.stats.speed || 0,
        itemData.stats.critical || 0
      ));
    }
    
    if (itemData.effects) {
      const effect = itemData.effects[0];
      if (effect) {
        this.world.addComponent(item, new Components.ItemEffect(
          effect.type as any,
          effect.value || 0,
          0
        ));
      }
    }
    
    return item;
  }

  /** 创建敌人实体 */
  private createEnemyEntity(type: string, x: number, y: number): EntityId {
    const template = ENTITY_TEMPLATES[type];
    if (!template) throw new Error(`Unknown enemy type: ${type}`);
    
    const enemy = this.world.createEntity();
    
    this.world.addComponent(enemy, new Components.Name(template.name));
    this.world.addComponent(enemy, new Components.Position(x, y));
    this.world.addComponent(enemy, new Components.Render(template.char, template.color));
    this.world.addComponent(enemy, new Components.Health(template.hp, template.hp));
    this.world.addComponent(enemy, new Components.Combat(template.attack, template.defense, 8, 3));
    this.world.addComponent(enemy, new Components.Faction(template.isHostile ? 'hostile' : 'neutral'));
    this.world.addComponent(enemy, new Components.AI(
      template.isHostile ? 'aggressive' : 'passive',
      8,
      5
    ));
    this.world.addComponent(enemy, new Components.Buffs());
    
    if (template.dialogue) {
      this.world.addComponent(enemy, new Components.Dialogue(template.dialogue));
    }
    
    return enemy;
  }

  /** 同步加载初始地图 */
  private loadInitialMap(): void {
    const node = this.worldMap.getCurrentNode();
    if (!node) return;

    switch (node.type) {
      case WorldMapType.TOWN:
        this.mapType = MapType.TOWN;
        this.loadTown(node);
        break;
      case WorldMapType.WILDERNESS:
        this.mapType = MapType.WILDERNESS;
        this.loadWilderness(node);
        break;
      case WorldMapType.DUNGEON:
        this.mapType = MapType.DUNGEON;
        this.enterDungeon();
        break;
    }
  }

  /** 加载城镇 */
  private loadTown(node: { id: string; name: string }): void {
    const chunkSize = 26;
    const centerX = chunkSize * 1 + Math.floor(chunkSize / 2);
    const centerY = chunkSize * 1 + Math.floor(chunkSize / 2);
    
    const pos = this.world.getComponent<Components.Position>(this.playerEntity, 'Position');
    if (pos) {
      pos.x = centerX;
      pos.y = centerY;
    }
    
    this.townManager.updatePlayerPosition(centerX, centerY);
    this.addMessage(`进入 ${node.name}`, '#00FF00');
  }

  /** 加载野外 */
  private loadWilderness(node: { id: string; name: string; difficulty?: number }): void {
    const difficulty = node.difficulty || 1;
    this.wildernessManager = new WildernessMapManager({
      width: 60,
      height: 30,
      difficulty,
      monsterDensity: 0.02 + difficulty * 0.005,
      resourceDensity: 0.08
    });
    
    const currentNode = this.worldMap.getCurrentNode();
    const portals = currentNode?.portals.map(p => ({
      direction: p.direction,
      targetMapId: p.targetMapId
    })) || [];
    
    this.wildernessManager.generate(portals);
    
    const spawnPos = { x: 5, y: 15 }; // 默认出生点
    const pos = this.world.getComponent<Components.Position>(this.playerEntity, 'Position');
    if (pos && spawnPos) {
      pos.x = spawnPos.x;
      pos.y = spawnPos.y;
    }
    
    this.addMessage(`进入 ${node.name}`, '#FFA500');
  }

  /** 进入地下城 */
  private enterDungeon(): void {
    this.generateDungeon();
    this.dungeonLevel = 1;
    
    const pos = this.world.getComponent<Components.Position>(this.playerEntity, 'Position');
    if (pos) {
      pos.x = (this.dungeonMap as any).entrance.x;
      pos.y = (this.dungeonMap as any).entrance.y;
    }
    
    this.addMessage('进入地下城', '#FF4500');
  }

  /** 生成地下城 */
  private generateDungeon(): void {
    const width = this.config.mapWidth;
    const height = this.config.mapHeight;
    
    this.dungeonMap = {
      width,
      height,
      tiles: Array(width).fill(null).map(() => Array(height).fill(null)),
      explored: Array(width).fill(null).map(() => Array(height).fill(false)),
      visible: Array(width).fill(null).map(() => Array(height).fill(false))
    } as any; // 扩展类型添加 entrance/exit
    
    const digger = new ROT.Map.Digger(width, height, {
      roomWidth: [4, 10],
      roomHeight: [4, 8],
      corridorLength: [2, 6],
      dugPercentage: 0.2
    });
    
    digger.create((x, y, value) => {
      this.dungeonMap.tiles[x][y] = value === 1 
        ? { ...DUNGEON_TILES.WALL }
        : { ...DUNGEON_TILES.FLOOR };
    });
    
    const rooms = digger.getRooms();
    if (rooms.length > 0) {
      const firstRoom = rooms[0];
      const lastRoom = rooms[rooms.length - 1];
      
      (this.dungeonMap as any).entrance = {
        x: Math.floor((firstRoom.getLeft() + firstRoom.getRight()) / 2),
        y: Math.floor((firstRoom.getTop() + firstRoom.getBottom()) / 2)
      };
      
      (this.dungeonMap as any).exit = {
        x: Math.floor((lastRoom.getLeft() + lastRoom.getRight()) / 2),
        y: Math.floor((lastRoom.getTop() + lastRoom.getBottom()) / 2)
      };
    }
  }

  /** 更新视野 */
  private updateFOV(): void {
    if (this.mapType !== MapType.DUNGEON) return;
    
    const pos = this.world.getComponent<Components.Position>(this.playerEntity, 'Position');
    if (!pos) return;
    
    // 重置可见性
    for (let x = 0; x < this.config.mapWidth; x++) {
      for (let y = 0; y < this.config.mapHeight; y++) {
        this.dungeonMap.visible[x][y] = false;
      }
    }
    
    // 计算视野
    this.fov.compute(pos.x, pos.y, this.config.fovRadius, (x, y, r, visibility) => {
      if (x >= 0 && x < this.config.mapWidth && y >= 0 && y < this.config.mapHeight) {
        this.dungeonMap.visible[x][y] = true;
        this.dungeonMap.explored[x][y] = true;
      }
    });
  }

  /** 检查是否透明 */
  private isTransparent(x: number, y: number): boolean {
    if (x < 0 || x >= this.config.mapWidth || y < 0 || y >= this.config.mapHeight) {
      return false;
    }
    return this.dungeonMap.tiles[x]?.[y]?.transparent ?? true;
  }

  /** 添加消息 */
  addMessage(text: string, color: string = '#FFFFFF'): void {
    this.messages.push({ text, color, turn: this.turn });
    if (this.messages.length > 50) {
      this.messages.shift();
    }
  }

  // ============================================================
  // 输入处理
  // ============================================================

  handleInput(key: string): void {
    if (this.gameOver) return;
    
    const gameState = this.world.getComponent<Components.GameState>(this.playerEntity, 'GameState');
    if (!gameState) return;
    
    switch (gameState.state) {
      case 'explore':
        this.handleExploreInput(key);
        break;
      case 'combat':
        this.handleCombatInput(key);
        break;
      case 'inventory':
        this.handleInventoryInput(key);
        break;
    }
    
    this.onUpdate();
  }

  private handleExploreInput(key: string): void {
    let dx = 0, dy = 0;
    
    switch (key) {
      case 'arrowup':
      case 'w': dy = -1; break;
      case 'arrowdown':
      case 's': dy = 1; break;
      case 'arrowleft':
      case 'a': dx = -1; break;
      case 'arrowright':
      case 'd': dx = 1; break;
      case 'i':
        this.openInventory();
        return;
      case 'g':
        this.pickupItem();
        return;
      case 'e':
        this.interact();
        return;
      case 'escape':
        // 退出菜单或游戏
        return;
    }
    
    if (dx !== 0 || dy !== 0) {
      console.log(`[GameECS] Emitting move: entity=${this.playerEntity}, dx=${dx}, dy=${dy}`);
      this.world.emit('move', { entity: this.playerEntity, dx, dy });
      this.turn++;
      this.world.update(1); // 更新 ECS 世界
      
      // 同步位置到地图管理器（用于渲染）
      const pos = this.world.getComponent<Components.Position>(this.playerEntity, 'Position');
      if (pos) {
        console.log(`[GameECS] Player new position: (${pos.x}, ${pos.y})`);
        
        // 同步到对应的地图管理器
        if (this.mapType === MapType.TOWN) {
          this.townManager.updatePlayerPosition(pos.x, pos.y);
        } else if (this.mapType === MapType.WILDERNESS) {
          // 野外地图管理器
        }
      }
      
      this.updateFOV();
    }
  }

  private handleCombatInput(key: string): void {
    // 处理战斗输入
    switch (key) {
      case 'a':
        // 攻击
        break;
      case '1':
      case '2':
      case '3':
      case '4':
        // 使用技能
        break;
      case 'r':
        // 逃跑
        this.exitCombat();
        break;
    }
  }

  private handleInventoryInput(key: string): void {
    switch (key) {
      case 'escape':
      case 'i':
        this.closeInventory();
        break;
      case 'u':
        this.useSelectedItem();
        break;
      case 'e':
        this.equipSelectedItem();
        break;
      case 'd':
        this.dropSelectedItem();
        break;
    }
  }

  // ============================================================
  // 游戏动作
  // ============================================================

  private openInventory(): void {
    const gameState = this.world.getComponent<Components.GameState>(this.playerEntity, 'GameState');
    if (gameState) {
      gameState.state = 'inventory';
    }
  }

  private closeInventory(): void {
    const gameState = this.world.getComponent<Components.GameState>(this.playerEntity, 'GameState');
    if (gameState) {
      gameState.state = 'explore';
    }
  }

  private pickupItem(): void {
    // 实现拾取物品逻辑
  }

  private interact(): void {
    // 实现交互逻辑
  }

  private useSelectedItem(): void {
    // 实现使用物品逻辑
  }

  private equipSelectedItem(): void {
    // 实现装备物品逻辑
  }

  private dropSelectedItem(): void {
    // 实现丢弃物品逻辑
  }

  private exitCombat(): void {
    const gameState = this.world.getComponent<Components.GameState>(this.playerEntity, 'GameState');
    if (gameState) {
      gameState.state = 'explore';
    }
    
    const combatState = this.world.getComponent<Components.CombatState>(this.playerEntity, 'CombatState');
    if (combatState) {
      combatState.inCombat = false;
      combatState.enemies = [];
    }
  }

  // ============================================================
  // 数据获取（兼容原接口）
  // ============================================================

  getPlayer(): {
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
    buffs: any[];
    statPoints: number;
    baseAttack: number;
    baseDefense: number;
    baseMaxHp: number;
    baseMaxMp: number;
    skills: any;
  } {
    const name = this.world.getComponent<Components.Name>(this.playerEntity, 'Name');
    const level = this.world.getComponent<Components.Level>(this.playerEntity, 'Level');
    const health = this.world.getComponent<Components.Health>(this.playerEntity, 'Health');
    const mana = this.world.getComponent<Components.Mana>(this.playerEntity, 'Mana');
    const combat = this.world.getComponent<Components.Combat>(this.playerEntity, 'Combat');
    const gold = this.world.getComponent<Components.Gold>(this.playerEntity, 'Gold');
    const pos = this.world.getComponent<Components.Position>(this.playerEntity, 'Position');
    const stats = this.world.getComponent<Components.Stats>(this.playerEntity, 'Stats');
    const buffs = this.world.getComponent<Components.Buffs>(this.playerEntity, 'Buffs');
    const skills = this.world.getComponent<Components.Skills>(this.playerEntity, 'Skills');

    return {
      name: name?.name || '勇者',
      level: level?.level || 1,
      hp: health?.hp || 0,
      maxHp: health?.maxHp || 0,
      mp: mana?.mp || 0,
      maxMp: mana?.maxMp || 0,
      exp: level?.exp || 0,
      maxExp: level?.maxExp || 0,
      attack: combat?.attack || 0,
      defense: combat?.defense || 0,
      gold: gold?.amount || 0,
      position: pos || { x: 0, y: 0 },
      buffs: buffs?.list || [],
      statPoints: stats?.statPoints || 0,
      baseAttack: stats?.strength || 10,
      baseDefense: stats?.constitution || 10,
      baseMaxHp: (stats?.constitution || 10) * 10,
      baseMaxMp: (stats?.intelligence || 10) * 5,
      skills: skills || { learned: [], equipped: [], cooldowns: new Map() }
    };
  }

  getState(): string {
    const gameState = this.world.getComponent<Components.GameState>(this.playerEntity, 'GameState');
    return gameState?.state || 'explore';
  }

  getMapType(): MapType {
    return this.mapType;
  }

  getTownManager(): TownMapManager {
    return this.townManager;
  }

  getWildernessMap(): WildernessMap | null {
    return (this.wildernessManager as any).map;
  }

  getDungeonMap(): GameMap {
    return this.dungeonMap;
  }

  getMessages(): LogMessage[] {
    return this.messages;
  }

  getInventory(): { item: any; quantity: number }[] {
    const inventory = this.world.getComponent<Components.Inventory>(this.playerEntity, 'Inventory');
    if (!inventory) return [];

    return inventory.items.map(itemId => {
      const item = this.world.getComponent<Components.Item>(itemId, 'Item');
      const name = this.world.getComponent<Components.Name>(itemId, 'Name');
      return {
        item: {
          id: item?.id || '',
          name: name?.name || '',
          type: item?.itemType || 'material',
          rarity: item?.rarity || 'common'
        },
        quantity: item?.quantity || 1
      };
    });
  }

  getEquipment(): any {
    const slots = this.world.getComponent<Components.EquipmentSlots>(this.playerEntity, 'EquipmentSlots');
    if (!slots) return {};

    const getItemInfo = (id?: number) => {
      if (!id) return undefined;
      const name = this.world.getComponent<Components.Name>(id, 'Name');
      const item = this.world.getComponent<Components.Item>(id, 'Item');
      return name && item ? { id: item.id, name: name.name } : undefined;
    };

    return {
      weapon: getItemInfo(slots.weapon),
      armor: getItemInfo(slots.armor),
      helmet: getItemInfo(slots.helmet),
      shield: getItemInfo(slots.shield),
      ring: getItemInfo(slots.ring)
    };
  }

  getGold(): number {
    const gold = this.world.getComponent<Components.Gold>(this.playerEntity, 'Gold');
    return gold?.amount || 0;
  }

  getTurn(): number {
    return this.turn;
  }

  getDungeonLevel(): number {
    return this.dungeonLevel;
  }

  isGameOver(): boolean {
    return this.gameOver;
  }

  isInCombat(): boolean {
    const combatState = this.world.getComponent<Components.CombatState>(this.playerEntity, 'CombatState');
    return combatState?.inCombat || false;
  }

  isInBuilding(): boolean {
    return this.inBuilding;
  }

  getCurrentInterior(): BuildingInterior | null {
    return this.currentInterior;
  }

  getCurrentBuilding(): Building | null {
    return this.currentBuilding;
  }

  getConfig(): GameConfig {
    return this.config;
  }

  getAllEntities(): any[] {
    // 返回当前地图中的实体（用于渲染）
    return [];
  }

  getCombatEnemies(): any[] {
    const combatState = this.world.getComponent<Components.CombatState>(this.playerEntity, 'CombatState');
    if (!combatState) return [];

    return combatState.enemies.map(id => {
      const name = this.world.getComponent<Components.Name>(id, 'Name');
      const health = this.world.getComponent<Components.Health>(id, 'Health');
      const render = this.world.getComponent<Components.Render>(id, 'Render');
      return {
        name: name?.name || '',
        hp: health?.hp || 0,
        maxHp: health?.maxHp || 0,
        char: render?.char || ''
      };
    });
  }

  getCombatState(): string {
    const combatState = this.world.getComponent<Components.CombatState>(this.playerEntity, 'CombatState');
    return combatState?.turn || 'player';
  }

  getAvailableSkills(): any[] {
    const skills = this.world.getComponent<Components.Skills>(this.playerEntity, 'Skills');
    if (!skills) return [];

    return skills.equipped.map(id => createSkill(id));
  }

  getFilteredInventory(): any[] {
    return this.getInventory();
  }

  getSelectedInventoryIndex(): number {
    return this.selectedInventoryIndex;
  }

  getInventoryFilter(): string | null {
    return this.inventoryFilter;
  }

  getLoadingProgress(): number {
    return 100; // ECS 版本暂时同步加载
  }

  getLoadingMessage(): string {
    return '';
  }

  getLoadingTarget(): string {
    return '';
  }

  getWorldMap(): WorldMapManager {
    return this.worldMap;
  }

  // ============================================================
  // 调试方法
  // ============================================================

  debugGetECSWorld(): World {
    return this.world;
  }

  debugGetPlayerEntity(): EntityId {
    return this.playerEntity;
  }
}
