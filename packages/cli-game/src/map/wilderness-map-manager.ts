/**
 * 野外地图管理器 - 继承 MapManager
 */

import { MapManager, MapPortal } from './map-manager.js';
import { WildernessGenerator, WildernessMap, WildernessConfig, WILDERNESS_TILES } from './wilderness-generator.js';
import { Tile, Point2D, Entity, EntityType } from '../core/types.js';

/** 野外地图管理器 */
export class WildernessMapManager extends MapManager {
  private generator: WildernessGenerator;
  private map: WildernessMap | null = null;
  private entities: Entity[] = [];
  private config: WildernessConfig;

  constructor(config: Partial<WildernessConfig> = {}) {
    super();
    this.config = {
      width: 60,
      height: 30,
      difficulty: 1,
      monsterDensity: 0.02,
      resourceDensity: 0.08,
      ...config
    };
    this.generator = new WildernessGenerator(this.config);
  }

  /** 获取地图宽度 */
  getWidth(): number {
    return this.map?.width ?? this.config.width;
  }

  /** 获取地图高度 */
  getHeight(): number {
    return this.map?.height ?? this.config.height;
  }

  /** 检查坐标是否在地图范围内 */
  isInBounds(x: number, y: number): boolean {
    return x >= 0 && x < this.getWidth() && y >= 0 && y < this.getHeight();
  }

  /** 生成新地图 */
  generate(portalConnections: Array<{ direction: string; targetMapId: string }>): void {
    this.map = this.generator.generateMap(portalConnections);
    this.entities = this.generator.generateMonsters(this.map);
  }

  /** 加载已有地图 */
  loadMap(map: WildernessMap, entities: Entity[] = []): void {
    this.map = map;
    this.entities = [...entities];
  }

  /** 获取原始地图数据（用于存储） */
  getMapData(): WildernessMap | null {
    return this.map;
  }

  /** 获取原始实体数据（用于存储） */
  getEntitiesData(): Entity[] {
    return this.entities;
  }

  /** 更新玩家位置（野外地图不需要动态加载，此方法为空） */
  updatePlayerPosition(_x: number, _y: number): void {
    // 野外地图是固定大小，不需要动态加载
  }

  /** 获取指定位置的瓦片 */
  getTile(x: number, y: number): Tile {
    if (!this.map || !this.isInBounds(x, y)) {
      return WILDERNESS_TILES.ROCK;
    }
    return this.map.tiles[x]?.[y] ?? WILDERNESS_TILES.GRASS;
  }

  /** 设置指定位置的瓦片 */
  setTile(x: number, y: number, tile: Tile): void {
    if (this.map && this.isInBounds(x, y)) {
      this.map.tiles[x][y] = tile;
    }
  }

  /** 检查位置是否可行走 */
  isWalkable(x: number, y: number): boolean {
    return this.getTile(x, y).walkable;
  }

  /** 检查位置是否透明 */
  isTransparent(x: number, y: number): boolean {
    return this.getTile(x, y).transparent;
  }

  /** 获取指定位置的实体 */
  getEntityAt(x: number, y: number): Entity | undefined {
    return this.entities.find(e => 
      e.position.x === x && e.position.y === y
    );
  }

  /** 获取所有实体 */
  getAllEntities(): Entity[] {
    return this.entities;
  }

  /** 添加实体 */
  addEntity(x: number, y: number, entity: Omit<Entity, 'position'>): Entity {
    const fullEntity: Entity = {
      ...entity,
      position: { x, y }
    };
    this.entities.push(fullEntity);
    return fullEntity;
  }

  /** 移除实体 */
  removeEntity(entity: Entity): void {
    const index = this.entities.findIndex(e => e.id === entity.id);
    if (index !== -1) {
      this.entities.splice(index, 1);
    }
  }

  /** 获取视口范围内的所有瓦片（行优先） */
  getViewport(centerX: number, centerY: number, width: number, height: number): Tile[][] {
    const result: Tile[][] = [];
    const halfW = Math.floor(width / 2);
    const halfH = Math.floor(height / 2);
    
    const startX = Math.max(0, Math.min(centerX - halfW, this.getWidth() - width));
    const startY = Math.max(0, Math.min(centerY - halfH, this.getHeight() - height));
    
    for (let y = 0; y < height; y++) {
      result[y] = [];
      for (let x = 0; x < width; x++) {
        const mapX = startX + x;
        const mapY = startY + y;
        result[y][x] = this.getTile(mapX, mapY);
      }
    }
    
    return result;
  }

  /** 寻找安全的出生点 */
  findSpawnPoint(): Point2D {
    // 优先在传送门附近寻找
    if (this.map && this.map.portals.length > 0) {
      const portal = this.map.portals[0];
      // 在传送门周围寻找可行走的位置
      for (let radius = 1; radius <= 3; radius++) {
        for (let dx = -radius; dx <= radius; dx++) {
          for (let dy = -radius; dy <= radius; dy++) {
            const x = portal.x + dx;
            const y = portal.y + dy;
            if (this.isWalkable(x, y)) {
              return { x, y };
            }
          }
        }
      }
    }
    
    // 默认返回中心
    return {
      x: Math.floor(this.getWidth() / 2),
      y: Math.floor(this.getHeight() / 2)
    };
  }

  /** 获取所有传送门 */
  getPortals(): MapPortal[] {
    if (!this.map) return [];
    
    return this.map.portals.map(p => ({
      x: p.x,
      y: p.y,
      targetMapId: p.targetMapId,
      direction: p.direction
    }));
  }

  /** 获取地图难度 */
  getDifficulty(): number {
    return this.config.difficulty;
  }

  /** 获取探索状态 */
  isExplored(x: number, y: number): boolean {
    if (!this.map || !this.isInBounds(x, y)) return false;
    return this.map.explored[x]?.[y] ?? false;
  }

  /** 设置探索状态 */
  setExplored(x: number, y: number, explored: boolean = true): void {
    if (this.map && this.isInBounds(x, y)) {
      this.map.explored[x][y] = explored;
    }
  }

  /** 获取可见状态 */
  isVisible(x: number, y: number): boolean {
    if (!this.map || !this.isInBounds(x, y)) return false;
    return this.map.visible[x]?.[y] ?? false;
  }

  /** 设置可见状态 */
  setVisible(x: number, y: number, visible: boolean = true): void {
    if (this.map && this.isInBounds(x, y)) {
      this.map.visible[x][y] = visible;
    }
  }

  /** 清除所有可见状态 */
  clearVisible(): void {
    if (!this.map) return;
    for (let x = 0; x < this.map.width; x++) {
      for (let y = 0; y < this.map.height; y++) {
        this.map.visible[x][y] = false;
      }
    }
  }
}

export default WildernessMapManager;
