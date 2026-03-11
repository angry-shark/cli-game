/**
 * 游戏核心逻辑
 * 支持世界地图：城镇、野外、地下城
 */

import * as ROT from 'rot-js';
import {
  Point2D, GameState, EntityType, Entity, PlayerData,
  Tile, GameMap, LogMessage, InventorySlot, EquipmentSlots,
  GameConfig, Item, ItemType, ItemEffect, CombatState,
  Skill, Buff
} from './types.js';
import { createItem, getRandomLoot, RARITY_COLORS, ITEM_TYPE_ICONS } from './items.js';

// 重新导出物品相关常量
export { RARITY_COLORS, ITEM_TYPE_ICONS };
import { createSkill, getEnemyDefaultSkill } from './skills.js';
import { TownMapManager } from './town-manager.js';
import { TOWN_TILES, Building } from './town-generator.js';
import { InteriorManager, BuildingInterior } from './building-interior.js';
import { WorldMapManager, WorldMapType, PortalDirection } from './world-map.js';
import { WildernessGenerator, WildernessMap, WILDERNESS_TILES } from './wilderness-generator.js';

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
const DUNGEON_TILES = {
  WALL: { char: '██', color: '#808080', bgColor: '#2F2F2F', walkable: false, transparent: false },
  FLOOR: { char: '░░', color: '#1a1a1a', bgColor: '#1a1a1a', walkable: true, transparent: true },
  STAIRS_DOWN: { char: '⬇️', color: '#FFD700', bgColor: '#1a1a1a', walkable: false, transparent: true },
  STAIRS_UP: { char: '⬆️', color: '#FFD700', bgColor: '#1a1a1a', walkable: false, transparent: true }
};

/** 敌人模板 */
interface EnemyTemplate {
  name: string;
  char: string;
  color: string;
  hp: number;
  attack: number;
  defense: number;
  isHostile: true;
}

interface NPCTemplate {
  name: string;
  char: string;
  color: string;
  hp: number;
  dialogue: string[];
}

const ENTITY_TEMPLATES: Record<string, EnemyTemplate | NPCTemplate> = {
  'villager': { name: '村民', char: '👴', color: '#FFA500', hp: 20, dialogue: ['欢迎来到地下城！', '小心深处的怪物。'] },
  'merchant': { name: '商人', char: '👲', color: '#FFD700', hp: 30, dialogue: ['需要补给吗？', '我这里有好东西。'] },
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

/** 游戏主类 */
export class Game {
  private config: GameConfig;
  private mapType: MapType = MapType.TOWN;
  
  // 世界地图系统
  private worldMap: WorldMapManager;
  
  // 城镇系统
  private townManager: TownMapManager;
  private interiorManager: InteriorManager;
  private currentInterior: BuildingInterior | null = null;
  private currentBuilding: Building | null = null;
  private inBuilding: boolean = false;
  
  // 野外系统
  private wildernessMap: WildernessMap | null = null;
  private wildernessEntities: Entity[] = [];
  private wildernessGenerator: WildernessGenerator;
  
  // 地下城系统
  private dungeonMap!: GameMap;
  private dungeonEntities: Entity[] = [];
  private dungeonLevel: number = 1;
  
  // 通用数据
  private player: PlayerData;
  private inventory: InventorySlot[] = [];
  private equipment: EquipmentSlots = {};
  private gold: number = 0;
  private state: GameState = GameState.EXPLORE;
  private godMode: boolean = true; // 无敌模式 - 调试时开启
  private combatState: CombatState = CombatState.PLAYER_TURN;
  
  // 加载状态
  private loadingProgress: number = 0;
  private loadingMessage: string = '';
  private loadingTarget: string = '';
  private combatEnemies: Entity[] = [];
  private inCombat: boolean = false;
  private messages: LogMessage[] = [];
  private turn: number = 0;
  private scheduler: InstanceType<typeof ROT.Scheduler.Simple>;
  private engine: InstanceType<typeof ROT.Engine>;
  private fov: InstanceType<typeof ROT.FOV.PreciseShadowcasting>;
  onUpdate: () => void;
  private selectedInventoryIndex: number = 0;
  private inventoryFilter: ItemType | null = null;
  private gameOver: boolean = false;
  private enemyTurnDelay: number = 500;
  private townEntryPosition: Point2D | null = null;

  constructor(onUpdate: () => void, config: Partial<GameConfig> = {}) {
    this.config = { ...DEFAULT_CONFIG, ...config };
    this.onUpdate = onUpdate;
    
    // 初始化世界地图
    this.worldMap = new WorldMapManager();
    
    // 初始化玩家
    this.player = {
      name: '勇者',
      level: 1,
      hp: 100, maxHp: 100,
      mp: 50, maxMp: 50,
      exp: 0, maxExp: 100,
      attack: 10, defense: 5,
      gold: 0,
      position: { x: 0, y: 0 },
      skills: {
        learned: ['slash', 'first_aid', 'focus'],
        equipped: ['slash', 'first_aid', 'focus'],
        cooldowns: {}
      },
      buffs: [],
      statPoints: 0,
      baseAttack: 10, baseDefense: 5,
      baseMaxHp: 100, baseMaxMp: 50
    };
    
    // 初始化野外生成器
    this.wildernessGenerator = new WildernessGenerator({ difficulty: 1 });
    
    // 初始化城镇系统
    this.townManager = new TownMapManager(26);
    this.townManager.initialize(0, 0);
    
    // 初始化建筑内部系统
    this.interiorManager = new InteriorManager();
    
    // 根据世界地图当前节点加载对应地图
    this.loadCurrentWorldNode();
    
    // 初始化背包
    this.initInventory();
    
    // 初始化调度器
    this.scheduler = new ROT.Scheduler.Simple();
    this.scheduler.add(this, true);
    this.engine = new ROT.Engine(this.scheduler);
    
    // 初始化视野
    this.fov = new ROT.FOV.PreciseShadowcasting((x, y) => {
      return this.isTransparent(x, y);
    });
    
    this.updateFOV();
    this.addMessage('🏘️ 欢迎来到新手村！城镇边缘有传送门通往野外。', '#00FF00');
    this.addMessage('探索世界，前往更远的城镇！', '#FFD700');
  }

  /** 加载当前世界节点对应的地图 - 带进度条 */
  private async loadCurrentWorldNode(): Promise<void> {
    const node = this.worldMap.getCurrentNode();
    if (!node) return;

    // 开始加载
    this.state = GameState.LOADING;
    this.loadingTarget = node.name;
    this.loadingProgress = 0;
    this.loadingMessage = '正在准备...';
    this.onUpdate();

    // 模拟加载进度
    const steps = [
      { progress: 15, message: '正在生成地形...', delay: 100 },
      { progress: 35, message: '正在放置物体...', delay: 100 },
      { progress: 55, message: '正在生成生物...', delay: 100 },
      { progress: 75, message: '正在初始化...', delay: 100 },
      { progress: 90, message: '即将完成...', delay: 100 },
      { progress: 100, message: '加载完成！', delay: 100 }
    ];

    for (const step of steps) {
      await this.delay(step.delay);
      this.loadingProgress = step.progress;
      this.loadingMessage = step.message;
      this.onUpdate();
    }

    // 实际加载地图
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

    // 结束加载
    await this.delay(200);
    this.state = GameState.EXPLORE;
    this.loadingProgress = 0;
    this.onUpdate();
  }

  /** 延迟辅助函数 */
  private delay(ms: number): Promise<void> {
    return new Promise(resolve => setTimeout(resolve, ms));
  }

  /** 获取加载进度 */
  getLoadingProgress(): number {
    return this.loadingProgress;
  }

  /** 获取加载消息 */
  getLoadingMessage(): string {
    return this.loadingMessage;
  }

  /** 获取加载目标 */
  getLoadingTarget(): string {
    return this.loadingTarget;
  }

  /** 加载城镇 */
  private loadTown(node: { id: string; name: string }): void {
    // 城镇使用 26x26 的区块，3x3 网格
    // 中心区块是 (1,1)，中心位置大约在 (39, 39)
    const chunkSize = 26;
    const centerX = chunkSize * 1 + Math.floor(chunkSize / 2); // 26 + 13 = 39
    const centerY = chunkSize * 1 + Math.floor(chunkSize / 2); // 39
    
    // 设置玩家到城镇中心
    this.player.position = { x: centerX, y: centerY };
    this.townManager.updatePlayerPosition(centerX, centerY);
    
    this.addMessage(`进入 ${node.name}`, '#00FF00');
  }

  /** 加载野外地图 */
  private loadWilderness(node: { id: string; name: string; difficulty?: number }): void {
    const difficulty = node.difficulty || 1;
    // 根据难度设置生成器 - 降低怪物密度
    this.wildernessGenerator = new WildernessGenerator({
      width: 60,
      height: 30,
      difficulty: difficulty,
      monsterDensity: 0.02 + difficulty * 0.005, // 降低基础密度
      resourceDensity: 0.08
    });
    
    // 获取连接信息
    const currentNode = this.worldMap.getCurrentNode();
    const portals = currentNode?.portals.map(p => ({
      direction: p.direction,
      targetMapId: p.targetMapId
    })) || [];
    
    // 生成野外地图
    this.wildernessMap = this.wildernessGenerator.generateMap(portals);
    this.wildernessEntities = this.wildernessGenerator.generateMonsters(this.wildernessMap);
    
    // 设置玩家位置（从第一个传送门附近开始）
    if (this.wildernessMap.portals.length > 0) {
      const entryPortal = this.wildernessMap.portals[0];
      this.player.position = {
        x: entryPortal.x,
        y: entryPortal.y + 2 // 传送门下方
      };
    } else {
      this.player.position = { x: 30, y: 15 };
    }
    
    this.addMessage(`进入 ${node.name} - 难度: ${'★'.repeat(node.difficulty || 1)}`, '#FF6347');
  }

  // ========== 地图切换 ==========

  /** 进入地下城 */
  enterDungeon(): void {
    this.townEntryPosition = { ...this.player.position };
    this.mapType = MapType.DUNGEON;
    this.generateDungeonMap();
    this.addMessage('🏰 进入地下城...', '#FF4444');
    this.updateFOV();
    this.onUpdate();
  }

  /** 返回城镇 */
  returnToTown(): void {
    this.mapType = MapType.TOWN;
    if (this.townEntryPosition) {
      this.player.position = { ...this.townEntryPosition };
    }
    this.townManager.updatePlayerPosition(this.player.position.x, this.player.position.y);
    this.addMessage('🏘️ 回到城镇', '#00FF00');
    this.updateFOV();
    this.onUpdate();
  }

  /** 通过传送门切换地图 */
  private async usePortal(direction: PortalDirection): Promise<void> {
    const portal = this.worldMap.getPortalInDirection(direction);
    if (!portal) {
      this.addMessage('这个方向没有传送门', '#808080');
      return;
    }

    const targetNode = this.worldMap.switchToNode(portal.targetMapId);
    if (targetNode) {
      await this.loadCurrentWorldNode();
      this.updateFOV();
      this.onUpdate();
    }
  }

  // ========== 地下城生成 ==========

  private generateDungeonMap(): void {
    const map: GameMap = {
      width: this.config.mapWidth,
      height: this.config.mapHeight,
      tiles: [],
      explored: [],
      visible: []
    };

    for (let x = 0; x < map.width; x++) {
      map.tiles[x] = [];
      map.explored[x] = [];
      map.visible[x] = [];
      for (let y = 0; y < map.height; y++) {
        map.tiles[x][y] = DUNGEON_TILES.WALL;
        map.explored[x][y] = false;
        map.visible[x][y] = false;
      }
    }

    const digger = new ROT.Map.Digger(map.width, map.height, {
      roomWidth: [4, 10],
      roomHeight: [4, 8],
      corridorLength: [2, 6],
      dugPercentage: 0.2
    });

    const rooms: Array<{ getLeft(): number; getRight(): number; getTop(): number; getBottom(): number }> = [];
    digger.create((x, y, value) => {
      if (value === 0) {
        map.tiles[x][y] = DUNGEON_TILES.FLOOR;
      }
    });

    digger.getRooms().forEach(room => rooms.push(room));

    if (rooms.length > 0) {
      const firstRoom = rooms[0];
      const stairsX = firstRoom.getLeft() + 1;
      const stairsY = firstRoom.getTop() + 1;
      map.tiles[stairsX][stairsY] = DUNGEON_TILES.STAIRS_UP;
      this.player.position = { x: stairsX, y: stairsY + 1 };
    }

    if (rooms.length > 0) {
      const lastRoom = rooms[rooms.length - 1];
      const stairsX = lastRoom.getRight() - 2;
      const stairsY = lastRoom.getBottom() - 2;
      
      if (map.tiles[stairsX][stairsY].walkable || map.tiles[stairsX][stairsY].char === '░░') {
        map.tiles[stairsX][stairsY] = DUNGEON_TILES.STAIRS_DOWN;
      }
    }

    this.dungeonMap = map;
    this.dungeonEntities = [];
    this.generateDungeonEntities(rooms);
  }

  private generateDungeonEntities(rooms: Array<{ getLeft(): number; getRight(): number; getTop(): number; getBottom(): number }>): void {
    this.dungeonEntities = [];
    
    for (let i = 1; i < rooms.length; i++) {
      const room = rooms[i];
      const centerX = Math.floor((room.getLeft() + room.getRight()) / 2);
      const centerY = Math.floor((room.getTop() + room.getBottom()) / 2);

      const roll = Math.random();
      
      if (roll < 0.3) {
        this.spawnDungeonEnemy(centerX, centerY);
      } else if (roll < 0.4) {
        this.spawnDungeonChest(centerX, centerY);
      } else if (roll < 0.5) {
        this.spawnDungeonNPC(centerX, centerY);
      }
    }
  }

  private spawnDungeonEnemy(x: number, y: number): void {
    const templates = Object.entries(ENTITY_TEMPLATES).filter(([_, t]) => 'isHostile' in t) as [string, EnemyTemplate][];
    const [key, template] = templates[Math.floor(Math.random() * templates.length)];
    
    const defaultSkill = getEnemyDefaultSkill(key);
    const skills: Skill[] = [];
    if (defaultSkill) skills.push(defaultSkill);
    
    this.dungeonEntities.push({
      id: `enemy_${this.turn}_${x}_${y}`,
      type: EntityType.ENEMY,
      name: template.name,
      position: { x, y },
      char: template.char,
      color: template.color,
      hp: template.hp,
      maxHp: template.hp,
      attack: template.attack,
      defense: template.defense,
      isHostile: true,
      skills,
      buffs: [],
      mp: 0, maxMp: 0
    });
  }

  private spawnDungeonChest(x: number, y: number): void {
    this.dungeonEntities.push({
      id: `chest_${this.turn}_${x}_${y}`,
      type: EntityType.CHEST,
      name: '宝箱',
      position: { x, y },
      char: '📦',
      color: '#FFD700',
      isOpen: false,
      loot: ['health_potion', 'herb', 'iron_ore']
    });
  }

  private spawnDungeonNPC(x: number, y: number): void {
    const npcTypes = ['villager', 'merchant'];
    const key = npcTypes[Math.floor(Math.random() * npcTypes.length)];
    const template = ENTITY_TEMPLATES[key] as NPCTemplate;
    
    this.dungeonEntities.push({
      id: `npc_${this.turn}_${x}_${y}`,
      type: EntityType.NPC,
      name: template.name,
      position: { x, y },
      char: template.char,
      color: template.color,
      dialogue: template.dialogue
    });
  }

  // ========== 地图查询 ==========

  private isInBounds(x: number, y: number): boolean {
    if (this.mapType === MapType.WILDERNESS && this.wildernessMap) {
      return x >= 0 && x < this.wildernessMap.width && y >= 0 && y < this.wildernessMap.height;
    }
    if (this.mapType === MapType.DUNGEON) {
      return x >= 0 && x < this.dungeonMap.width && y >= 0 && y < this.dungeonMap.height;
    }
    return true;
  }

  private isTransparent(x: number, y: number): boolean {
    if (this.mapType === MapType.WILDERNESS && this.wildernessMap) {
      if (!this.isInBounds(x, y)) return false;
      return this.wildernessMap.tiles[x][y].transparent;
    }
    if (this.mapType === MapType.TOWN) {
      const tile = this.townManager.getTile(x, y);
      return tile.transparent;
    }
    if (!this.isInBounds(x, y)) return false;
    return this.dungeonMap.tiles[x][y].transparent;
  }

  private isWalkable(x: number, y: number): boolean {
    if (this.mapType === MapType.WILDERNESS && this.wildernessMap) {
      if (!this.isInBounds(x, y)) return false;
      return this.wildernessMap.tiles[x][y].walkable;
    }
    if (this.mapType === MapType.TOWN) {
      return this.townManager.isWalkable(x, y);
    }
    if (!this.isInBounds(x, y)) return false;
    return this.dungeonMap.tiles[x][y].walkable;
  }

  private getTile(x: number, y: number): Tile {
    if (this.mapType === MapType.WILDERNESS && this.wildernessMap) {
      if (!this.isInBounds(x, y)) return WILDERNESS_TILES.ROCK;
      return this.wildernessMap.tiles[x][y];
    }
    if (this.mapType === MapType.TOWN) {
      return this.townManager.getTile(x, y);
    }
    if (!this.isInBounds(x, y)) return DUNGEON_TILES.WALL;
    return this.dungeonMap.tiles[x][y];
  }

  private getEntityAt(x: number, y: number): Entity | undefined {
    if (this.mapType === MapType.WILDERNESS) {
      return this.wildernessEntities.find(e => e.position.x === x && e.position.y === y);
    }
    if (this.mapType === MapType.TOWN) {
      return this.townManager.getEntityAt(x, y);
    }
    return this.dungeonEntities.find(e => e.position.x === x && e.position.y === y);
  }

  private getAllEntities(): Entity[] {
    if (this.mapType === MapType.WILDERNESS) {
      return this.wildernessEntities;
    }
    if (this.mapType === MapType.TOWN) {
      return this.townManager.getAllEntities();
    }
    return this.dungeonEntities;
  }

  private removeEntity(entity: Entity): void {
    if (this.mapType === MapType.WILDERNESS) {
      this.wildernessEntities = this.wildernessEntities.filter(e => e.id !== entity.id);
    } else if (this.mapType === MapType.TOWN) {
      this.townManager.removeEntity(entity);
    } else {
      this.dungeonEntities = this.dungeonEntities.filter(e => e.id !== entity.id);
    }
  }

  // ========== 视野系统 ==========

  private updateFOV(): void {
    if (this.mapType === MapType.DUNGEON) {
      for (let x = 0; x < this.dungeonMap.width; x++) {
        for (let y = 0; y < this.dungeonMap.height; y++) {
          this.dungeonMap.explored[x][y] = true;
          this.dungeonMap.visible[x][y] = false;
        }
      }

      this.fov.compute(
        this.player.position.x,
        this.player.position.y,
        this.config.fovRadius,
        (x: number, y: number) => {
          if (this.isInBounds(x, y)) {
            this.dungeonMap.visible[x][y] = true;
          }
        }
      );
    }
  }

  // ========== 输入处理 ==========

  async handleInput(key: string): Promise<void> {
    if (this.gameOver) return;
    
    if (this.state === GameState.LOADING) return;
    
    if (this.state === GameState.COMBAT && this.combatState !== CombatState.PLAYER_TURN) {
      return;
    }

    switch (this.state) {
      case GameState.EXPLORE:
        await this.handleExploreInput(key);
        break;
      case GameState.COMBAT:
        await this.handleCombatInput(key);
        break;
      case GameState.INVENTORY:
        this.handleInventoryInput(key);
        break;
      case GameState.LEVEL_UP:
        this.handleLevelUpInput(key);
        break;
    }
  }

  private handleLevelUpInput(key: string): void {
    if (this.player.statPoints <= 0) {
      this.state = GameState.EXPLORE;
      this.onUpdate();
      return;
    }
    
    switch (key) {
      case '1':
        this.player.baseAttack += 2;
        this.player.statPoints--;
        this.addMessage('⚔️ 攻击力 +2', '#FFD700');
        break;
      case '2':
        this.player.baseDefense += 1;
        this.player.statPoints--;
        this.addMessage('🛡️ 防御力 +1', '#FFD700');
        break;
      case '3':
        this.player.baseMaxHp += 15;
        this.player.hp += 15;
        this.player.statPoints--;
        this.addMessage('💚 生命上限 +15', '#FFD700');
        break;
      case '4':
        this.player.baseMaxMp += 10;
        this.player.mp += 10;
        this.player.statPoints--;
        this.addMessage('💙 法力上限 +10', '#FFD700');
        break;
      case 'enter':
      case 'escape':
        this.state = GameState.EXPLORE;
        this.addMessage('加点完成！', '#00FF00');
        break;
    }
    
    this.updatePlayerStats();
    this.onUpdate();
    
    if (this.player.statPoints <= 0 && this.state === GameState.LEVEL_UP) {
      this.state = GameState.EXPLORE;
      this.addMessage('所有属性点已分配！', '#00FF00');
      this.onUpdate();
    }
  }

  private async handleExploreInput(key: string): Promise<void> {
    let moved = false;
    let dx = 0, dy = 0;

    switch (key) {
      case 'w':
      case 'arrowup':
        dy = -1; moved = true;
        break;
      case 's':
      case 'arrowdown':
        dy = 1; moved = true;
        break;
      case 'a':
      case 'arrowleft':
        dx = -1; moved = true;
        break;
      case 'd':
      case 'arrowright':
        dx = 1; moved = true;
        break;
      case 'e':
        this.interact();
        return;
      case 'i':
        this.openInventory();
        return;
      case 'g':
        this.pickupItemExplore();
        return;
      case 'escape':
      case 'q':
        process.exit(0);
        return;
    }

    if (moved) {
      await this.movePlayerExplore(dx, dy);
    }
  }

  private async movePlayerExplore(dx: number, dy: number): Promise<void> {
    const newX = this.player.position.x + dx;
    const newY = this.player.position.y + dy;

    // 建筑内移动
    if (this.inBuilding && this.currentInterior) {
      if (newX < 0 || newX >= this.currentInterior.width || 
          newY < 0 || newY >= this.currentInterior.height) {
        return;
      }
      
      const tile = this.currentInterior.tiles[newX][newY];
      if (!tile.walkable) {
        return;
      }
      
      const npc = this.interiorManager.getInteriorEntityAt(this.currentInterior, newX, newY);
      if (npc) {
        return;
      }
      
      this.player.position.x = newX;
      this.player.position.y = newY;
      this.onUpdate();
      return;
    }

    if (!this.isWalkable(newX, newY)) {
      return;
    }

    const entityAtPosition = this.getEntityAt(newX, newY);
    
    if (entityAtPosition?.type === EntityType.ENEMY) {
      await this.startCombat(entityAtPosition);
      return;
    }
    
    if (entityAtPosition?.type === EntityType.NPC) {
      return;
    }

    this.player.position.x = newX;
    this.player.position.y = newY;
    
    if (this.mapType === MapType.TOWN) {
      this.townManager.updatePlayerPosition(newX, newY);
      const chunkInfo = this.townManager.getCurrentChunkInfo();
      if (chunkInfo.x < 0 || chunkInfo.x >= 3 || chunkInfo.y < 0 || chunkInfo.y >= 3) {
        // 超出城镇边界，检查是否有传送门
        await this.checkTownBoundary(chunkInfo.x, chunkInfo.y);
      }
    }
    
    this.updateFOV();
    
    if (this.mapType === MapType.DUNGEON || this.mapType === MapType.WILDERNESS) {
      await this.checkCombatTrigger();
    }
    
    this.onUpdate();
  }

  /** 检查城镇边界，触发传送 */
  private async checkTownBoundary(chunkX: number, chunkY: number): Promise<void> {
    let direction: PortalDirection | null = null;
    
    if (chunkX < 0) direction = PortalDirection.WEST;
    else if (chunkX >= 3) direction = PortalDirection.EAST;
    else if (chunkY < 0) direction = PortalDirection.NORTH;
    else if (chunkY >= 3) direction = PortalDirection.SOUTH;
    
    if (direction) {
      // 先检查该方向是否有传送门
      const portal = this.worldMap.getPortalInDirection(direction);
      if (portal) {
        this.addMessage(`到达城镇边界，发现通往${portal.label}的传送门！`, '#FFD700');
        // 自动触发传送
        await this.usePortal(direction);
      } else {
        this.addMessage('到达城镇边界，但这里被高墙阻挡了', '#808080');
      }
    }
  }

  private async checkCombatTrigger(): Promise<void> {
    const nearbyEnemies = this.getAllEntities().filter(e => {
      if (e.type !== EntityType.ENEMY) return false;
      const dist = Math.abs(e.position.x - this.player.position.x) + 
                   Math.abs(e.position.y - this.player.position.y);
      return dist <= 2;
    });
    
    if (nearbyEnemies.length > 0) {
      await this.startCombat(nearbyEnemies[0]);
    }
  }

  // ========== 战斗系统 ==========

  private async startCombat(enemy: Entity): Promise<void> {
    // 显示战斗进入加载
    this.state = GameState.LOADING;
    this.loadingTarget = '战斗';
    this.loadingProgress = 0;
    this.loadingMessage = '遭遇敌人...';
    this.onUpdate();

    // 模拟加载进度
    const steps = [
      { progress: 30, message: '准备战斗...', delay: 80 },
      { progress: 60, message: '进入战场...', delay: 80 },
      { progress: 100, message: '战斗开始！', delay: 100 }
    ];

    for (const step of steps) {
      await this.delay(step.delay);
      this.loadingProgress = step.progress;
      this.loadingMessage = step.message;
      this.onUpdate();
    }

    await this.delay(150);

    this.inCombat = true;
    this.state = GameState.COMBAT;
    this.combatState = CombatState.PLAYER_TURN;
    
    this.combatEnemies = this.getAllEntities().filter(e => {
      if (e.type !== EntityType.ENEMY) return false;
      const dist = Math.abs(e.position.x - this.player.position.x) + 
                   Math.abs(e.position.y - this.player.position.y);
      return dist <= 2;
    });
    
    if (this.combatEnemies.length === 0) {
      this.combatEnemies = [enemy];
    }
    
    this.addMessage(`⚔️ 进入战斗！遭遇 ${enemy.name}`, '#FF0000');
    this.loadingProgress = 0;
    this.onUpdate();
  }

  private async endCombat(): Promise<void> {
    // 显示战斗结束加载
    this.state = GameState.LOADING;
    this.loadingTarget = '探索';
    this.loadingProgress = 0;
    this.loadingMessage = '战斗结束...';
    this.onUpdate();

    // 模拟加载进度
    const steps = [
      { progress: 40, message: '拾取战利品...', delay: 80 },
      { progress: 70, message: '恢复状态...', delay: 80 },
      { progress: 100, message: '返回探索！', delay: 100 }
    ];

    for (const step of steps) {
      await this.delay(step.delay);
      this.loadingProgress = step.progress;
      this.loadingMessage = step.message;
      this.onUpdate();
    }

    await this.delay(150);

    this.inCombat = false;
    this.state = GameState.EXPLORE;
    this.combatState = CombatState.PLAYER_TURN;
    this.combatEnemies = [];
    this.addMessage('✓ 战斗结束', '#00FF00');
    this.loadingProgress = 0;
    this.onUpdate();
  }

  private async handleCombatInput(key: string): Promise<void> {
    switch (key) {
      case 'a':
      case 'arrowleft':
        await this.combatAttack();
        break;
      case 'd':
      case 'arrowright':
        this.combatDefend();
        break;
      case '1':
      case '2':
      case '3':
      case '4':
        const skillIndex = parseInt(key) - 1;
        const skills = this.getAvailableSkills();
        if (skillIndex < skills.length) {
          this.useSkill(skills[skillIndex].id, this.combatEnemies[0]);
        }
        break;
      case 'i':
        this.openInventory();
        break;
      case 'r':
        await this.combatRetreat();
        break;
      case 'escape':
        await this.combatRetreat();
        break;
    }
  }

  private async combatAttack(): Promise<void> {
    if (this.combatEnemies.length === 0) {
      await this.endCombat();
      return;
    }
    
    const target = this.combatEnemies[0];
    const damage = Math.max(1, this.getPlayerAttack() - (target.defense || 0));
    target.hp! -= damage;
    
    this.addMessage(`你攻击了 ${target.name}，造成 ${damage} 点伤害`, '#FFFFFF');
    
    if (target.hp! <= 0) {
      this.addMessage(`你击败了 ${target.name}！`, '#00FF00');
      this.player.exp += 10 + this.dungeonLevel * 5;
      this.gold += Math.floor(Math.random() * 10) + 5;
      
      if (this.player.exp >= this.player.maxExp) {
        this.levelUp();
      }
      
      this.removeEntity(target);
      this.combatEnemies = this.combatEnemies.filter(e => e.id !== target.id);
      
      if (this.combatEnemies.length === 0) {
        setTimeout(async () => await this.endCombat(), 500);
        return;
      }
    }
    
    this.endPlayerCombatTurn();
  }

  private combatDefend(): void {
    this.addMessage('你采取防御姿态，本回合受到的伤害减半', '#00FF00');
    this.endPlayerCombatTurn();
  }

  private async combatRetreat(): Promise<void> {
    this.addMessage('你尝试撤退...', '#FFFF00');
    if (Math.random() < 0.5) {
      this.addMessage('成功撤退！', '#00FF00');
      // 逃跑成功：将战斗中的怪物移动到玩家5格以外
      this.repositionFledEnemies();
      await this.endCombat();
    } else {
      this.addMessage('撤退失败！', '#FF0000');
      this.endPlayerCombatTurn();
    }
  }

  /** 逃跑成功后，将怪物重新定位到玩家5格以外 */
  private repositionFledEnemies(): void {
    const minDistance = 5;
    const playerX = this.player.position.x;
    const playerY = this.player.position.y;
    
    for (const enemy of this.combatEnemies) {
      let placed = false;
      let attempts = 0;
      
      while (!placed && attempts < 50) {
        // 在玩家周围5格外随机选择位置
        const angle = Math.random() * Math.PI * 2;
        const distance = minDistance + Math.random() * 10; // 5-15格距离
        
        const newX = Math.floor(playerX + Math.cos(angle) * distance);
        const newY = Math.floor(playerY + Math.sin(angle) * distance);
        
        // 检查位置是否有效（在地图内且可行走）
        if (this.isInBounds(newX, newY)) {
          const tile = this.getTile(newX, newY);
          if (tile && tile.walkable && !this.getEntityAt(newX, newY)) {
            // 更新怪物位置
            enemy.position.x = newX;
            enemy.position.y = newY;
            placed = true;
          }
        }
        attempts++;
      }
      
      if (!placed) {
        // 如果无法找到合适位置，将怪物从地图中移除
        this.removeEntity(enemy);
      }
    }
    
    // 清空战斗中的敌人列表（它们已经被重新定位或移除）
    this.combatEnemies = [];
  }

  private endPlayerCombatTurn(): void {
    this.combatState = CombatState.ENEMY_TURN;
    this.turn++;
    this.onUpdate();
    
    setTimeout(() => {
      this.processCombatEnemyTurns();
    }, this.enemyTurnDelay);
  }

  private async processCombatEnemyTurns(): Promise<void> {
    this.processBuffs();
    
    if (this.player.hp <= 0) {
      this.player.hp = 0;
      this.gameOver = true;
      this.state = GameState.GAME_OVER;
      this.addMessage('你被击败了！游戏结束', '#FF0000');
      this.onUpdate();
      return;
    }
    
    for (const enemy of this.combatEnemies) {
      if (this.gameOver) break;
      
      const isStunned = enemy.buffs?.some(b => b.type === 'stun');
      if (isStunned) {
        this.addMessage(`${enemy.name} 眩晕中，无法行动`, '#FFFF00');
        this.onUpdate();
        await this.delay(this.enemyTurnDelay);
        continue;
      }
      
      this.enemyUseSkill(enemy);
      
      if (this.player.hp <= 0) {
        this.player.hp = 0;
        this.gameOver = true;
        this.state = GameState.GAME_OVER;
        this.addMessage('你被击败了！游戏结束', '#FF0000');
        this.onUpdate();
        return;
      }
      
      this.onUpdate();
      await this.delay(this.enemyTurnDelay);
    }
    
    this.reduceCooldowns();
    
    if (!this.gameOver && this.combatEnemies.length > 0) {
      this.combatState = CombatState.PLAYER_TURN;
      this.onUpdate();
    } else if (this.combatEnemies.length === 0) {
      await this.endCombat();
    }
  }

  // ========== 交互系统 ==========

  private interact(): void {
    const x = this.player.position.x;
    const y = this.player.position.y;
    const tile = this.getTile(x, y);
    
    // 建筑内部
    if (this.inBuilding && this.currentInterior) {
      const doorX = Math.floor(this.currentInterior.width / 2);
      const doorY = this.currentInterior.height - 1;
      if (x === doorX && y === doorY) {
        this.exitBuilding();
        return;
      }
      
      const npc = this.interiorManager.getInteriorEntityAt(this.currentInterior, x, y);
      if (npc && npc.type === EntityType.NPC && npc.dialogue) {
        const line = npc.dialogue[Math.floor(Math.random() * npc.dialogue.length)];
        this.addMessage(`${npc.name}: "${line}"`, '#FFD700');
        this.onUpdate();
        return;
      }
      
      this.addMessage('按 E 在门口离开建筑', '#808080');
      this.onUpdate();
      return;
    }
    
    // 查找周围楼梯/传送门
    const nearbyStairs = this.findNearbyStairs(x, y);
    
    if (nearbyStairs === 'down' && this.mapType === MapType.TOWN) {
      this.enterDungeon();
      return;
    }
    
    if (nearbyStairs === 'up' && this.mapType === MapType.DUNGEON) {
      this.returnToTown();
      return;
    }
    
    if (nearbyStairs === 'down' && this.mapType === MapType.DUNGEON) {
      this.dungeonLevel++;
      this.addMessage(`进入地下城第 ${this.dungeonLevel} 层...`, '#FFD700');
      this.generateDungeonMap();
      this.updateFOV();
      this.onUpdate();
      return;
    }
    
    // 野外传送门
    if (this.mapType === MapType.WILDERNESS && this.wildernessMap) {
      const portal = this.wildernessMap.portals.find(p => 
        Math.abs(p.x - x) + Math.abs(p.y - y) <= 1
      );
      if (portal) {
        this.usePortalByTarget(portal.targetMapId);
        return;
      }
    }
    
    // 城镇建筑
    if (this.mapType === MapType.TOWN) {
      const building = this.townManager.getBuildingAt(x, y);
      if (building && this.interiorManager.isBuildingEntrance(x, y, building)) {
        this.enterBuilding(building);
        return;
      }
    }
    
    // 周围NPC
    const nearby = this.getAllEntities().filter(e => {
      const dx = Math.abs(e.position.x - x);
      const dy = Math.abs(e.position.y - y);
      return dx <= 1 && dy <= 1 && !(dx === 0 && dy === 0);
    });

    if (nearby.length > 0 && nearby[0].type === EntityType.NPC) {
      const npc = nearby[0];
      if (npc.dialogue) {
        const line = npc.dialogue[Math.floor(Math.random() * npc.dialogue.length)];
        this.addMessage(`${npc.name}: "${line}"`, '#FFD700');
      }
      this.onUpdate();
      return;
    }
    
    // 宝箱
    const chest = this.getAllEntities().find(e => 
      e.type === EntityType.CHEST &&
      Math.abs(e.position.x - x) + Math.abs(e.position.y - y) <= 1
    );
    if (chest && !chest.isOpen && chest.loot) {
      chest.isOpen = true;
      chest.char = '📭';
      this.addMessage(`打开了宝箱！`, '#FFD700');
      
      chest.loot.forEach(itemId => {
        const item = createItem(itemId);
        if (item) {
          this.addItemToInventory(item);
          this.addMessage(`获得: ${item.name}`, '#00FF00');
        }
      });
      
      if (Math.random() < 0.3) {
        const extraLoot = getRandomLoot();
        if (extraLoot) {
          this.addItemToInventory(extraLoot);
          this.addMessage(`额外获得: ${extraLoot.name}`, '#00FF00');
        }
      }
      this.onUpdate();
      return;
    }
    
    this.addMessage('附近没有可以互动的对象', '#808080');
    this.onUpdate();
  }

  private findNearbyStairs(x: number, y: number): 'up' | 'down' | null {
    const positions = [
      { x: x, y: y },
      { x: x+1, y: y },
      { x: x-1, y: y },
      { x: x, y: y+1 },
      { x: x, y: y-1 },
    ];
    
    for (const pos of positions) {
      if (this.isInBounds(pos.x, pos.y)) {
        const tile = this.getTile(pos.x, pos.y);
        if (tile.char === '⬆️') return 'up';
        if (tile.char === '⬇️') return 'down';
      }
    }
    return null;
  }

  private async usePortalByTarget(targetId: string): Promise<void> {
    const targetNode = this.worldMap.switchToNode(targetId);
    if (targetNode) {
      await this.loadCurrentWorldNode();
      this.updateFOV();
      this.onUpdate();
    }
  }

  private enterBuilding(building: Building): void {
    this.currentBuilding = building;
    this.currentInterior = this.interiorManager.getInterior(building);
    this.inBuilding = true;
    
    this.player.position = {
      x: Math.floor(this.currentInterior.width / 2),
      y: this.currentInterior.height - 1
    };
    
    this.addMessage(`进入 ${building.name}`, '#00FF00');
    this.onUpdate();
  }

  private exitBuilding(): void {
    if (!this.currentBuilding) return;
    
    this.player.position = {
      x: this.currentBuilding.doorX,
      y: this.currentBuilding.doorY
    };
    
    this.inBuilding = false;
    this.currentInterior = null;
    this.currentBuilding = null;
    
    this.addMessage('离开建筑', '#808080');
    this.onUpdate();
  }

  private pickupItemExplore(): void {
    const items = this.getAllEntities().filter(e => 
      e.type === EntityType.ITEM && 
      e.position.x === this.player.position.x && 
      e.position.y === this.player.position.y
    );

    if (items.length === 0) {
      this.addMessage('这里没有物品', '#808080');
    } else {
      items.forEach(entity => {
        if (entity.loot) {
          entity.loot.forEach(itemId => {
            const item = createItem(itemId);
            if (item && this.addItemToInventory(item)) {
              this.addMessage(`拾取了 ${item.name}`, '#00FF00');
            }
          });
        }
        this.removeEntity(entity);
      });
    }
    
    this.onUpdate();
  }

  // ========== 背包系统 ==========

  private initInventory(): void {
    this.addItemToInventory(createItem('wooden_sword')!);
    this.addItemToInventory(createItem('leather_armor')!);
    this.addItemToInventory(createItem('health_potion')!, 3);
    this.addItemToInventory(createItem('herb')!, 5);
  }

  addItemToInventory(item: Item, quantity: number = 1): boolean {
    if (item.stackable) {
      const existing = this.inventory.find(slot => slot.item.id === item.id);
      if (existing) {
        existing.quantity += quantity;
        return true;
      }
    }
    
    if (this.inventory.length < 30) {
      this.inventory.push({ item, quantity });
      return true;
    }
    
    this.addMessage('背包已满！', '#FF0000');
    return false;
  }

  private removeItemFromInventory(itemId: string, quantity: number): void {
    const index = this.inventory.findIndex(slot => slot.item.id === itemId);
    if (index === -1) return;
    
    const slot = this.inventory[index];
    slot.quantity -= quantity;
    
    if (slot.quantity <= 0) {
      this.inventory.splice(index, 1);
    }
  }

  private openInventory(): void {
    this.state = GameState.INVENTORY;
    this.selectedInventoryIndex = 0;
    this.onUpdate();
  }

  private handleInventoryInput(key: string): void {
    const filteredItems = this.getFilteredItems();
    
    switch (key) {
      case 'arrowup':
      case 'k':
        this.selectedInventoryIndex = Math.max(0, this.selectedInventoryIndex - 1);
        this.onUpdate();
        break;
      case 'arrowdown':
      case 'j':
        this.selectedInventoryIndex = Math.min(filteredItems.length - 1, this.selectedInventoryIndex + 1);
        this.onUpdate();
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
      case 'tab':
        this.switchInventoryFilter();
        break;
      case 'i':
      case 'escape':
        this.state = GameState.EXPLORE;
        this.onUpdate();
        break;
    }
  }

  private getFilteredItems(): InventorySlot[] {
    if (!this.inventoryFilter) return this.inventory;
    return this.inventory.filter(slot => slot.item.type === this.inventoryFilter);
  }

  private switchInventoryFilter(): void {
    const filters: (ItemType | null)[] = [
      null, ItemType.WEAPON, ItemType.ARMOR, ItemType.CONSUMABLE, ItemType.MATERIAL
    ];
    const currentIndex = filters.indexOf(this.inventoryFilter);
    this.inventoryFilter = filters[(currentIndex + 1) % filters.length];
    this.selectedInventoryIndex = 0;
    this.onUpdate();
  }

  private useSelectedItem(): void {
    const filtered = this.getFilteredItems();
    const slot = filtered[this.selectedInventoryIndex];
    
    if (!slot) return;
    
    if (slot.item.equippable) {
      this.equipItem(slot.item);
      this.onUpdate();
    } else if (slot.item.effects) {
      this.applyItemEffects(slot.item.effects);
      this.removeItemFromInventory(slot.item.id, 1);
      this.addMessage(`使用了 ${slot.item.name}`, '#00FF00');
      
      if (this.inCombat) {
        this.state = GameState.COMBAT;
        this.endPlayerCombatTurn();
      } else {
        this.state = GameState.EXPLORE;
        this.onUpdate();
      }
    }
  }

  private equipSelectedItem(): void {
    const filtered = this.getFilteredItems();
    const slot = filtered[this.selectedInventoryIndex];
    
    if (!slot || !slot.item.equippable) return;
    
    this.equipItem(slot.item);
    this.onUpdate();
  }

  private dropSelectedItem(): void {
    const filtered = this.getFilteredItems();
    const slot = filtered[this.selectedInventoryIndex];
    
    if (!slot) return;
    
    this.removeItemFromInventory(slot.item.id, 1);
    this.addMessage(`丢弃了 ${slot.item.name}`, '#808080');
    
    if (this.selectedInventoryIndex >= this.getFilteredItems().length) {
      this.selectedInventoryIndex = Math.max(0, this.getFilteredItems().length - 1);
    }
    
    this.state = this.inCombat ? GameState.COMBAT : GameState.EXPLORE;
    this.onUpdate();
  }

  private equipItem(item: Item): void {
    if (!item.equippable || !item.equipSlot) return;
    
    const slotKey = item.equipSlot as keyof EquipmentSlots;
    
    if (this.equipment[slotKey]) {
      this.addItemToInventory(this.equipment[slotKey]!);
      this.addMessage(`卸下了 ${this.equipment[slotKey]!.name}`, '#808080');
    }
    
    this.equipment[slotKey] = item;
    this.removeItemFromInventory(item.id, 1);
    this.addMessage(`装备了 ${item.name}`, '#00FF00');
    
    this.updatePlayerStats();
    this.onUpdate();
  }

  private applyItemEffects(effects: ItemEffect[]): void {
    effects.forEach(effect => {
      switch (effect.type) {
        case 'heal':
          const healAmount = Math.min(effect.value, this.player.maxHp - this.player.hp);
          this.player.hp += healAmount;
          this.addMessage(`恢复 ${healAmount} HP`, '#00FF00');
          break;
        case 'restore_mp':
          const mpAmount = Math.min(effect.value, this.player.maxMp - this.player.mp);
          this.player.mp += mpAmount;
          this.addMessage(`恢复 ${mpAmount} MP`, '#00FF00');
          break;
      }
    });
  }

  // ========== 技能系统 ==========

  getAvailableSkills(): Skill[] {
    return this.player.skills.equipped
      .map(id => createSkill(id))
      .filter((s): s is Skill => s !== null)
      .map(s => ({
        ...s,
        currentCooldown: this.player.skills.cooldowns[s.id] || 0
      }));
  }

  useSkill(skillId: string, target?: Entity): boolean {
    if (!this.player.skills.equipped.includes(skillId)) {
      this.addMessage('技能未装备', '#FF0000');
      return false;
    }
    
    const skill = createSkill(skillId);
    if (!skill) return false;
    
    const currentCd = this.player.skills.cooldowns[skillId] || 0;
    if (currentCd > 0) {
      this.addMessage(`技能冷却中，剩余 ${currentCd} 回合`, '#FF0000');
      return false;
    }
    
    if (this.player.mp < skill.mpCost) {
      this.addMessage('法力不足', '#FF0000');
      return false;
    }
    
    this.player.mp -= skill.mpCost;
    this.player.skills.cooldowns[skillId] = skill.cooldown;
    
    this.executeSkillEffects(skill, target);
    this.addMessage(`使用了 ${skill.name}`, '#FFD700');
    
    if (this.inCombat) {
      this.endPlayerCombatTurn();
    } else {
      this.onUpdate();
    }
    
    return true;
  }

  private executeSkillEffects(skill: Skill, target?: Entity): void {
    for (const effect of skill.effects) {
      switch (effect.type) {
        case 'damage':
          if (target && target.hp !== undefined) {
            const damage = Math.floor(this.player.attack * effect.value);
            target.hp -= damage;
            this.addMessage(`造成 ${damage} 点伤害`, '#FFFFFF');
          }
          break;
        case 'heal':
          const healAmount = effect.value;
          this.player.hp = Math.min(this.player.maxHp, this.player.hp + healAmount);
          this.addMessage(`恢复 ${healAmount} HP`, '#00FF00');
          break;
        case 'buff_attack':
          this.player.buffs.push({
            type: 'attack',
            value: effect.value,
            duration: effect.duration || 3,
            source: skill.name
          });
          this.addMessage(`攻击力提升 ${Math.floor(effect.value * 100)}%`, '#00FF00');
          break;
        case 'buff_defense':
          this.player.buffs.push({
            type: 'defense',
            value: effect.value,
            duration: effect.duration || 3,
            source: skill.name
          });
          this.addMessage(`防御力提升 ${Math.floor(effect.value * 100)}%`, '#00FF00');
          break;
        case 'stun':
          if (target) {
            if (!target.buffs) target.buffs = [];
            target.buffs.push({
              type: 'stun',
              value: 1,
              duration: effect.duration || 1,
              source: skill.name
            });
            this.addMessage(`${target.name} 被眩晕了！`, '#FFFF00');
          }
          break;
      }
    }
  }

  private enemyUseSkill(enemy: Entity): void {
    if (!enemy.skills || enemy.skills.length === 0) {
      this.enemyNormalAttack(enemy);
      return;
    }
    
    const availableSkills = enemy.skills.filter(s => s.currentCooldown <= 0);
    
    if (availableSkills.length > 0 && Math.random() < 0.4) {
      const skill = availableSkills[Math.floor(Math.random() * availableSkills.length)];
      skill.currentCooldown = skill.cooldown;
      
      this.addMessage(`${enemy.name} 使用了 ${skill.name}！`, '#FF4444');
      
      for (const effect of skill.effects) {
        switch (effect.type) {
          case 'damage':
            const damage = Math.floor((enemy.attack || 5) * effect.value);
            if (this.godMode) {
              this.addMessage(`[无敌] 免疫了 ${damage} 点伤害`, '#FFD700');
            } else {
              this.player.hp -= damage;
              this.addMessage(`受到 ${damage} 点伤害`, '#FF0000');
            }
            break;
          case 'heal':
            if (enemy.hp !== undefined) {
              enemy.hp = Math.min(enemy.maxHp || enemy.hp, enemy.hp + effect.value);
              this.addMessage(`${enemy.name} 恢复了 HP`, '#FF4444');
            }
            break;
        }
      }
    } else {
      this.enemyNormalAttack(enemy);
    }
  }

  private enemyNormalAttack(enemy: Entity): void {
    const damage = Math.max(1, (enemy.attack || 5) - this.player.defense - this.getEquipmentStats().defense);
    if (this.godMode) {
      this.addMessage(`[无敌] ${enemy.name} 的攻击被免疫了`, '#FFD700');
    } else {
      this.player.hp -= damage;
      this.addMessage(`${enemy.name} 攻击了你，造成 ${damage} 点伤害`, '#FF0000');
    }
  }

  private reduceCooldowns(): void {
    for (const [id, cd] of Object.entries(this.player.skills.cooldowns)) {
      if (cd > 0) {
        this.player.skills.cooldowns[id] = cd - 1;
      }
    }
    
    for (const entity of this.getAllEntities()) {
      if (entity.skills) {
        for (const skill of entity.skills) {
          if (skill.currentCooldown > 0) {
            skill.currentCooldown--;
          }
        }
      }
    }
  }

  private processBuffs(): void {
    for (let i = this.player.buffs.length - 1; i >= 0; i--) {
      const buff = this.player.buffs[i];
      
      if (buff.type === 'poison') {
        if (this.godMode) {
          this.addMessage(`[无敌] 中毒效果被免疫了`, '#FFD700');
        } else {
          this.player.hp -= buff.value;
          this.addMessage(`中毒效果造成 ${buff.value} 点伤害`, '#8B008B');
        }
      }
      
      buff.duration--;
      if (buff.duration <= 0) {
        this.addMessage(`${buff.source} 效果消失了`, '#808080');
        this.player.buffs.splice(i, 1);
      }
    }
    
    for (const entity of this.getAllEntities()) {
      if (entity.buffs) {
        for (let i = entity.buffs.length - 1; i >= 0; i--) {
          const buff = entity.buffs[i];
          buff.duration--;
          if (buff.duration <= 0) {
            entity.buffs.splice(i, 1);
          }
        }
      }
    }
  }

  // ========== 升级系统 ==========

  private levelUp(): void {
    this.player.level++;
    this.player.exp = 0;
    this.player.maxExp = Math.floor(this.player.maxExp * 1.5);
    
    const points = 3;
    this.player.statPoints += points;
    
    this.player.baseMaxHp += 10;
    this.player.baseMaxMp += 5;
    
    this.updatePlayerStats();
    
    this.player.hp = this.player.maxHp;
    this.player.mp = this.player.maxMp;
    
    this.addMessage(`🎉 升级了！等级 ${this.player.level}，获得 ${points} 属性点！`, '#FFD700');
    
    if (this.player.statPoints > 0) {
      this.state = GameState.LEVEL_UP;
    }
    
    this.onUpdate();
  }

  private updatePlayerStats(): void {
    const equipStats = this.getEquipmentStats();
    
    this.player.maxHp = this.player.baseMaxHp + equipStats.hp;
    this.player.maxMp = this.player.baseMaxMp + equipStats.mp;
    this.player.attack = this.player.baseAttack + equipStats.attack;
    this.player.defense = this.player.baseDefense + equipStats.defense;
    
    this.player.hp = Math.min(this.player.hp, this.player.maxHp);
    this.player.mp = Math.min(this.player.mp, this.player.maxMp);
  }

  private getPlayerAttack(): number {
    let attack = this.player.attack + this.getEquipmentStats().attack;
    for (const buff of this.player.buffs) {
      if (buff.type === 'attack') {
        attack += Math.floor(this.player.attack * buff.value);
      }
    }
    return attack;
  }

  private getEquipmentStats(): { attack: number; defense: number; hp: number; mp: number; speed: number; critical: number } {
    const stats = { attack: 0, defense: 0, hp: 0, mp: 0, speed: 0, critical: 0 };
    
    Object.values(this.equipment).forEach(item => {
      if (item?.stats) {
        stats.attack += item.stats.attack || 0;
        stats.defense += item.stats.defense || 0;
        stats.hp += item.stats.hp || 0;
        stats.mp += item.stats.mp || 0;
        stats.speed += item.stats.speed || 0;
        stats.critical += item.stats.critical || 0;
      }
    });
    
    return stats;
  }

  // ========== 消息系统 ==========

  addMessage(text: string, color: string = '#FFFFFF'): void {
    this.messages.push({ text, color, turn: this.turn });
    if (this.messages.length > 100) {
      this.messages.shift();
    }
  }

  // ========== Getter 方法 ==========

  getState(): GameState { return this.state; }
  getCombatState(): CombatState { return this.combatState; }
  isInCombat(): boolean { return this.inCombat; }
  getCombatEnemies(): Entity[] { return this.combatEnemies; }
  getPlayer(): PlayerData { return this.player; }
  getInventory(): InventorySlot[] { return this.inventory; }
  getEquipment(): EquipmentSlots { return this.equipment; }
  getGold(): number { return this.gold; }
  getMessages(): LogMessage[] { return this.messages.slice(-10); }
  getTurn(): number { return this.turn; }
  getDungeonLevel(): number { return this.dungeonLevel; }
  getSelectedInventoryIndex(): number { return this.selectedInventoryIndex; }
  getFilteredInventory(): InventorySlot[] { return this.getFilteredItems(); }
  getInventoryFilter(): ItemType | null { return this.inventoryFilter; }
  isGameOver(): boolean { return this.gameOver; }
  getConfig(): GameConfig { return this.config; }
  getTownManager(): TownMapManager { return this.townManager; }
  getDungeonMap(): GameMap { return this.dungeonMap; }
  getMapType(): MapType { return this.mapType; }
  getWorldMap(): WorldMapManager { return this.worldMap; }
  getWildernessMap(): WildernessMap | null { return this.wildernessMap; }
  isInBuilding(): boolean { return this.inBuilding; }
  getCurrentInterior(): BuildingInterior | null { return this.currentInterior; }
  getCurrentBuilding(): Building | null { return this.currentBuilding; }
}

export { ROT, DUNGEON_TILES };
