/**
 * 城镇地图管理器 - 继承 MapManager
 */

import { MapManager, MapPortal } from './map-manager.js';
import { TownGenerator, TownChunk, Building, TOWN_TILES } from './town-generator.js';
import { Tile, Point2D, Entity } from '../core/types.js';

/** 坐标转换工具函数 */
export function worldToChunk(worldX: number, worldY: number, chunkSize: number): Point2D {
  return {
    x: Math.floor(worldX / chunkSize),
    y: Math.floor(worldY / chunkSize)
  };
}

export function worldToLocal(worldX: number, worldY: number, chunkSize: number): Point2D {
  let x = worldX % chunkSize;
  let y = worldY % chunkSize;
  if (x < 0) x += chunkSize;
  if (y < 0) y += chunkSize;
  return { x, y };
}

export function localToWorld(chunkX: number, chunkY: number, localX: number, localY: number, chunkSize: number): Point2D {
  return {
    x: chunkX * chunkSize + localX,
    y: chunkY * chunkSize + localY
  };
}

/** 城镇地图管理器 */
export class TownMapManager extends MapManager {
  private generator: TownGenerator;
  private loadedChunks: Map<string, TownChunk> = new Map();
  private renderDistance: number = 1;
  private chunkSize: number;
  
  // 玩家位置追踪
  private playerChunkX: number = 0;
  private playerChunkY: number = 0;

  constructor(chunkSize: number = 26) {
    super();
    this.chunkSize = chunkSize;
    this.generator = new TownGenerator({ chunkSize });
  }

  /** 获取地图宽度（3x3 区块） */
  getWidth(): number {
    return this.chunkSize * 3;
  }

  /** 获取地图高度（3x3 区块） */
  getHeight(): number {
    return this.chunkSize * 3;
  }

  /** 检查坐标是否在地图范围内 */
  isInBounds(x: number, y: number): boolean {
    return x >= 0 && x < this.getWidth() && y >= 0 && y < this.getHeight();
  }

  /** 初始化并加载初始区块 */
  initialize(startX: number = 0, startY: number = 0): void {
    const chunkPos = worldToChunk(startX, startY, this.chunkSize);
    this.playerChunkX = chunkPos.x;
    this.playerChunkY = chunkPos.y;
    this.updateLoadedChunks();
  }

  /** 更新玩家位置并管理区块加载 */
  updatePlayerPosition(worldX: number, worldY: number): void {
    const chunkPos = worldToChunk(worldX, worldY, this.chunkSize);
    
    if (chunkPos.x !== this.playerChunkX || chunkPos.y !== this.playerChunkY) {
      this.playerChunkX = chunkPos.x;
      this.playerChunkY = chunkPos.y;
      this.updateLoadedChunks();
    }
  }

  /** 更新加载的区块 */
  private updateLoadedChunks(): void {
    const newLoaded = new Set<string>();
    
    for (let dx = -this.renderDistance; dx <= this.renderDistance; dx++) {
      for (let dy = -this.renderDistance; dy <= this.renderDistance; dy++) {
        const cx = this.playerChunkX + dx;
        const cy = this.playerChunkY + dy;
        const key = `${cx},${cy}`;
        newLoaded.add(key);
        
        if (!this.loadedChunks.has(key)) {
          const chunk = this.generator.loadChunk(cx, cy);
          this.loadedChunks.set(key, chunk);
        }
      }
    }
    
    // 卸载不需要的区块
    for (const [key, chunk] of this.loadedChunks) {
      if (!newLoaded.has(key)) {
        this.generator.unloadChunk(chunk.x, chunk.y);
        this.loadedChunks.delete(key);
      }
    }
  }

  /** 获取指定位置的瓦片 */
  getTile(x: number, y: number): Tile {
    const chunkPos = worldToChunk(x, y, this.chunkSize);
    const localPos = worldToLocal(x, y, this.chunkSize);
    const key = `${chunkPos.x},${chunkPos.y}`;
    
    const chunk = this.loadedChunks.get(key);
    if (!chunk) {
      return TOWN_TILES.GRASS;
    }
    
    return chunk.tiles[localPos.x]?.[localPos.y] ?? TOWN_TILES.GRASS;
  }

  /** 设置指定位置的瓦片 */
  setTile(x: number, y: number, tile: Tile): void {
    const chunkPos = worldToChunk(x, y, this.chunkSize);
    const localPos = worldToLocal(x, y, this.chunkSize);
    const key = `${chunkPos.x},${chunkPos.y}`;
    
    const chunk = this.loadedChunks.get(key);
    if (chunk && chunk.tiles[localPos.x]?.[localPos.y]) {
      chunk.tiles[localPos.x][localPos.y] = tile;
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

  /** 获取指定位置的建筑 */
  getBuildingAt(x: number, y: number): Building | undefined {
    const chunkPos = worldToChunk(x, y, this.chunkSize);
    const localPos = worldToLocal(x, y, this.chunkSize);
    const key = `${chunkPos.x},${chunkPos.y}`;
    
    const chunk = this.loadedChunks.get(key);
    if (!chunk) return undefined;
    
    return chunk.buildings.find(b => 
      localPos.x >= b.x && localPos.x < b.x + b.width &&
      localPos.y >= b.y && localPos.y < b.y + b.height
    );
  }

  /** 获取指定位置的实体 */
  getEntityAt(x: number, y: number): Entity | undefined {
    const chunkPos = worldToChunk(x, y, this.chunkSize);
    const localPos = worldToLocal(x, y, this.chunkSize);
    const key = `${chunkPos.x},${chunkPos.y}`;
    
    const chunk = this.loadedChunks.get(key);
    if (!chunk) return undefined;
    
    return chunk.entities.find(e => 
      e.position.x === localPos.x && e.position.y === localPos.y
    );
  }

  /** 获取所有已加载区块的实体 */
  getAllEntities(): Entity[] {
    const entities: Entity[] = [];
    for (const chunk of this.loadedChunks.values()) {
      // 转换实体位置为世界坐标
      for (const entity of chunk.entities) {
        const worldPos = localToWorld(chunk.x, chunk.y, entity.position.x, entity.position.y, this.chunkSize);
        // 创建新实体，位置使用世界坐标
        entities.push({
          ...entity,
          position: worldPos
        });
      }
    }
    return entities;
  }

  /** 移除实体 */
  removeEntity(entity: Entity): void {
    const chunkPos = worldToChunk(entity.position.x, entity.position.y, this.chunkSize);
    const key = `${chunkPos.x},${chunkPos.y}`;
    
    const chunk = this.loadedChunks.get(key);
    if (chunk) {
      const index = chunk.entities.findIndex(e => e.id === entity.id);
      if (index !== -1) {
        chunk.entities.splice(index, 1);
      }
    }
  }

  /** 添加实体 */
  addEntity(x: number, y: number, entity: Omit<Entity, 'position'>): Entity {
    const chunkPos = worldToChunk(x, y, this.chunkSize);
    const localPos = worldToLocal(x, y, this.chunkSize);
    const key = `${chunkPos.x},${chunkPos.y}`;
    
    const chunk = this.loadedChunks.get(key);
    if (!chunk) {
      throw new Error(`Cannot add entity to unloaded chunk ${key}`);
    }
    
    const fullEntity: Entity = {
      ...entity,
      position: localPos
    };
    
    chunk.entities.push(fullEntity);
    return fullEntity;
  }

  /** 获取视口范围内的所有瓦片（行优先） */
  getViewport(centerX: number, centerY: number, width: number, height: number): Tile[][] {
    const result: Tile[][] = [];
    const halfW = Math.floor(width / 2);
    const halfH = Math.floor(height / 2);
    
    for (let y = 0; y < height; y++) {
      result[y] = [];
      for (let x = 0; x < width; x++) {
        const worldX = centerX - halfW + x;
        const worldY = centerY - halfH + y;
        result[y][x] = this.getTile(worldX, worldY);
      }
    }
    
    return result;
  }

  /** 寻找安全的出生点 */
  findSpawnPoint(): Point2D {
    const centerX = Math.floor(this.chunkSize / 2);
    const centerY = Math.floor(this.chunkSize / 2);
    
    const initialChunk = this.generator.getChunk(0, 0) || this.generator.generateChunk(0, 0);
    
    for (let radius = 0; radius < this.chunkSize / 2; radius++) {
      for (let dx = -radius; dx <= radius; dx++) {
        for (let dy = -radius; dy <= radius; dy++) {
          const x = centerX + dx;
          const y = centerY + dy;
          
          if (x >= 0 && x < this.chunkSize && y >= 0 && y < this.chunkSize) {
            const tile = initialChunk.tiles[x][y];
            if (tile.walkable && tile.char !== '🚪') {
              return { x, y };
            }
          }
        }
      }
    }
    
    return { x: centerX, y: centerY };
  }

  /** 获取所有传送门（城门） */
  getPortals(): MapPortal[] {
    const portals: MapPortal[] = [];
    const totalSize = this.chunkSize * 3;
    const center = Math.floor(this.chunkSize / 2);
    
    // 北门
    portals.push({
      x: this.chunkSize + center,
      y: 1,
      targetMapId: '', // 由 world-map 设置
      direction: 'north'
    });
    
    // 南门
    portals.push({
      x: this.chunkSize + center,
      y: totalSize - 2,
      targetMapId: '',
      direction: 'south'
    });
    
    // 西门
    portals.push({
      x: 1,
      y: this.chunkSize + center,
      targetMapId: '',
      direction: 'west'
    });
    
    // 东门
    portals.push({
      x: totalSize - 2,
      y: this.chunkSize + center,
      targetMapId: '',
      direction: 'east'
    });
    
    return portals;
  }

  /** 获取已加载的区块数量 */
  getLoadedChunkCount(): number {
    return this.loadedChunks.size;
  }

  /** 获取当前区块信息 */
  getCurrentChunkInfo(): { x: number; y: number; loaded: number } {
    return {
      x: this.playerChunkX,
      y: this.playerChunkY,
      loaded: this.loadedChunks.size
    };
  }

  /** 获取区域名称 */
  getAreaName(x: number, y: number): string {
    const chunkPos = worldToChunk(x, y, this.chunkSize);
    
    const names = [
      '中央广场', '贸易区', '住宅区', '工业区', '港口区', '农田区', '贵族区', '贫民窟'
    ];
    
    const index = Math.abs((chunkPos.x * 7 + chunkPos.y * 13) % names.length);
    return names[index];
  }

  /** 获取区块大小 */
  getChunkSize(): number {
    return this.chunkSize;
  }

  /** 获取生成器 */
  getGenerator(): TownGenerator {
    return this.generator;
  }
}

export default TownMapManager;
