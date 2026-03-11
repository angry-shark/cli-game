/**
 * 野外地图生成器
 * 生成包含资源点和野怪的野外地图
 */

import * as ROT from 'rot-js';
import { Tile, GameMap, Entity, EntityType, Point2D } from './types.js';

/** 野外瓦片定义 - 类似城镇的方块地面 */
export const WILDERNESS_TILES = {
  // 地形 - 使用双字符方块（与城镇一致）
  GRASS: { char: '░░', color: '#2d5016', bgColor: '#1a2f0a', walkable: true, transparent: true },
  ROAD: { char: '▓▓', color: '#8B7355', bgColor: '#5a4a3a', walkable: true, transparent: true },
  
  // 障碍
  TREE: { char: '🌲', color: '#228B22', bgColor: '#1a2f0a', walkable: false, transparent: true },
  ROCK: { char: '🪨', color: '#808080', bgColor: '#404040', walkable: false, transparent: true },
  
  // 资源
  HERB: { char: '🌿', color: '#32CD32', bgColor: '#1a2f0a', walkable: true, transparent: true },
  ORE: { char: '⛏️', color: '#A0A0A0', bgColor: '#404040', walkable: false, transparent: true },
  
  // 特殊 - 明显的传送门
  PORTAL: { char: '🔮', color: '#FF00FF', bgColor: '#4B0082', walkable: true, transparent: true },
};

/** 野怪模板 - 使用emoji */
interface MonsterTemplate {
  name: string;
  char: string;
  color: string;
  hp: number;
  attack: number;
  defense: number;
}

const MONSTER_TEMPLATES: Record<string, MonsterTemplate> = {
  'wolf': { name: '野狼', char: '🐺', color: '#A0A0A0', hp: 20, attack: 5, defense: 1 },
  'bear': { name: '棕熊', char: '🐻', color: '#8B4513', hp: 40, attack: 8, defense: 3 },
  'bandit': { name: '强盗', char: '🦹', color: '#800080', hp: 25, attack: 6, defense: 2 },
  'goblin_scout': { name: '哥布林侦察兵', char: '👺', color: '#228B22', hp: 15, attack: 4, defense: 0 },
  'snake': { name: '毒蛇', char: '🐍', color: '#556B2F', hp: 12, attack: 5, defense: 0 },
  'spider': { name: '大蜘蛛', char: '🕷️', color: '#4B0082', hp: 18, attack: 6, defense: 1 },
};

/** 野外地图配置 */
export interface WildernessConfig {
  width: number;
  height: number;
  difficulty: number;
  monsterDensity: number;
  resourceDensity: number;
}

const DEFAULT_WILDERNESS_CONFIG: WildernessConfig = {
  width: 60,
  height: 30,
  difficulty: 1,
  monsterDensity: 0.05,
  resourceDensity: 0.08
};

/** 野外地图数据 */
export interface WildernessMap extends GameMap {
  portals: Array<{ x: number; y: number; targetMapId: string; direction: string }>;
}

/** 野外地图生成器 */
export class WildernessGenerator {
  private config: WildernessConfig;

  constructor(config: Partial<WildernessConfig> = {}) {
    this.config = { ...DEFAULT_WILDERNESS_CONFIG, ...config };
  }

  /** 生成野外地图 */
  generateMap(portals: Array<{ direction: string; targetMapId: string }>): WildernessMap {
    const { width, height } = this.config;
    
    const map: WildernessMap = {
      width,
      height,
      tiles: [],
      explored: [],
      visible: [],
      portals: []
    };

    // 初始化地图
    for (let x = 0; x < width; x++) {
      map.tiles[x] = [];
      map.explored[x] = [];
      map.visible[x] = [];
      for (let y = 0; y < height; y++) {
        map.tiles[x][y] = WILDERNESS_TILES.GRASS;
        map.explored[x][y] = false;
        map.visible[x][y] = false;
      }
    }

    // 使用ROT.js的噪声生成器创建地形
    this.generateTerrain(map);
    
    // 生成道路（连接各个传送门）
    this.generateRoads(map, portals);
    
    // 放置传送门
    this.placePortals(map, portals);
    
    // 生成资源点
    this.generateResources(map);
    
    // 生成野怪
    this.generateMonsters(map);
    
    // 添加一些装饰
    this.generateDecorations(map);

    return map;
  }

  /** 生成地形 */
  private generateTerrain(map: WildernessMap): void {
    // 使用Simplex噪声生成地形
    const noise = new ROT.Noise.Simplex();
    
    for (let x = 0; x < map.width; x++) {
      for (let y = 0; y < map.height; y++) {
        const value = noise.get(x / 10, y / 10);
        
        if (value > 0.6) {
          // 高地/岩石
          map.tiles[x][y] = WILDERNESS_TILES.ROCK;
        }
      }
    }
  }

  /** 生成道路 - 确保传送门之间连通 */
  private generateRoads(map: WildernessMap, portals: Array<{ direction: string; targetMapId: string }>): void {
    // 计算传送门位置
    const portalPositions = this.calculatePortalPositions(map.width, map.height, portals.length);
    
    // 使用A*算法连接所有传送门
    for (let i = 0; i < portalPositions.length - 1; i++) {
      const start = portalPositions[i];
      const end = portalPositions[i + 1];
      this.createPath(map, start, end);
    }
    
    // 连接第一个和最后一个（形成环路）
    if (portalPositions.length > 2) {
      this.createPath(map, portalPositions[portalPositions.length - 1], portalPositions[0]);
    }
  }

  /** 计算传送门位置 */
  private calculatePortalPositions(width: number, height: number, count: number): Point2D[] {
    const positions: Point2D[] = [];
    
    // 标准位置：北、南、东、西
    const standardPositions = [
      { x: Math.floor(width / 2), y: 1 },           // 北
      { x: Math.floor(width / 2), y: height - 2 },  // 南
      { x: width - 2, y: Math.floor(height / 2) },  // 东
      { x: 1, y: Math.floor(height / 2) },          // 西
    ];
    
    for (let i = 0; i < count && i < standardPositions.length; i++) {
      positions.push(standardPositions[i]);
    }
    
    return positions;
  }

  /** 创建路径 */
  private createPath(map: WildernessMap, start: Point2D, end: Point2D): void {
    // 简单的直线路径，避开障碍物
    const dx = Math.sign(end.x - start.x);
    const dy = Math.sign(end.y - start.y);
    
    let x = start.x;
    let y = start.y;
    
    while (x !== end.x || y !== end.y) {
      if (map.tiles[x][y].walkable || map.tiles[x][y].char === '🪨') {
        map.tiles[x][y] = WILDERNESS_TILES.ROAD;
      }
      
      if (x !== end.x) x += dx;
      else if (y !== end.y) y += dy;
      
      // 防止无限循环
      if (Math.abs(x - start.x) > map.width && Math.abs(y - start.y) > map.height) break;
    }
  }

  /** 放置传送门 */
  private placePortals(map: WildernessMap, portals: Array<{ direction: string; targetMapId: string }>): void {
    const positions = this.calculatePortalPositions(map.width, map.height, portals.length);
    
    for (let i = 0; i < portals.length && i < positions.length; i++) {
      const pos = positions[i];
      const portal = portals[i];
      
      // 清除传送门周围
      for (let dx = -1; dx <= 1; dx++) {
        for (let dy = -1; dy <= 1; dy++) {
          const nx = pos.x + dx;
          const ny = pos.y + dy;
          if (nx >= 0 && nx < map.width && ny >= 0 && ny < map.height) {
            map.tiles[nx][ny] = WILDERNESS_TILES.ROAD;
          }
        }
      }
      
      // 放置传送门
      map.tiles[pos.x][pos.y] = WILDERNESS_TILES.PORTAL;
      map.portals.push({
        x: pos.x,
        y: pos.y,
        targetMapId: portal.targetMapId,
        direction: portal.direction
      });
    }
  }

  /** 生成资源点 */
  private generateResources(map: WildernessMap): void {
    const numResources = Math.floor(map.width * map.height * this.config.resourceDensity);
    
    for (let i = 0; i < numResources; i++) {
      const x = Math.floor(Math.random() * map.width);
      const y = Math.floor(Math.random() * map.height);
      
      if (map.tiles[x][y].walkable && map.tiles[x][y].char === '░░') {
        const resourceType = Math.random();
        if (resourceType < 0.6) {
          map.tiles[x][y] = WILDERNESS_TILES.HERB;
        } else {
          map.tiles[x][y] = WILDERNESS_TILES.ORE;
        }
      }
    }
  }

  /** 生成野怪 */
  generateMonsters(map: WildernessMap): Entity[] {
    const monsters: Entity[] = [];
    const numMonsters = Math.floor(map.width * map.height * this.config.monsterDensity);
    
    const monsterKeys = Object.keys(MONSTER_TEMPLATES);
    
    for (let i = 0; i < numMonsters; i++) {
      let placed = false;
      let attempts = 0;
      
      while (!placed && attempts < 10) {
        const x = Math.floor(Math.random() * map.width);
        const y = Math.floor(Math.random() * map.height);
        
        // 确保位置可行走且不是资源或传送门
        if (map.tiles[x][y].walkable && 
            map.tiles[x][y].char !== '🔮' &&
            map.tiles[x][y].char !== '🌿' &&
            map.tiles[x][y].char !== '⛏️') {
          
          const key = monsterKeys[Math.floor(Math.random() * monsterKeys.length)];
          const template = MONSTER_TEMPLATES[key];
          
          monsters.push({
            id: `monster_${i}_${x}_${y}`,
            type: EntityType.ENEMY,
            name: template.name,
            position: { x, y },
            char: template.char,
            color: template.color,
            hp: template.hp + (this.config.difficulty * 5),
            maxHp: template.hp + (this.config.difficulty * 5),
            attack: template.attack + this.config.difficulty,
            defense: template.defense,
            isHostile: true,
            buffs: []
          });
          
          placed = true;
        }
        attempts++;
      }
    }
    
    return monsters;
  }

  /** 生成装饰 */
  private generateDecorations(map: WildernessMap): void {
    // 添加树木和灌木
    for (let x = 0; x < map.width; x++) {
      for (let y = 0; y < map.height; y++) {
        // 降低树木密度（0.03 = 3%概率）
        if (map.tiles[x][y].char === '░░' && Math.random() < 0.03) {
          map.tiles[x][y] = WILDERNESS_TILES.TREE;
        }
      }
    }
  }

  /** 获取地图难度 */
  getDifficulty(): number {
    return this.config.difficulty;
  }
}

export default WildernessGenerator;
