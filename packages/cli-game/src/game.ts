/**
 * 游戏核心逻辑
 * 支持城镇（动态加载）和地下城两种地图模式
 */

import * as ROT from 'rot-js';
import {
  Point2D, GameState, EntityType, Entity, PlayerData,
  Tile, GameMap, LogMessage, InventorySlot, EquipmentSlots,
  GameConfig, Item, ItemType, ItemEffect, CombatState,
  Skill, Buff
} from './types.js';
import { createItem, getRandomLoot, RARITY_COLORS, ITEM_TYPE_ICONS } from './items.js';
import { createSkill, getEnemyDefaultSkill } from './skills.js';
import { TownMapManager } from './town-manager.js';
import { TOWN_TILES, Building } from './town-generator.js';
import { InteriorManager, BuildingInterior, INTERIOR_TILES } from './building-interior.js';

/** 地图类型 */
/** 地图类型 */
export enum MapType {
  TOWN = 'town',
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

/** 地下城瓦片定义 - 楼梯有碰撞体积，需要站在旁边按E互动 */
const DUNGEON_TILES = {
  WALL: { char: '██', color: '#808080', bgColor: '#2F2F2F', walkable: false, transparent: false },
  FLOOR: { char: '░░', color: '#1a1a1a', bgColor: '#1a1a1a', walkable: true, transparent: true },
  DOOR_CLOSED: { char: '🚪', color: '#8B4513', bgColor: '#2F1B0C', walkable: false, transparent: false },
  DOOR_OPEN: { char: '▒▒', color: '#1a1a1a', bgColor: '#1a1a1a', walkable: true, transparent: true },
  STAIRS_DOWN: { char: '⬇️', color: '#FFD700', bgColor: '#1a1a1a', walkable: false, transparent: true },  // 有碰撞体积
  STAIRS_UP: { char: '⬆️', color: '#FFD700', bgColor: '#1a1a1a', walkable: false, transparent: true }     // 有碰撞体积
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

/** NPC 模板 */
interface NPCTemplate {
  name: string;
  char: string;
  color: string;
  hp: number;
  dialogue: string[];
}

/** 实体模板 - 全部使用emoji + 空格 */
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
  
  // 城镇系统
  private townManager: TownMapManager;
  private currentChunk: any | null = null;
  private interiorManager: InteriorManager;
  private currentInterior: BuildingInterior | null = null;
  private currentBuilding: Building | null = null;
  private inBuilding: boolean = false;
  
  // 地下城系统
  private dungeonMap!: GameMap;
  private dungeonEntities: Entity[] = [];
  private dungeonLevel: number = 1;
  private townEntryPosition: Point2D | null = null; // 记录进入地下城时的城镇位置
  
  // 通用数据
  private player: PlayerData;
  private inventory: InventorySlot[] = [];
  private equipment: EquipmentSlots = {};
  private gold: number = 0;
  private state: GameState = GameState.EXPLORE;
  private combatState: CombatState = CombatState.PLAYER_TURN;
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

  constructor(onUpdate: () => void, config: Partial<GameConfig> = {}) {
    this.config = { ...DEFAULT_CONFIG, ...config };
    this.onUpdate = onUpdate;
    
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
    
    // 初始化城镇系统
    this.townManager = new TownMapManager(40);
    this.townManager.initialize(0, 0);
    
    // 初始化建筑内部系统
    this.interiorManager = new InteriorManager();
    
    // 设置玩家初始位置（城镇中心）
    const spawnPoint = this.townManager.findSpawnPoint();
    this.player.position = { x: spawnPoint.x, y: spawnPoint.y };
    
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
    this.addMessage('🏘️ 欢迎来到城镇！按 E 与NPC和建筑互动', '#00FF00');
    this.addMessage('城镇中心的 ⬇️ 可以进入地下城', '#FFD700');
  }

  // ========== 地图类型切换 ==========

  /** 进入地下城 */
  enterDungeon(): void {
    // 保存进入地下城前的城镇位置
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
    // 恢复到进入地下城前的位置
    if (this.townEntryPosition) {
      this.player.position = { ...this.townEntryPosition };
    }
    this.townManager.updatePlayerPosition(this.player.position.x, this.player.position.y);
    this.addMessage('🏘️ 回到城镇', '#00FF00');
    this.updateFOV();
    this.onUpdate();
  }

  // ========== 建筑系统 ==========

  /** 进入建筑 */
  private enterBuilding(building: Building): void {
    this.currentBuilding = building;
    this.currentInterior = this.interiorManager.getInterior(building);
    this.inBuilding = true;
    
    // 设置玩家在建筑内的初始位置（门口）
    this.player.position = {
      x: Math.floor(this.currentInterior.width / 2),
      y: this.currentInterior.height - 1
    };
    
    this.addMessage(`进入 ${building.name}`, '#00FF00');
    this.onUpdate();
  }

  /** 离开建筑 */
  private exitBuilding(): void {
    if (!this.currentBuilding) return;
    
    // 恢复到建筑门口的位置
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

  /** 获取当前建筑内部 */
  getCurrentInterior(): BuildingInterior | null {
    return this.currentInterior;
  }

  /** 是否在建筑内 */
  isInBuilding(): boolean {
    return this.inBuilding;
  }

  /** 获取当前建筑 */
  getCurrentBuilding(): Building | null {
    return this.currentBuilding;
  }

  /** 获取当前地图类型 */
  getMapType(): MapType { return this.mapType; }

  /** 查找附近的楼梯（距离1格内） */
  private findNearbyStairs(x: number, y: number): 'up' | 'down' | null {
    const positions = [
      { x: x, y: y },      // 脚下
      { x: x+1, y: y },    // 右
      { x: x-1, y: y },    // 左
      { x: x, y: y+1 },    // 下
      { x: x, y: y-1 },    // 上
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

    // 在第一个房间放置上楼楼梯（返回城镇）和玩家
    if (rooms.length > 0) {
      const firstRoom = rooms[0];
      // 楼梯放在角落
      const stairsX = firstRoom.getLeft() + 1;
      const stairsY = firstRoom.getTop() + 1;
      map.tiles[stairsX][stairsY] = DUNGEON_TILES.STAIRS_UP;
      
      // 玩家放在楼梯旁边（下方）
      this.player.position = { x: stairsX, y: stairsY + 1 };
    }

    // 在最后一个房间放置下楼楼梯（进入下一层）
    if (rooms.length > 0) {
      const lastRoom = rooms[rooms.length - 1];
      // 楼梯放在角落
      const stairsX = lastRoom.getRight() - 2;
      const stairsY = lastRoom.getBottom() - 2;
      
      if (map.tiles[stairsX][stairsY].walkable || map.tiles[stairsX][stairsY].char === '░░') {
        map.tiles[stairsX][stairsY] = DUNGEON_TILES.STAIRS_DOWN;
      } else {
        // 寻找可用位置
        for (let y = lastRoom.getTop() + 1; y < lastRoom.getBottom() - 1; y++) {
          for (let x = lastRoom.getLeft() + 1; x < lastRoom.getRight() - 1; x++) {
            if (map.tiles[x][y].walkable) {
              map.tiles[x][y] = DUNGEON_TILES.STAIRS_DOWN;
              break;
            }
          }
        }
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
      
      if (Math.random() < 0.3) {
        const itemX = room.getLeft() + 1 + Math.floor(Math.random() * (room.getRight() - room.getLeft() - 2));
        const itemY = room.getTop() + 1 + Math.floor(Math.random() * (room.getBottom() - room.getTop() - 2));
        this.spawnDungeonItem(itemX, itemY);
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
      char: '📦',  // 包裹
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

  private spawnDungeonItem(x: number, y: number): void {
    const item = getRandomLoot();
    if (!item) return;
    
    this.dungeonEntities.push({
      id: `item_${this.turn}_${x}_${y}`,
      type: EntityType.ITEM,
      name: item.name,
      position: { x, y },
      char: item.char,
      color: item.color,
      loot: [item.id]
    });
  }

  // ========== 地图查询方法 ==========

  private isInBounds(x: number, y: number): boolean {
    if (this.mapType === MapType.TOWN) {
      return true; // 城镇边界检查在 TownManager 中
    }
    return x >= 0 && x < this.dungeonMap.width && y >= 0 && y < this.dungeonMap.height;
  }

  private isTransparent(x: number, y: number): boolean {
    if (this.mapType === MapType.TOWN) {
      const tile = this.townManager.getTile(x, y);
      return tile.transparent;
    }
    if (!this.isInBounds(x, y)) return false;
    return this.dungeonMap.tiles[x][y].transparent;
  }

  private isWalkable(x: number, y: number): boolean {
    if (this.mapType === MapType.TOWN) {
      return this.townManager.isWalkable(x, y);
    }
    if (!this.isInBounds(x, y)) return false;
    return this.dungeonMap.tiles[x][y].walkable;
  }

  private getTile(x: number, y: number): Tile {
    if (this.mapType === MapType.TOWN) {
      return this.townManager.getTile(x, y);
    }
    if (!this.isInBounds(x, y)) return DUNGEON_TILES.WALL;
    return this.dungeonMap.tiles[x][y];
  }

  private getEntityAt(x: number, y: number): Entity | undefined {
    if (this.mapType === MapType.TOWN) {
      return this.townManager.getEntityAt(x, y);
    }
    return this.dungeonEntities.find(e => e.position.x === x && e.position.y === y);
  }

  private getAllEntities(): Entity[] {
    if (this.mapType === MapType.TOWN) {
      return this.townManager.getAllEntities();
    }
    return this.dungeonEntities;
  }

  private removeEntity(entity: Entity): void {
    if (this.mapType === MapType.TOWN) {
      this.townManager.removeEntity(entity);
    } else {
      this.dungeonEntities = this.dungeonEntities.filter(e => e.id !== entity.id);
    }
  }

  // ========== 视野系统 ==========

  private updateFOV(): void {
    if (this.mapType === MapType.DUNGEON) {
      // 地下城使用传统FOV
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

  handleInput(key: string): void {
    if (this.gameOver) return;
    
    if (this.state === GameState.COMBAT && this.combatState !== CombatState.PLAYER_TURN) {
      return;
    }

    switch (this.state) {
      case GameState.EXPLORE:
        this.handleExploreInput(key);
        break;
      case GameState.COMBAT:
        this.handleCombatInput(key);
        break;
      case GameState.INVENTORY:
        this.handleInventoryInput(key);
        break;
      case GameState.LEVEL_UP:
        this.handleLevelUpInput(key);
        break;
      case GameState.MESSAGE:
        this.state = this.inCombat ? GameState.COMBAT : GameState.EXPLORE;
        this.onUpdate();
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

  private handleExploreInput(key: string): void {
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
      this.movePlayerExplore(dx, dy);
    }
  }

  private movePlayerExplore(dx: number, dy: number): void {
    const newX = this.player.position.x + dx;
    const newY = this.player.position.y + dy;

    // 在建筑内移动
    if (this.inBuilding && this.currentInterior) {
      if (newX < 0 || newX >= this.currentInterior.width || 
          newY < 0 || newY >= this.currentInterior.height) {
        return;
      }
      
      const tile = this.currentInterior.tiles[newX][newY];
      if (!tile.walkable) {
        return;
      }
      
      // 检查是否与NPC碰撞
      const npc = this.interiorManager.getInteriorEntityAt(this.currentInterior, newX, newY);
      if (npc) {
        return; // 不能穿过NPC
      }
      
      this.player.position.x = newX;
      this.player.position.y = newY;
      this.onUpdate();
      return;
    }

    if (!this.isWalkable(newX, newY)) {
      return;
    }

    // 检查是否有实体（NPC或敌人）
    const entityAtPosition = this.getEntityAt(newX, newY);
    
    if (entityAtPosition?.type === EntityType.ENEMY) {
      this.startCombat(entityAtPosition);
      return;
    }
    
    // NPC有碰撞体积，不能穿过
    if (entityAtPosition?.type === EntityType.NPC) {
      return; // 不能穿过NPC
    }

    this.player.position.x = newX;
    this.player.position.y = newY;
    
    // 更新城镇区块加载
    if (this.mapType === MapType.TOWN) {
      this.townManager.updatePlayerPosition(newX, newY);
      const chunkInfo = this.townManager.getCurrentChunkInfo();
      if (this.currentChunk?.x !== chunkInfo.x || this.currentChunk?.y !== chunkInfo.y) {
        this.addMessage(`进入 ${this.townManager.getAreaName(newX, newY)}`, '#00FF00');
      }
    }
    
    this.updateFOV();
    
    if (this.mapType === MapType.DUNGEON) {
      this.checkCombatTrigger();
    }
    
    this.onUpdate();
  }

  private checkCombatTrigger(): void {
    const nearbyEnemies = this.dungeonEntities.filter(e => {
      if (e.type !== EntityType.ENEMY) return false;
      const dist = Math.abs(e.position.x - this.player.position.x) + 
                   Math.abs(e.position.y - this.player.position.y);
      return dist <= 2;
    });
    
    if (nearbyEnemies.length > 0) {
      this.startCombat(nearbyEnemies[0]);
    }
  }

  // ========== 战斗系统 ==========

  private startCombat(enemy: Entity): void {
    this.inCombat = true;
    this.state = GameState.COMBAT;
    this.combatState = CombatState.PLAYER_TURN;
    
    if (this.mapType === MapType.DUNGEON) {
      this.combatEnemies = this.dungeonEntities.filter(e => {
        if (e.type !== EntityType.ENEMY) return false;
        const dist = Math.abs(e.position.x - this.player.position.x) + 
                     Math.abs(e.position.y - this.player.position.y);
        return dist <= 2;
      });
    } else {
      // 城镇内不应该有战斗
      this.combatEnemies = [enemy];
    }
    
    if (this.combatEnemies.length === 0) {
      this.combatEnemies = [enemy];
    }
    
    this.addMessage(`⚔️ 进入战斗！遭遇 ${enemy.name}`, '#FF0000');
    this.onUpdate();
  }

  private endCombat(): void {
    this.inCombat = false;
    this.state = GameState.EXPLORE;
    this.combatState = CombatState.PLAYER_TURN;
    this.combatEnemies = [];
    this.addMessage('✓ 战斗结束', '#00FF00');
    this.onUpdate();
  }

  private handleCombatInput(key: string): void {
    switch (key) {
      case 'a':
      case 'arrowleft':
        this.combatAttack();
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
        this.combatRetreat();
        break;
      case 'escape':
        this.combatRetreat();
        break;
    }
  }

  private combatAttack(): void {
    if (this.combatEnemies.length === 0) {
      this.endCombat();
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
        setTimeout(() => this.endCombat(), 500);
        return;
      }
    }
    
    this.endPlayerCombatTurn();
  }

  private combatDefend(): void {
    this.addMessage('你采取防御姿态，本回合受到的伤害减半', '#00FF00');
    this.endPlayerCombatTurn();
  }

  private combatRetreat(): void {
    this.addMessage('你尝试撤退...', '#FFFF00');
    if (Math.random() < 0.5) {
      this.addMessage('成功撤退！', '#00FF00');
      this.endCombat();
    } else {
      this.addMessage('撤退失败！', '#FF0000');
      this.endPlayerCombatTurn();
    }
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
      this.endCombat();
    }
  }

  private delay(ms: number): Promise<void> {
    return new Promise(resolve => setTimeout(resolve, ms));
  }

  // ========== 交互系统 ==========

  private interact(): void {
    const x = this.player.position.x;
    const y = this.player.position.y;
    const tile = this.getTile(x, y);
    
    // 如果在建筑内部，检查是否要离开
    if (this.inBuilding && this.currentInterior) {
      // 检查是否在门口（假设门口在底部中央）
      const doorX = Math.floor(this.currentInterior.width / 2);
      const doorY = this.currentInterior.height - 1;
      if (x === doorX && y === doorY) {
        this.exitBuilding();
        return;
      }
      
      // 与室内NPC对话
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
    
    // 检查周围是否有楼梯（距离1格内）
    const nearbyStairs = this.findNearbyStairs(x, y);
    
    // 城镇地下城入口
    if (nearbyStairs === 'down' && this.mapType === MapType.TOWN) {
      this.enterDungeon();
      return;
    }
    
    // 地下城上楼楼梯 - 返回城镇
    if (nearbyStairs === 'up' && this.mapType === MapType.DUNGEON) {
      this.returnToTown();
      return;
    }
    
    // 地下城下楼楼梯 - 进入下一层
    if (nearbyStairs === 'down' && this.mapType === MapType.DUNGEON) {
      this.dungeonLevel++;
      this.addMessage(`进入地下城第 ${this.dungeonLevel} 层...`, '#FFD700');
      this.generateDungeonMap();
      this.updateFOV();
      this.onUpdate();
      return;
    }
    
    // 检查是否在建筑门口
    if (this.mapType === MapType.TOWN) {
      const building = this.townManager.getBuildingAt(x, y);
      if (building && this.interiorManager.isBuildingEntrance(x, y, building)) {
        this.enterBuilding(building);
        return;
      }
    }
    
    // 检查附近的可互动实体
    const nearby = this.getAllEntities().filter(e => {
      const dx = Math.abs(e.position.x - x);
      const dy = Math.abs(e.position.y - y);
      return dx <= 1 && dy <= 1 && !(dx === 0 && dy === 0);
    });

    if (nearby.length === 0) {
      this.addMessage('附近没有可以互动的对象', '#808080');
      this.onUpdate();
      return;
    }

    const entity = nearby[0];
    
    switch (entity.type) {
      case EntityType.NPC:
        if (entity.dialogue) {
          const line = entity.dialogue[Math.floor(Math.random() * entity.dialogue.length)];
          this.addMessage(`${entity.name}: "${line}"`, '#FFD700');
        }
        break;
        
      case EntityType.CHEST:
        if (!entity.isOpen && entity.loot) {
          entity.isOpen = true;
          entity.char = '📭';
          this.addMessage(`打开了宝箱！`, '#FFD700');
          
          entity.loot.forEach(itemId => {
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
        } else if (entity.isOpen) {
          this.addMessage('宝箱已经空了', '#808080');
        }
        break;
    }
    
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
        case 'poison':
          if (target) {
            if (!target.buffs) target.buffs = [];
            target.buffs.push({
              type: 'poison',
              value: effect.value,
              duration: effect.duration || 3,
              source: skill.name
            });
            this.addMessage(`${target.name} 中毒了！`, '#8B008B');
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
            this.player.hp -= damage;
            this.addMessage(`受到 ${damage} 点伤害`, '#FF0000');
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
    this.player.hp -= damage;
    this.addMessage(`${enemy.name} 攻击了你，造成 ${damage} 点伤害`, '#FF0000');
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
        this.player.hp -= buff.value;
        this.addMessage(`中毒效果造成 ${buff.value} 点伤害`, '#8B008B');
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

  private getPlayerDefense(): number {
    let defense = this.player.defense + this.getEquipmentStats().defense;
    for (const buff of this.player.buffs) {
      if (buff.type === 'defense') {
        defense += Math.floor(this.player.defense * buff.value);
      }
    }
    return defense;
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
}

export { ROT, DUNGEON_TILES, RARITY_COLORS, ITEM_TYPE_ICONS };
