/**
 * 游戏核心逻辑
 * 使用 rot-js 构建
 */

import * as ROT from 'rot-js';
import {
  Point2D, GameState, EntityType, Entity, PlayerData,
  Tile, GameMap, LogMessage, InventorySlot, EquipmentSlots,
  GameConfig, Item, ItemType, ItemEffect, CombatState,
  Skill, Buff, PlayerSkills
} from './types.js';
import { createItem, getRandomLoot, RARITY_COLORS, ITEM_TYPE_ICONS } from './items.js';
import { createSkill, getEnemyDefaultSkill, PLAYER_SKILLS } from './skills.js';

/** 默认游戏配置 */
const DEFAULT_CONFIG: GameConfig = {
  mapWidth: 80,
  mapHeight: 24,
  viewportWidth: 40,
  viewportHeight: 20,
  fovRadius: 12,
  maxDungeonLevel: 10
};

/** 地图瓦片定义 - 墙壁连续填充，地板完全透明 */
const TILES = {
  WALL: { char: '██', color: '#808080', bgColor: '#2F2F2F', walkable: false, transparent: false },
  FLOOR: { char: '  ', color: '#1a1a1a', bgColor: '#1a1a1a', walkable: true, transparent: true },
  DOOR_CLOSED: { char: '██', color: '#8B4513', bgColor: '#2F1B0C', walkable: false, transparent: false },
  DOOR_OPEN: { char: '  ', color: '#1a1a1a', bgColor: '#1a1a1a', walkable: true, transparent: true },
  STAIRS_DOWN: { char: '▼ ', color: '#FFD700', bgColor: '#1a1a1a', walkable: true, transparent: true },
  STAIRS_UP: { char: '▲ ', color: '#FFD700', bgColor: '#1a1a1a', walkable: true, transparent: true }
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

/** 实体模板 - 使用 Emoji */
const ENTITY_TEMPLATES: Record<string, EnemyTemplate | NPCTemplate> = {
  // NPC
  'villager': { name: '村民', char: '👴', color: '#FFA500', hp: 20, dialogue: ['欢迎来到地下城！', '小心深处的怪物。'] },
  'merchant': { name: '商人', char: '👲', color: '#FFD700', hp: 30, dialogue: ['需要补给吗？', '我这里有好东西。'] },
  
  // 敌人
  'slime': { name: '史莱姆', char: '🟢', color: '#32CD32', hp: 15, attack: 3, defense: 0, isHostile: true },
  'goblin': { name: '哥布林', char: '👺', color: '#228B22', hp: 25, attack: 5, defense: 1, isHostile: true },
  'skeleton': { name: '骷髅', char: '💀', color: '#F5F5DC', hp: 20, attack: 6, defense: 0, isHostile: true },
  'bat': { name: '蝙蝠', char: '🦇', color: '#800080', hp: 10, attack: 3, defense: 0, isHostile: true },
  'orc': { name: '兽人', char: '👹', color: '#006400', hp: 35, attack: 8, defense: 2, isHostile: true },
  'troll': { name: '巨魔', char: '🧟', color: '#008000', hp: 50, attack: 10, defense: 3, isHostile: true },
  'spider': { name: '蜘蛛', char: '🕷️', color: '#4B0082', hp: 12, attack: 4, defense: 0, isHostile: true },
  'snake': { name: '毒蛇', char: '🐍', color: '#556B2F', hp: 18, attack: 5, defense: 0, isHostile: true },
  'ghost': { name: '幽灵', char: '👻', color: '#E0E0E0', hp: 25, attack: 7, defense: 1, isHostile: true },
  'dragon': { name: '幼龙', char: '🐲', color: '#FF4500', hp: 80, attack: 15, defense: 5, isHostile: true }
};

/** 游戏主类 */
export class Game {
  private config: GameConfig;
  private map!: GameMap;
  private player: PlayerData;
  private entities: Entity[] = [];
  private inventory: InventorySlot[] = [];
  private equipment: EquipmentSlots = {};
  private gold: number = 0;
  private state: GameState = GameState.EXPLORE;
  private combatState: CombatState = CombatState.PLAYER_TURN;
  private combatEnemies: Entity[] = []; // 当前战斗中的敌人
  private inCombat: boolean = false;
  private messages: LogMessage[] = [];
  private turn: number = 0;
  private dungeonLevel: number = 1;
  private scheduler: InstanceType<typeof ROT.Scheduler.Simple>;
  private engine: InstanceType<typeof ROT.Engine>;
  private fov: InstanceType<typeof ROT.FOV.PreciseShadowcasting>;
  onUpdate: () => void;
  private selectedInventoryIndex: number = 0;
  private inventoryFilter: ItemType | null = null;
  private gameOver: boolean = false;
  private enemyTurnDelay: number = 500; // 敌人回合之间的延迟（毫秒）

  constructor(onUpdate: () => void, config: Partial<GameConfig> = {}) {
    this.config = { ...DEFAULT_CONFIG, ...config };
    this.onUpdate = onUpdate;
    
    // 初始化玩家
    this.player = {
      name: '勇者',
      level: 1,
      hp: 100,
      maxHp: 100,
      mp: 50,
      maxMp: 50,
      exp: 0,
      maxExp: 100,
      attack: 10,
      defense: 5,
      gold: 0,
      position: { x: 0, y: 0 },
      skills: {
        learned: ['slash', 'first_aid', 'focus'],
        equipped: ['slash', 'first_aid', 'focus'],
        cooldowns: {}
      },
      buffs: [],
      statPoints: 0,
      baseAttack: 10,
      baseDefense: 5,
      baseMaxHp: 100,
      baseMaxMp: 50
    };
    
    // 生成地图
    this.generateMap();
    
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
    this.addMessage('欢迎来到地下城！使用 WASD 或方向键移动', '#00FF00');
  }

  /** 生成地图 */
  private generateMap(): void {
    const map: GameMap = {
      width: this.config.mapWidth,
      height: this.config.mapHeight,
      tiles: [],
      explored: [],
      visible: []
    };

    // 初始化地图
    for (let x = 0; x < map.width; x++) {
      map.tiles[x] = [];
      map.explored[x] = [];
      map.visible[x] = [];
      for (let y = 0; y < map.height; y++) {
        map.tiles[x][y] = TILES.WALL;
        map.explored[x][y] = false;
        map.visible[x][y] = false;
      }
    }

    // 使用 ROT.js 的 Digger 算法生成房间
    const digger = new ROT.Map.Digger(map.width, map.height, {
      roomWidth: [4, 10],
      roomHeight: [4, 8],
      corridorLength: [2, 6],
      dugPercentage: 0.2
    });

    const rooms: Array<{ getLeft(): number; getRight(): number; getTop(): number; getBottom(): number }> = [];
    digger.create((x, y, value) => {
      if (value === 0) {
        map.tiles[x][y] = TILES.FLOOR;
      }
    });

    // 获取房间
    digger.getRooms().forEach(room => rooms.push(room));

    // 放置玩家（在第一个房间）
    if (rooms.length > 0) {
      const firstRoom = rooms[0];
      this.player.position = {
        x: Math.floor((firstRoom.getLeft() + firstRoom.getRight()) / 2),
        y: Math.floor((firstRoom.getTop() + firstRoom.getBottom()) / 2)
      };
    }

    // 放置楼梯（在最后一个房间，如果只有一个房间则在角落）
    if (rooms.length > 0) {
      const lastRoom = rooms[rooms.length - 1];
      // 放在房间右下角，避免与玩家起始位置冲突
      let stairsX = lastRoom.getRight() - 1;
      let stairsY = lastRoom.getBottom() - 1;
      
      // 确保楼梯位置是地板
      if (map.tiles[stairsX][stairsY].walkable) {
        map.tiles[stairsX][stairsY] = TILES.STAIRS_DOWN;
      } else {
        // 如果右下角不是地板，找第一个可用的地板位置
        for (let y = lastRoom.getTop() + 1; y < lastRoom.getBottom(); y++) {
          for (let x = lastRoom.getLeft() + 1; x < lastRoom.getRight(); x++) {
            if (map.tiles[x][y].walkable && 
                !(x === this.player.position.x && y === this.player.position.y)) {
              map.tiles[x][y] = TILES.STAIRS_DOWN;
              stairsX = x;
              stairsY = y;
              break;
            }
          }
          if (map.tiles[stairsX][stairsY].char === '>') break;
        }
      }
    }

    this.map = map;

    // 生成实体
    this.generateEntities(rooms);
  }

  /** 生成实体 */
  private generateEntities(rooms: Array<{ getLeft(): number; getRight(): number; getTop(): number; getBottom(): number }>): void {
    this.entities = [];
    
    // 跳过第一个房间（玩家出生点）
    for (let i = 1; i < rooms.length; i++) {
      const room = rooms[i];
      const centerX = Math.floor((room.getLeft() + room.getRight()) / 2);
      const centerY = Math.floor((room.getTop() + room.getBottom()) / 2);

      // 随机决定房间内容
      const roll = Math.random();
      
      if (roll < 0.3) {
        // 生成怪物
        this.spawnEnemy(centerX, centerY);
      } else if (roll < 0.4) {
        // 生成宝箱
        this.spawnChest(centerX, centerY);
      } else if (roll < 0.5) {
        // 生成NPC
        this.spawnNPC(centerX, centerY);
      }
      
      // 房间角落可能生成物品
      if (Math.random() < 0.3) {
        const itemX = room.getLeft() + 1 + Math.floor(Math.random() * (room.getRight() - room.getLeft() - 2));
        const itemY = room.getTop() + 1 + Math.floor(Math.random() * (room.getBottom() - room.getTop() - 2));
        this.spawnItemOnMap(itemX, itemY);
      }
    }
  }

  /** 生成敌人 */
  private spawnEnemy(x: number, y: number): void {
    const templates = Object.entries(ENTITY_TEMPLATES).filter(([_, t]) => 'isHostile' in t) as [string, EnemyTemplate][];
    const [key, template] = templates[Math.floor(Math.random() * templates.length)];
    
    // 获取敌人技能
    const defaultSkill = getEnemyDefaultSkill(key);
    const skills: Skill[] = [];
    if (defaultSkill) {
      skills.push(defaultSkill);
    }
    
    this.entities.push({
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
      skills: skills,
      buffs: [],
      mp: 0,
      maxMp: 0
    });
  }

  /** 生成宝箱 */
  private spawnChest(x: number, y: number): void {
    this.entities.push({
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

  /** 生成NPC */
  private spawnNPC(x: number, y: number): void {
    const npcTypes = ['villager', 'merchant'];
    const key = npcTypes[Math.floor(Math.random() * npcTypes.length)];
    const template = ENTITY_TEMPLATES[key] as NPCTemplate;
    
    this.entities.push({
      id: `npc_${this.turn}_${x}_${y}`,
      type: EntityType.NPC,
      name: template.name,
      position: { x, y },
      char: template.char,
      color: template.color,
      dialogue: template.dialogue
    });
  }

  /** 在地图上生成物品 */
  private spawnItemOnMap(x: number, y: number): void {
    const item = getRandomLoot();
    if (!item) return;
    
    this.entities.push({
      id: `item_${this.turn}_${x}_${y}`,
      type: EntityType.ITEM,
      name: item.name,
      position: { x, y },
      char: item.char,
      color: item.color,
      loot: [item.id]
    });
  }

  /** 初始化背包 */
  private initInventory(): void {
    this.addItemToInventory(createItem('wooden_sword')!);
    this.addItemToInventory(createItem('leather_armor')!);
    this.addItemToInventory(createItem('health_potion')!, 3);
    this.addItemToInventory(createItem('herb')!, 5);
  }

  /** 添加物品到背包 */
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

  /** 检查是否透明（用于FOV） */
  private isTransparent(x: number, y: number): boolean {
    if (!this.isInBounds(x, y)) return false;
    return this.map.tiles[x][y].transparent;
  }

  /** 检查是否在边界内 */
  private isInBounds(x: number, y: number): boolean {
    return x >= 0 && x < this.map.width && y >= 0 && y < this.map.height;
  }

  /** 更新视野 - 整个地图可见，视野内是亮的，视野外是阴影 */
  private updateFOV(): void {
    // 首先将整个地图标记为已探索（可见但可能是阴影）
    for (let x = 0; x < this.map.width; x++) {
      for (let y = 0; y < this.map.height; y++) {
        this.map.explored[x][y] = true;
        this.map.visible[x][y] = false; // 默认不在视野内（阴影）
      }
    }

    // 计算视野范围 - 视野内的区域是亮的
    this.fov.compute(
      this.player.position.x, 
      this.player.position.y, 
      this.config.fovRadius, 
      (x: number, y: number, _r: number, _visibility: number) => {
        if (this.isInBounds(x, y)) {
          this.map.visible[x][y] = true; // 在视野内，高亮显示
        }
      }
    );
  }

  /** 执行回合 */
  act(): void {
    this.engine.lock();
  }

  /** 处理输入 */
  handleInput(key: string): void {
    if (this.gameOver) return;
    
    // 战斗模式下，只有玩家回合才响应
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
  
  /** 处理加点输入 */
  private handleLevelUpInput(key: string): void {
    if (this.player.statPoints <= 0) {
      this.state = GameState.EXPLORE;
      this.onUpdate();
      return;
    }
    
    switch (key) {
      case '1': // 加攻击
        this.player.baseAttack += 2;
        this.player.statPoints--;
        this.addMessage('⚔️ 攻击力 +2', '#FFD700');
        break;
      case '2': // 加防御
        this.player.baseDefense += 1;
        this.player.statPoints--;
        this.addMessage('🛡️ 防御力 +1', '#FFD700');
        break;
      case '3': // 加生命
        this.player.baseMaxHp += 15;
        this.player.hp += 15;
        this.player.statPoints--;
        this.addMessage('💚 生命上限 +15', '#FFD700');
        break;
      case '4': // 加法力
        this.player.baseMaxMp += 10;
        this.player.mp += 10;
        this.player.statPoints--;
        this.addMessage('💙 法力上限 +10', '#FFD700');
        break;
      case 'enter':
      case 'escape':
        // 确认，返回探索
        this.state = GameState.EXPLORE;
        this.addMessage('加点完成！', '#00FF00');
        break;
    }
    
    // 更新属性
    this.updatePlayerStats();
    this.onUpdate();
    
    // 如果没有点数了，自动返回
    if (this.player.statPoints <= 0 && this.state === GameState.LEVEL_UP) {
      this.state = GameState.EXPLORE;
      this.addMessage('所有属性点已分配！', '#00FF00');
      this.onUpdate();
    }
  }

  /** 处理探索模式输入 - 自由移动 */
  private handleExploreInput(key: string): void {
    let moved = false;
    let dx = 0, dy = 0;

    switch (key) {
      case 'w':
      case 'arrowup':
        dy = -1;
        moved = true;
        break;
      case 's':
      case 'arrowdown':
        dy = 1;
        moved = true;
        break;
      case 'a':
      case 'arrowleft':
        dx = -1;
        moved = true;
        break;
      case 'd':
      case 'arrowright':
        dx = 1;
        moved = true;
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

  /** 探索模式移动 - 自由移动，遇敌切换战斗 */
  private movePlayerExplore(dx: number, dy: number): void {
    const newX = this.player.position.x + dx;
    const newY = this.player.position.y + dy;

    // 检查边界和可行走性
    if (!this.isInBounds(newX, newY) || !this.map.tiles[newX][newY].walkable) {
      return;
    }

    // 检查是否有敌人（不能穿过敌人）
    const enemyAtPosition = this.entities.find(e => 
      e.position.x === newX && e.position.y === newY && e.type === EntityType.ENEMY
    );

    if (enemyAtPosition) {
      // 撞向敌人，进入战斗模式
      this.startCombat(enemyAtPosition);
      return;
    }

    // 检查宝箱阻挡
    const chestAtPosition = this.entities.find(e => 
      e.position.x === newX && e.position.y === newY && 
      e.type === EntityType.CHEST && !e.isOpen
    );

    if (chestAtPosition) {
      return; // 不能穿过关闭的宝箱
    }

    // 自由移动
    this.player.position.x = newX;
    this.player.position.y = newY;
    this.updateFOV();
    
    // 检查是否触发战斗（附近有敌人）
    this.checkCombatTrigger();
    
    this.onUpdate();
  }

  /** 检查是否触发战斗 - 当玩家靠近敌人时 */
  private checkCombatTrigger(): void {
    // 查找距离玩家2格内的敌人
    const nearbyEnemies = this.entities.filter(e => {
      if (e.type !== EntityType.ENEMY) return false;
      const dist = Math.abs(e.position.x - this.player.position.x) + 
                   Math.abs(e.position.y - this.player.position.y);
      return dist <= 2;
    });
    
    if (nearbyEnemies.length > 0) {
      // 自动进入战斗模式（与最近的敌人）
      this.startCombat(nearbyEnemies[0]);
    }
  }

  /** 开始战斗 */
  private startCombat(enemy: Entity): void {
    this.inCombat = true;
    this.state = GameState.COMBAT;
    this.combatState = CombatState.PLAYER_TURN;
    
    // 收集所有参与战斗的敌人（玩家周围2格内的所有敌人）
    this.combatEnemies = this.entities.filter(e => {
      if (e.type !== EntityType.ENEMY) return false;
      const dist = Math.abs(e.position.x - this.player.position.x) + 
                   Math.abs(e.position.y - this.player.position.y);
      return dist <= 2;
    });
    
    if (this.combatEnemies.length === 0) {
      this.combatEnemies = [enemy];
    }
    
    this.addMessage(`⚔️ 进入战斗！遭遇 ${enemy.name}`, '#FF0000');
    this.onUpdate();
  }

  /** 结束战斗 */
  private endCombat(): void {
    this.inCombat = false;
    this.state = GameState.EXPLORE;
    this.combatState = CombatState.PLAYER_TURN;
    this.combatEnemies = [];
    this.addMessage('✓ 战斗结束', '#00FF00');
    this.onUpdate();
  }

  /** 处理战斗输入 */
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
      case 's':
        // 打开技能选择界面
        this.state = GameState.INVENTORY; // 暂时用背包界面代替技能选择
        this.onUpdate();
        break;
      case '1':
      case '2':
      case '3':
      case '4':
        // 直接使用技能槽
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

  /** 战斗：攻击 */
  private combatAttack(): void {
    if (this.combatEnemies.length === 0) {
      this.endCombat();
      return;
    }
    
    // 攻击第一个敌人
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
      
      this.entities = this.entities.filter(e => e.id !== target.id);
      this.combatEnemies = this.combatEnemies.filter(e => e.id !== target.id);
      
      // 检查是否还有敌人
      if (this.combatEnemies.length === 0) {
        setTimeout(() => this.endCombat(), 500);
        return;
      }
    }
    
    this.endPlayerCombatTurn();
  }

  /** 战斗：防御 */
  private combatDefend(): void {
    this.addMessage('你采取防御姿态，本回合受到的伤害减半', '#00FF00');
    this.endPlayerCombatTurn();
  }

  /** 战斗：撤退 */
  private combatRetreat(): void {
    this.addMessage('你尝试撤退...', '#FFFF00');
    // 50% 概率成功撤退
    if (Math.random() < 0.5) {
      this.addMessage('成功撤退！', '#00FF00');
      // 向后移动一格
      const retreatX = this.player.position.x - Math.sign(this.combatEnemies[0].position.x - this.player.position.x);
      const retreatY = this.player.position.y - Math.sign(this.combatEnemies[0].position.y - this.player.position.y);
      if (this.isInBounds(retreatX, retreatY) && this.map.tiles[retreatX][retreatY].walkable) {
        this.player.position.x = retreatX;
        this.player.position.y = retreatY;
        this.updateFOV();
      }
      this.endCombat();
    } else {
      this.addMessage('撤退失败！', '#FF0000');
      this.endPlayerCombatTurn();
    }
  }

  /** 结束玩家战斗回合，开始敌人回合 */
  private endPlayerCombatTurn(): void {
    this.combatState = CombatState.ENEMY_TURN;
    this.turn++;
    this.onUpdate();
    
    setTimeout(() => {
      this.processCombatEnemyTurns();
    }, this.enemyTurnDelay);
  }

  /** 处理战斗中的敌人回合 */
  private async processCombatEnemyTurns(): Promise<void> {
    // 处理玩家buff（中毒等）
    this.processBuffs();
    
    // 检查玩家是否死亡
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
      
      // 检查眩晕
      const isStunned = enemy.buffs?.some(b => b.type === 'stun');
      if (isStunned) {
        this.addMessage(`${enemy.name} 眩晕中，无法行动`, '#FFFF00');
        this.onUpdate();
        await this.delay(this.enemyTurnDelay);
        continue;
      }
      
      // 敌人使用技能或普通攻击
      this.enemyUseSkill(enemy);
      
      // 检查玩家死亡
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
    
    // 减少所有冷却
    this.reduceCooldowns();
    
    // 敌人回合结束，切换回玩家回合
    if (!this.gameOver && this.combatEnemies.length > 0) {
      this.combatState = CombatState.PLAYER_TURN;
      this.onUpdate();
    } else if (this.combatEnemies.length === 0) {
      this.endCombat();
    }
  }

  /** 延迟辅助函数 */
  private delay(ms: number): Promise<void> {
    return new Promise(resolve => setTimeout(resolve, ms));
  }

  /** 升级 - 使用基础属性并触发加点 */
  private levelUp(): void {
    this.player.level++;
    this.player.exp = 0;
    this.player.maxExp = Math.floor(this.player.maxExp * 1.5);
    
    // 获得属性点
    const points = 3;
    this.player.statPoints += points;
    
    // 基础属性小幅增长（来自等级提升本身）
    this.player.baseMaxHp += 10;
    this.player.baseMaxMp += 5;
    
    // 更新当前属性
    this.updatePlayerStats();
    
    // 回满状态
    this.player.hp = this.player.maxHp;
    this.player.mp = this.player.maxMp;
    
    this.addMessage(`🎉 升级了！等级 ${this.player.level}，获得 ${points} 属性点！`, '#FFD700');
    
    // 进入加点界面
    if (this.player.statPoints > 0) {
      this.state = GameState.LEVEL_UP;
    }
    
    this.onUpdate();
  }
  
  /** 更新玩家属性（基础+装备） */
  private updatePlayerStats(): void {
    const equipStats = this.getEquipmentStats();
    
    this.player.maxHp = this.player.baseMaxHp + equipStats.hp;
    this.player.maxMp = this.player.baseMaxMp + equipStats.mp;
    this.player.attack = this.player.baseAttack + equipStats.attack;
    this.player.defense = this.player.baseDefense + equipStats.defense;
    
    // 确保当前HP/MP不超过上限
    this.player.hp = Math.min(this.player.hp, this.player.maxHp);
    this.player.mp = Math.min(this.player.mp, this.player.maxMp);
  }

  /** 交互 */
  private interact(): void {
    // 首先检查是否站在楼梯上
    const tile = this.map.tiles[this.player.position.x][this.player.position.y];
    if (tile.char === '▼ ' || tile.char.includes('▼')) {
      this.useStairs();
      return;
    }
    
    // 检查附近的可互动实体
    const nearby = this.entities.filter(e => {
      const dx = Math.abs(e.position.x - this.player.position.x);
      const dy = Math.abs(e.position.y - this.player.position.y);
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
          
          // 额外随机战利品
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

  /** 探索模式：拾取物品 */
  private pickupItemExplore(): void {
    const items = this.entities.filter(e => 
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
        this.entities = this.entities.filter(e => e.id !== entity.id);
      });
    }
    
    this.onUpdate();
  }

  /** 使用楼梯 */
  private useStairs(): void {
    const tile = this.map.tiles[this.player.position.x][this.player.position.y];
    if (tile.char === '▼ ' || tile.char.includes('▼')) {
      this.dungeonLevel++;
      this.addMessage(`进入地下城第 ${this.dungeonLevel} 层...`, '#FFD700');
      this.generateMap();
      this.updateFOV();
    } else {
      this.addMessage('这里没有向下的楼梯', '#808080');
    }
    this.onUpdate();
  }

  /** 打开背包 */
  private openInventory(): void {
    this.state = GameState.INVENTORY;
    this.selectedInventoryIndex = 0;
    this.onUpdate();
  }

  /** 处理背包输入 */
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

  /** 获取过滤后的物品列表 */
  private getFilteredItems(): InventorySlot[] {
    if (!this.inventoryFilter) return this.inventory;
    return this.inventory.filter(slot => slot.item.type === this.inventoryFilter);
  }

  /** 使用选中物品 - 战斗模式下消耗回合 */
  private useSelectedItem(): void {
    const filtered = this.getFilteredItems();
    const slot = filtered[this.selectedInventoryIndex];
    
    if (!slot) return;
    
    if (slot.item.equippable) {
      // 装备物品不消耗回合
      this.equipItem(slot.item);
      this.onUpdate();
    } else if (slot.item.effects) {
      // 使用消耗品
      this.applyItemEffects(slot.item.effects);
      this.removeItemFromInventory(slot.item.id, 1);
      this.addMessage(`使用了 ${slot.item.name}`, '#00FF00');
      
      // 战斗模式下消耗回合
      if (this.inCombat) {
        this.state = GameState.COMBAT;
        this.endPlayerCombatTurn();
      } else {
        this.state = GameState.EXPLORE;
        this.onUpdate();
      }
    }
  }

  /** 装备/卸下选中物品 */
  private equipSelectedItem(): void {
    const filtered = this.getFilteredItems();
    const slot = filtered[this.selectedInventoryIndex];
    
    if (!slot || !slot.item.equippable) return;
    
    this.equipItem(slot.item);
    this.onUpdate();
  }

  /** 丢弃选中物品 */
  private dropSelectedItem(): void {
    const filtered = this.getFilteredItems();
    const slot = filtered[this.selectedInventoryIndex];
    
    if (!slot) return;
    
    this.removeItemFromInventory(slot.item.id, 1);
    this.addMessage(`丢弃了 ${slot.item.name}`, '#808080');
    
    if (this.selectedInventoryIndex >= this.getFilteredItems().length) {
      this.selectedInventoryIndex = Math.max(0, this.getFilteredItems().length - 1);
    }
    
    // 根据当前状态返回
    this.state = this.inCombat ? GameState.COMBAT : GameState.EXPLORE;
    this.onUpdate();
  }

  /** 切换背包筛选 */
  private switchInventoryFilter(): void {
    const filters: (ItemType | null)[] = [
      null, ItemType.WEAPON, ItemType.ARMOR, ItemType.CONSUMABLE, ItemType.MATERIAL
    ];
    const currentIndex = filters.indexOf(this.inventoryFilter);
    this.inventoryFilter = filters[(currentIndex + 1) % filters.length];
    this.selectedInventoryIndex = 0;
    this.onUpdate();
  }

  /** 装备物品 */
  private equipItem(item: Item): void {
    if (!item.equippable || !item.equipSlot) return;
    
    const slotKey = item.equipSlot as keyof EquipmentSlots;
    
    // 卸下当前装备
    if (this.equipment[slotKey]) {
      this.addItemToInventory(this.equipment[slotKey]!);
      this.addMessage(`卸下了 ${this.equipment[slotKey]!.name}`, '#808080');
    }
    
    // 装备新物品
    this.equipment[slotKey] = item;
    this.removeItemFromInventory(item.id, 1);
    this.addMessage(`装备了 ${item.name}`, '#00FF00');
    
    // 更新属性（装备加成）
    this.updatePlayerStats();
    
    this.onUpdate();
  }

  /** 应用物品效果 */
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

  /** 从背包移除物品 */
  private removeItemFromInventory(itemId: string, quantity: number): void {
    const index = this.inventory.findIndex(slot => slot.item.id === itemId);
    if (index === -1) return;
    
    const slot = this.inventory[index];
    slot.quantity -= quantity;
    
    if (slot.quantity <= 0) {
      this.inventory.splice(index, 1);
    }
  }

  /** 获取装备属性加成 */
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

  // ============== 技能系统 ==============
  
  /** 获取玩家可用技能 */
  getAvailableSkills(): Skill[] {
    return this.player.skills.equipped
      .map(id => createSkill(id))
      .filter((s): s is Skill => s !== null)
      .map(s => ({
        ...s,
        currentCooldown: this.player.skills.cooldowns[s.id] || 0
      }));
  }
  
  /** 使用技能 */
  useSkill(skillId: string, target?: Entity): boolean {
    if (!this.player.skills.equipped.includes(skillId)) {
      this.addMessage('技能未装备', '#FF0000');
      return false;
    }
    
    const skill = createSkill(skillId);
    if (!skill) return false;
    
    // 检查冷却
    const currentCd = this.player.skills.cooldowns[skillId] || 0;
    if (currentCd > 0) {
      this.addMessage(`技能冷却中，剩余 ${currentCd} 回合`, '#FF0000');
      return false;
    }
    
    // 检查法力
    if (this.player.mp < skill.mpCost) {
      this.addMessage('法力不足', '#FF0000');
      return false;
    }
    
    // 消耗法力
    this.player.mp -= skill.mpCost;
    
    // 设置冷却
    this.player.skills.cooldowns[skillId] = skill.cooldown;
    
    // 执行技能效果
    this.executeSkillEffects(skill, target);
    
    this.addMessage(`使用了 ${skill.name}`, '#FFD700');
    
    // 战斗模式下结束回合
    if (this.inCombat) {
      this.endPlayerCombatTurn();
    } else {
      this.onUpdate();
    }
    
    return true;
  }
  
  /** 执行技能效果 */
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
  
  /** 敌人使用技能 */
  private enemyUseSkill(enemy: Entity): void {
    if (!enemy.skills || enemy.skills.length === 0) {
      // 没有技能，普通攻击
      this.enemyNormalAttack(enemy);
      return;
    }
    
    // 查找可用的技能（冷却为0）
    const availableSkills = enemy.skills.filter(s => s.currentCooldown <= 0);
    
    if (availableSkills.length > 0 && Math.random() < 0.4) {
      // 40%概率使用技能
      const skill = availableSkills[Math.floor(Math.random() * availableSkills.length)];
      
      // 设置冷却
      skill.currentCooldown = skill.cooldown;
      
      this.addMessage(`${enemy.name} 使用了 ${skill.name}！`, '#FF4444');
      
      // 执行技能效果
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
          case 'buff_attack':
            if (!enemy.buffs) enemy.buffs = [];
            enemy.buffs.push({
              type: 'attack',
              value: effect.value,
              duration: effect.duration || 3,
              source: skill.name
            });
            this.addMessage(`${enemy.name} 攻击力提升`, '#FF4444');
            break;
          case 'buff_defense':
            if (!enemy.buffs) enemy.buffs = [];
            enemy.buffs.push({
              type: 'defense',
              value: effect.value,
              duration: effect.duration || 3,
              source: skill.name
            });
            this.addMessage(`${enemy.name} 防御力提升`, '#FF4444');
            break;
        }
      }
    } else {
      // 普通攻击
      this.enemyNormalAttack(enemy);
    }
  }
  
  /** 敌人普通攻击 */
  private enemyNormalAttack(enemy: Entity): void {
    const damage = Math.max(1, (enemy.attack || 5) - this.player.defense - this.getEquipmentStats().defense);
    this.player.hp -= damage;
    this.addMessage(`${enemy.name} 攻击了你，造成 ${damage} 点伤害`, '#FF0000');
  }
  
  /** 减少所有冷却 */
  private reduceCooldowns(): void {
    // 减少玩家技能冷却
    for (const [id, cd] of Object.entries(this.player.skills.cooldowns)) {
      if (cd > 0) {
        this.player.skills.cooldowns[id] = cd - 1;
      }
    }
    
    // 减少敌人技能冷却
    for (const entity of this.entities) {
      if (entity.skills) {
        for (const skill of entity.skills) {
          if (skill.currentCooldown > 0) {
            skill.currentCooldown--;
          }
        }
      }
    }
  }
  
  /** 处理Buff效果 */
  private processBuffs(): void {
    // 处理玩家buff
    for (let i = this.player.buffs.length - 1; i >= 0; i--) {
      const buff = this.player.buffs[i];
      
      // 应用持续效果
      if (buff.type === 'poison') {
        this.player.hp -= buff.value;
        this.addMessage(`中毒效果造成 ${buff.value} 点伤害`, '#8B008B');
      }
      
      // 减少持续时间
      buff.duration--;
      if (buff.duration <= 0) {
        this.addMessage(`${buff.source} 效果消失了`, '#808080');
        this.player.buffs.splice(i, 1);
      }
    }
    
    // 处理敌人buff
    for (const entity of this.entities) {
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
  
  /** 获取玩家实际攻击力（包含buff） */
  private getPlayerAttack(): number {
    let attack = this.player.attack + this.getEquipmentStats().attack;
    for (const buff of this.player.buffs) {
      if (buff.type === 'attack') {
        attack += Math.floor(this.player.attack * buff.value);
      }
    }
    return attack;
  }
  
  /** 获取玩家实际防御力（包含buff） */
  private getPlayerDefense(): number {
    let defense = this.player.defense + this.getEquipmentStats().defense;
    for (const buff of this.player.buffs) {
      if (buff.type === 'defense') {
        defense += Math.floor(this.player.defense * buff.value);
      }
    }
    return defense;
  }

  /** 添加消息 */
  addMessage(text: string, color: string = '#FFFFFF'): void {
    this.messages.push({ text, color, turn: this.turn });
    if (this.messages.length > 100) {
      this.messages.shift();
    }
  }

  // ============== Getter 方法 ==============
  
  getState(): GameState { return this.state; }
  getCombatState(): CombatState { return this.combatState; }
  isInCombat(): boolean { return this.inCombat; }
  getCombatEnemies(): Entity[] { return this.combatEnemies; }
  getMap(): GameMap { return this.map; }
  getPlayer(): PlayerData { return this.player; }
  getEntities(): Entity[] { return this.entities; }
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
}

export { ROT, TILES, RARITY_COLORS, ITEM_TYPE_ICONS };
