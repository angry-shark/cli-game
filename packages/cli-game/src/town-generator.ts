/**
 * 城镇地图生成器
 * 生成包含房屋、道路、商店的城镇布局
 */

import * as ROT from 'rot-js';
import { Tile, GameMap, Entity, EntityType, Point2D } from './types.js';

/** 城镇瓦片定义 - emoji本身2字符宽度，不加空格 */
export const TOWN_TILES = {
  // 地面 - 使用双字符方块
  GRASS: { char: '░░', color: '#2d5016', bgColor: '#1a2f0a', walkable: true, transparent: true },
  ROAD: { char: '▓▓', color: '#808080', bgColor: '#404040', walkable: true, transparent: true },
  PAVEMENT: { char: '▒▒', color: '#a0a0a0', bgColor: '#606060', walkable: true, transparent: true },
  
  // 建筑 - emoji本身占2字符
  HOUSE_WALL: { char: '██', color: '#8B4513', bgColor: '#5c2e0c', walkable: false, transparent: false },
  HOUSE_ROOF: { char: '▓▓', color: '#654321', bgColor: '#3d2714', walkable: false, transparent: false },
  SHOP_WALL: { char: '██', color: '#4682B4', bgColor: '#2c5270', walkable: false, transparent: false },
  SHOP_SIGN: { char: '💰', color: '#FFD700', bgColor: '#b8860b', walkable: false, transparent: true },
  INN_WALL: { char: '██', color: '#228B22', bgColor: '#145214', walkable: false, transparent: false },
  INN_SIGN: { char: '🍺', color: '#FF6347', bgColor: '#8b3a2f', walkable: false, transparent: true },
  
  // 环境 - emoji本身占2字符
  TREE: { char: '🌲', color: '#006400', bgColor: '#1a2f0a', walkable: false, transparent: true },
  FENCE: { char: '🚧', color: '#8B4513', bgColor: '#1a2f0a', walkable: false, transparent: true },
  WELL: { char: '🕳️', color: '#4682B4', bgColor: '#2c5270', walkable: false, transparent: true },
  LAMP: { char: '💡', color: '#FFD700', bgColor: '#1a2f0a', walkable: true, transparent: true },
  
  // 特殊
  EXIT: { char: '⬇️', color: '#FFD700', bgColor: '#404040', walkable: true, transparent: true },
  DOOR: { char: '🚪', color: '#8B4513', bgColor: '#654321', walkable: true, transparent: true },
};

/** 建筑类型 */
export enum BuildingType {
  HOUSE = 'house',
  SHOP = 'shop',
  INN = 'inn',
  TEMPLE = 'temple',
  BLACKSMITH = 'blacksmith'
}

/** 建筑定义 */
export interface Building {
  id: string;
  type: BuildingType;
  name: string;
  x: number;
  y: number;
  width: number;
  height: number;
  doorX: number;
  doorY: number;
}

/** 城镇区域 */
export interface TownChunk {
  x: number;
  y: number;
  width: number;
  height: number;
  tiles: Tile[][];
  buildings: Building[];
  entities: Entity[];
  loaded: boolean;
}

/** 城镇生成配置 */
export interface TownConfig {
  chunkSize: number;
  roadWidth: number;
  buildingDensity: number;
  treeDensity: number;
}

const DEFAULT_TOWN_CONFIG: TownConfig = {
  chunkSize: 40,
  roadWidth: 2,
  buildingDensity: 0.3,
  treeDensity: 0.008  // 极其稀疏的树木（40x40地图约1-2棵树）
};

/** 城镇生成器 */
export class TownGenerator {
  private config: TownConfig;
  private seed: number;
  private chunks: Map<string, TownChunk> = new Map();

  constructor(config: Partial<TownConfig> = {}, seed?: number) {
    this.config = { ...DEFAULT_TOWN_CONFIG, ...config };
    this.seed = seed ?? Math.floor(Math.random() * 100000);
  }

  /** 生成区块 */
  generateChunk(chunkX: number, chunkY: number): TownChunk {
    const key = `${chunkX},${chunkY}`;
    
    // 如果已存在，直接返回
    if (this.chunks.has(key)) {
      return this.chunks.get(key)!;
    }

    const { chunkSize } = this.config;
    const chunk: TownChunk = {
      x: chunkX,
      y: chunkY,
      width: chunkSize,
      height: chunkSize,
      tiles: [],
      buildings: [],
      entities: [],
      loaded: false
    };

    // 初始化草地
    for (let x = 0; x < chunkSize; x++) {
      chunk.tiles[x] = [];
      for (let y = 0; y < chunkSize; y++) {
        chunk.tiles[x][y] = TOWN_TILES.GRASS;
      }
    }

    // 生成道路网络
    this.generateRoads(chunk);
    
    // 生成建筑
    this.generateBuildings(chunk);
    
    // 生成环境装饰
    this.generateEnvironment(chunk);
    
    // 生成NPC
    this.generateNPCs(chunk);

    this.chunks.set(key, chunk);
    return chunk;
  }

  /** 生成道路 */
  private generateRoads(chunk: TownChunk): void {
    const { chunkSize, roadWidth } = this.config;
    
    // 主路 - 横向贯穿
    const mainRoadY = Math.floor(chunkSize / 2);
    for (let x = 0; x < chunkSize; x++) {
      for (let y = mainRoadY; y < mainRoadY + roadWidth; y++) {
        chunk.tiles[x][y] = TOWN_TILES.ROAD;
      }
    }
    
    // 主路 - 纵向贯穿
    const mainRoadX = Math.floor(chunkSize / 2);
    for (let y = 0; y < chunkSize; y++) {
      for (let x = mainRoadX; x < mainRoadX + roadWidth; x++) {
        chunk.tiles[x][y] = TOWN_TILES.ROAD;
      }
    }
    
    // 随机小巷
    const numAlleys = 2 + Math.floor(Math.random() * 3);
    for (let i = 0; i < numAlleys; i++) {
      const isHorizontal = Math.random() > 0.5;
      const pos = 5 + Math.floor(Math.random() * (chunkSize - 10));
      
      if (isHorizontal) {
        // 横向小巷
        for (let x = 0; x < chunkSize; x++) {
          chunk.tiles[x][pos] = TOWN_TILES.PAVEMENT;
        }
      } else {
        // 纵向小巷
        for (let y = 0; y < chunkSize; y++) {
          chunk.tiles[pos][y] = TOWN_TILES.PAVEMENT;
        }
      }
    }
  }

  /** 生成建筑 */
  private generateBuildings(chunk: TownChunk): void {
    const { chunkSize, buildingDensity } = this.config;
    const numBuildings = Math.floor((chunkSize * chunkSize) * buildingDensity / 100);
    
    const buildingTypes = [
      { type: BuildingType.HOUSE, weight: 50 },
      { type: BuildingType.SHOP, weight: 15 },
      { type: BuildingType.INN, weight: 10 },
      { type: BuildingType.TEMPLE, weight: 5 },
      { type: BuildingType.BLACKSMITH, weight: 10 }
    ];
    
    for (let i = 0; i < numBuildings; i++) {
      const width = 4 + Math.floor(Math.random() * 4);
      const height = 4 + Math.floor(Math.random() * 4);
      
      // 寻找可用位置
      let placed = false;
      let attempts = 0;
      
      while (!placed && attempts < 20) {
        const x = 2 + Math.floor(Math.random() * (chunkSize - width - 4));
        const y = 2 + Math.floor(Math.random() * (chunkSize - height - 4));
        
        if (this.canPlaceBuilding(chunk, x, y, width, height)) {
          const buildingType = this.weightedRandom(buildingTypes);
          const building = this.createBuilding(
            `building_${chunk.x}_${chunk.y}_${i}`,
            buildingType,
            x, y, width, height
          );
          
          this.drawBuilding(chunk, building);
          chunk.buildings.push(building);
          placed = true;
        }
        attempts++;
      }
    }
  }

  /** 检查是否可以放置建筑 */
  private canPlaceBuilding(chunk: TownChunk, x: number, y: number, width: number, height: number): boolean {
    // 检查是否与其他建筑重叠
    for (const building of chunk.buildings) {
      if (x < building.x + building.width + 1 &&
          x + width + 1 > building.x &&
          y < building.y + building.height + 1 &&
          y + height + 1 > building.y) {
        return false;
      }
    }
    
    // 检查是否在道路上
    for (let dx = x - 1; dx < x + width + 1; dx++) {
      for (let dy = y - 1; dy < y + height + 1; dy++) {
        if (dx >= 0 && dx < chunk.width && dy >= 0 && dy < chunk.height) {
          const tile = chunk.tiles[dx][dy];
          if (tile.char === TOWN_TILES.ROAD.char || tile.char === TOWN_TILES.PAVEMENT.char) {
            // 允许紧邻道路
            if (dx >= x && dx < x + width && dy >= y && dy < y + height) {
              return false;
            }
          }
        }
      }
    }
    
    return true;
  }

  /** 创建建筑 */
  private createBuilding(
    id: string,
    type: BuildingType,
    x: number,
    y: number,
    width: number,
    height: number
  ): Building {
    // 门朝向最近的道路
    let doorX = x + Math.floor(width / 2);
    let doorY = y + height; // 默认朝下
    
    // 寻找最近的道路
    const roads: { x: number; y: number; dist: number }[] = [];
    for (let dx = x - 2; dx < x + width + 2; dx++) {
      for (let dy = y - 2; dy < y + height + 2; dy++) {
        if (dx >= 0 && dx < this.config.chunkSize && dy >= 0 && dy < this.config.chunkSize) {
          roads.push({ x: dx, y: dy, dist: Math.abs(dx - (x + width/2)) + Math.abs(dy - (y + height/2)) });
        }
      }
    }
    
    const nearestRoad = roads.sort((a, b) => a.dist - b.dist)[0];
    if (nearestRoad) {
      if (nearestRoad.y < y) doorY = y;
      else if (nearestRoad.y >= y + height) doorY = y + height - 1;
      else if (nearestRoad.x < x) doorX = x;
      else doorX = x + width - 1;
    }
    
    const names: Record<BuildingType, string[]> = {
      [BuildingType.HOUSE]: ['民居', '住宅', '小屋', '宅院'],
      [BuildingType.SHOP]: ['杂货店', '道具店', '魔法商店', '冒险者商店'],
      [BuildingType.INN]: ['酒馆', '旅馆', '客栈', '休息站'],
      [BuildingType.TEMPLE]: ['神殿', '教堂', '祭坛', '圣地'],
      [BuildingType.BLACKSMITH]: ['铁匠铺', '武器店', '防具店', '工坊']
    };
    
    const nameList = names[type];
    const name = nameList[Math.floor(Math.random() * nameList.length)];
    
    return { id, type, name, x, y, width, height, doorX, doorY };
  }

  /** 绘制建筑到地图 */
  private drawBuilding(chunk: TownChunk, building: Building): void {
    const { x, y, width, height, type, doorX, doorY } = building;
    
    // 选择瓦片和标识
    let wallTile = TOWN_TILES.HOUSE_WALL;
    let roofTile = TOWN_TILES.HOUSE_ROOF;
    let signChar = '';
    let signColor = '#FFD700';
    
    switch (type) {
      case BuildingType.SHOP:
        wallTile = TOWN_TILES.SHOP_WALL;
        signChar = '💰';
        break;
      case BuildingType.INN:
        wallTile = TOWN_TILES.INN_WALL;
        signChar = '🍺';
        break;
      case BuildingType.BLACKSMITH:
        wallTile = TOWN_TILES.HOUSE_WALL;
        signChar = '⚒️';
        break;
      case BuildingType.TEMPLE:
        signChar = '⛪';
        break;
      case BuildingType.HOUSE:
        signChar = '🏠';
        signColor = '#808080';
        break;
    }
    
    // 绘制墙壁
    for (let dx = x; dx < x + width; dx++) {
      for (let dy = y; dy < y + height; dy++) {
        if (dx === doorX && dy === doorY) {
          // 门 - 使用更明显的双字符门
          chunk.tiles[dx][dy] = { 
            ...TOWN_TILES.ROAD, 
            char: '🚪',  // 门
            color: '#8B4513',
            bgColor: '#654321'
          };
        } else if (dx === x || dx === x + width - 1 || dy === y || dy === y + height - 1) {
          // 墙壁
          chunk.tiles[dx][dy] = wallTile;
        } else {
          // 内部（屋顶）
          chunk.tiles[dx][dy] = roofTile;
        }
      }
    }
    
    // 添加功能标识（在门旁边或屋顶上）
    if (signChar) {
      // 尝试在门上方或旁边放置标识
      const signPositions = [
        { x: doorX, y: doorY - 1 }, // 门上方
        { x: doorX + 1, y: doorY }, // 门右侧
        { x: doorX - 1, y: doorY }, // 门左侧
      ];
      
      for (const pos of signPositions) {
        if (pos.x >= x && pos.x < x + width && pos.y >= y && pos.y < y + height) {
          // 如果是墙壁位置，替换为带标识的墙
          if (chunk.tiles[pos.x][pos.y].char === wallTile.char && 
              !(pos.x === doorX && pos.y === doorY)) {
            chunk.tiles[pos.x][pos.y] = {
              ...wallTile,
              char: signChar,
              color: signColor
            };
            break;
          }
        }
      }
    }
  }

  /** 生成环境 */
  private generateEnvironment(chunk: TownChunk): void {
    const { chunkSize, treeDensity } = this.config;
    const numTrees = Math.floor((chunkSize * chunkSize) * treeDensity);
    
    for (let i = 0; i < numTrees; i++) {
      const x = Math.floor(Math.random() * chunkSize);
      const y = Math.floor(Math.random() * chunkSize);
      
      if (chunk.tiles[x][y].char === TOWN_TILES.GRASS.char) {
        chunk.tiles[x][y] = TOWN_TILES.TREE;
      }
    }
    
    // 沿着主要道路放置路灯（十字交叉的主干道）
    const placedLamps = new Set<string>();
    const mainRoadY = Math.floor(chunkSize / 2);
    const mainRoadX = Math.floor(chunkSize / 2);
    
    // 沿横向主路放置路灯（每隔6-10格一个）
    const lampSpacing = 8;
    for (let x = 4; x < chunkSize - 4; x += lampSpacing) {
      // 道路两侧都尝试放置
      const positions = [
        { x: x, y: mainRoadY - 1 },      // 道路上方
        { x: x, y: mainRoadY + 2 },      // 道路下方（roadWidth=2）
      ];
      
      for (const pos of positions) {
        if (placedLamps.size >= 4) break;
        
        // 确保位置是草地
        if (pos.x >= 0 && pos.x < chunkSize && pos.y >= 0 && pos.y < chunkSize) {
          if (chunk.tiles[pos.x][pos.y].char === TOWN_TILES.GRASS.char) {
            chunk.tiles[pos.x][pos.y] = TOWN_TILES.LAMP;
            placedLamps.add(`${pos.x},${pos.y}`);
          }
        }
      }
    }
    
    // 沿纵向主路放置路灯（每隔6-10格一个，与横向错开）
    for (let y = 8; y < chunkSize - 4; y += lampSpacing) {
      const positions = [
        { x: mainRoadX - 1, y: y },      // 道路左侧
        { x: mainRoadX + 2, y: y },      // 道路右侧（roadWidth=2）
      ];
      
      for (const pos of positions) {
        if (placedLamps.size >= 6) break; // 稍微多一点，总共最多6个
        
        if (pos.x >= 0 && pos.x < chunkSize && pos.y >= 0 && pos.y < chunkSize) {
          if (chunk.tiles[pos.x][pos.y].char === TOWN_TILES.GRASS.char) {
            // 检查是否与已有路灯太近
            const tooClose = Array.from(placedLamps).some(lampKey => {
              const [lx, ly] = lampKey.split(',').map(Number);
              const dist = Math.abs(lx - pos.x) + Math.abs(ly - pos.y);
              return dist < 6;
            });
            
            if (!tooClose) {
              chunk.tiles[pos.x][pos.y] = TOWN_TILES.LAMP;
              placedLamps.add(`${pos.x},${pos.y}`);
            }
          }
        }
      }
    }
    
    // 在中心添加水井或地下城入口
    const centerX = Math.floor(chunkSize / 2);
    const centerY = Math.floor(chunkSize / 2);
    
    // 在初始区块(0,0)的中心放置地下城入口
    if (chunk.x === 0 && chunk.y === 0) {
      // 找到中心附近的道路放置地下城入口
      for (let dx = -3; dx <= 3; dx++) {
        for (let dy = -3; dy <= 3; dy++) {
          const x = centerX + dx;
          const y = centerY + dy;
          if (x >= 0 && x < chunkSize && y >= 0 && y < chunkSize) {
            if (chunk.tiles[x][y].char === TOWN_TILES.ROAD.char || 
                chunk.tiles[x][y].char === TOWN_TILES.PAVEMENT.char) {
              chunk.tiles[x][y] = {
                ...TOWN_TILES.ROAD,
                char: '⬇️',  // 向下箭头
                color: '#FFD700',
                description: '通往地下城的入口'
              };
              // 在入口旁添加一个告示牌
              const signX = x + 1;
              if (signX < chunkSize && chunk.tiles[signX][y].walkable) {
                chunk.entities.push({
                  id: `sign_${chunk.x}_${chunk.y}`,
                  type: EntityType.NPC,
                  name: '告示牌',
                  position: { x: signX, y },
                  char: '📜',  // 卷轴
                  color: '#8B4513',
                  dialogue: ['⬇️ 地下城入口：危险！仅供冒险者进入！']
                });
              }
              return;
            }
          }
        }
      }
    } else {
      // 其他区块放置水井
      if (chunk.tiles[centerX][centerY].char === TOWN_TILES.ROAD.char) {
        for (let dx = -2; dx <= 2; dx++) {
          for (let dy = -2; dy <= 2; dy++) {
            const x = centerX + dx;
            const y = centerY + dy;
            if (x >= 0 && x < chunkSize && y >= 0 && y < chunkSize) {
              if (chunk.tiles[x][y].char === TOWN_TILES.GRASS.char) {
                chunk.tiles[x][y] = TOWN_TILES.WELL;
                return;
              }
            }
          }
        }
      }
    }
  }

  /** 生成NPC - 精简版：只在特定建筑附近生成功能性NPC */
  private generateNPCs(chunk: TownChunk): void {
    // 为每个商店/旅馆生成对应的商人NPC
    for (const building of chunk.buildings) {
      if (building.type === BuildingType.SHOP) {
        this.spawnMerchantNearBuilding(chunk, building, 'general');
      } else if (building.type === BuildingType.INN) {
        this.spawnMerchantNearBuilding(chunk, building, 'innkeeper');
      } else if (building.type === BuildingType.BLACKSMITH) {
        this.spawnMerchantNearBuilding(chunk, building, 'blacksmith');
      } else if (building.type === BuildingType.TEMPLE) {
        this.spawnMerchantNearBuilding(chunk, building, 'priest');
      }
    }
    
    // 只在初始区块(0,0)生成一个任务NPC
    if (chunk.x === 0 && chunk.y === 0) {
      this.spawnQuestNPC(chunk);
    }
    
    // 随机生成1-2个普通镇民（不是每个区块都有）
    if (Math.random() < 0.5) {
      const numCivilians = 1 + Math.floor(Math.random() * 2);
      for (let i = 0; i < numCivilians; i++) {
        this.spawnCivilian(chunk, i);
      }
    }
  }
  
  /** 在建筑附近生成商人 */
  private spawnMerchantNearBuilding(chunk: TownChunk, building: Building, type: string): void {
    // 在建筑门口附近寻找位置
    const positions = [
      { x: building.doorX + 1, y: building.doorY },
      { x: building.doorX - 1, y: building.doorY },
      { x: building.doorX, y: building.doorY + 1 },
      { x: building.doorX, y: building.doorY - 1 }
    ];
    
    for (const pos of positions) {
      if (pos.x >= 0 && pos.x < chunk.width && pos.y >= 0 && pos.y < chunk.height) {
        if (chunk.tiles[pos.x][pos.y].walkable && 
            (chunk.tiles[pos.x][pos.y].char === TOWN_TILES.ROAD.char || 
             chunk.tiles[pos.x][pos.y].char === TOWN_TILES.PAVEMENT.char)) {
          
          const merchant = this.createMerchant(type, pos.x, pos.y, chunk);
          if (merchant) {
            chunk.entities.push(merchant);
            return; // 只生成一个
          }
        }
      }
    }
  }
  
  /** 创建商人NPC */
  private createMerchant(type: string, x: number, y: number, chunk: TownChunk): any | null {
    const merchants: Record<string, { char: string; name: string; dialogue: string[] }> = {
      general: {
        char: '👲',  // 商人
        name: '杂货商人',
        dialogue: ['欢迎光临！我有各种补给品。', '药水、草药，应有尽有！', '准备好去地下城探险了吗？']
      },
      innkeeper: {
        char: '🧑‍🍳',  // 厨师
        name: '旅馆老板',
        dialogue: ['需要休息吗？住一晚恢复体力。', '我们这里有最好的食物。', '冒险者都来这里休息。']
      },
      blacksmith: {
        char: '👨‍🏭',  // 工人
        name: '铁匠',
        dialogue: ['需要打造装备吗？', '我有最好的武器和护甲。', '矿石收购，高价回收！']
      },
      priest: {
        char: '👳',  // 头巾
        name: '祭司',
        dialogue: ['愿神灵保佑你。', '我可以为你祝福。', '神殿欢迎所有冒险者。']
      }
    };
    
    const data = merchants[type];
    if (!data) return null;
    
    return {
      id: `merchant_${chunk.x}_${chunk.y}_${type}`,
      type: EntityType.NPC,
      name: data.name,
      position: { x, y },
      char: data.char,
      color: '#FFD700',
      dialogue: data.dialogue
    };
  }
  
  /** 生成任务NPC */
  private spawnQuestNPC(chunk: TownChunk): void {
    const { chunkSize } = this.config;
    const centerX = Math.floor(chunkSize / 2);
    const centerY = Math.floor(chunkSize / 2);
    
    // 在中心附近寻找道路
    for (let dx = -3; dx <= 3; dx++) {
      for (let dy = -3; dy <= 3; dy++) {
        const x = centerX + dx;
        const y = centerY + dy;
        
        if (x >= 0 && x < chunk.width && y >= 0 && y < chunk.height) {
          if (chunk.tiles[x][y].walkable && 
              (chunk.tiles[x][y].char === TOWN_TILES.ROAD.char || 
               chunk.tiles[x][y].char === TOWN_TILES.PAVEMENT.char)) {
            
            chunk.entities.push({
              id: `quest_giver_${chunk.x}_${chunk.y}`,
              type: EntityType.NPC,
              name: '任务发布人',
              position: { x, y },
              char: '🧝',  // 精灵
              color: '#9370DB',
              dialogue: [
                '勇敢的冒险者，地下城需要你！',
                '去地下城第5层寻找失落的宝物。',
                '带回任何有价值的发现，我会给你丰厚的奖励。',
                '小心深处的怪物，它们很危险！'
              ]
            });
            return;
          }
        }
      }
    }
  }
  
  /** 生成普通镇民 */
  private spawnCivilian(chunk: TownChunk, index: number): void {
    let placed = false;
    let attempts = 0;
    
    while (!placed && attempts < 20) {
      const x = Math.floor(Math.random() * chunk.width);
      const y = Math.floor(Math.random() * chunk.height);
      
      if (chunk.tiles[x][y].walkable && 
          (chunk.tiles[x][y].char === TOWN_TILES.ROAD.char || 
           chunk.tiles[x][y].char === TOWN_TILES.PAVEMENT.char)) {
        
        // 检查是否与其他NPC太近（保持间隔）
        const tooClose = chunk.entities.some(e => {
          const dist = Math.abs(e.position.x - x) + Math.abs(e.position.y - y);
          return dist < 5;
        });
        
        if (!tooClose) {
          const npcTypes = ['👴', '👵', '👨', '👩'];  // 老人、老妇、男人、女人
          const npcType = npcTypes[Math.floor(Math.random() * npcTypes.length)];
          
          chunk.entities.push({
            id: `civilian_${chunk.x}_${chunk.y}_${index}`,
            type: EntityType.NPC,
            name: '镇民',
            position: { x, y },
            char: npcType,
            color: '#A0A0A0',
            dialogue: ['今天天气不错。', '你看起来像个冒险者。']
          });
          
          placed = true;
        }
      }
      attempts++;
    }
  }

  /** 加权随机选择 */
  private weightedRandom<T>(items: { type: T; weight: number }[]): T {
    const totalWeight = items.reduce((sum, item) => sum + item.weight, 0);
    let random = Math.random() * totalWeight;
    
    for (const item of items) {
      random -= item.weight;
      if (random <= 0) {
        return item.type;
      }
    }
    
    return items[0].type;
  }

  /** 获取区块 */
  getChunk(x: number, y: number): TownChunk | undefined {
    return this.chunks.get(`${x},${y}`);
  }

  /** 加载区块 */
  loadChunk(x: number, y: number): TownChunk {
    const chunk = this.generateChunk(x, y);
    chunk.loaded = true;
    return chunk;
  }

  /** 卸载区块 */
  unloadChunk(x: number, y: number): void {
    const key = `${x},${y}`;
    const chunk = this.chunks.get(key);
    if (chunk) {
      chunk.loaded = false;
    }
  }

  /** 获取已加载的区块 */
  getLoadedChunks(): TownChunk[] {
    return Array.from(this.chunks.values()).filter(c => c.loaded);
  }
}

export default TownGenerator;
