/**
 * 视口/相机系统
 * 提供地图渲染、视口裁剪、相机跟随等功能
 */

import { clearScreen, moveCursorTo } from '../core/terminal';

/**
 * 2D 坐标
 */
export interface Point2D {
  x: number;
  y: number;
}

/**
 * 视口配置
 */
export interface ViewportConfig {
  width: number;
  height: number;
  mapWidth: number;
  mapHeight: number;
}

/**
 * 视口（相机）
 * 管理可见区域，支持跟随目标
 */
export class Viewport {
  private x: number;
  private y: number;
  public readonly width: number;
  public readonly height: number;
  public readonly mapWidth: number;
  public readonly mapHeight: number;

  constructor(config: ViewportConfig) {
    this.width = config.width;
    this.height = config.height;
    this.mapWidth = config.mapWidth;
    this.mapHeight = config.mapHeight;
    this.x = 0;
    this.y = 0;
  }

  /**
   * 设置视口位置
   */
  setPosition(x: number, y: number): void {
    this.x = Math.max(0, Math.min(x, this.mapWidth - this.width));
    this.y = Math.max(0, Math.min(y, this.mapHeight - this.height));
  }

  /**
   * 跟随目标（居中显示）
   */
  follow(targetX: number, targetY: number): void {
    const centerX = targetX - Math.floor(this.width / 2);
    const centerY = targetY - Math.floor(this.height / 2);
    this.setPosition(centerX, centerY);
  }

  /**
   * 平滑跟随目标
   */
  followSmooth(targetX: number, targetY: number, speed: number = 0.1): void {
    const targetViewX = targetX - Math.floor(this.width / 2);
    const targetViewY = targetY - Math.floor(this.height / 2);
    
    const newX = this.x + (targetViewX - this.x) * speed;
    const newY = this.y + (targetViewY - this.y) * speed;
    
    this.setPosition(Math.round(newX), Math.round(newY));
  }

  /**
   * 获取视口在世界坐标中的范围
   */
  getBounds(): { left: number; right: number; top: number; bottom: number } {
    return {
      left: this.x,
      right: Math.min(this.x + this.width, this.mapWidth),
      top: this.y,
      bottom: Math.min(this.y + this.height, this.mapHeight)
    };
  }

  /**
   * 坐标转换：世界坐标 → 屏幕坐标
   */
  worldToScreen(worldX: number, worldY: number): Point2D | null {
    const screenX = worldX - this.x;
    const screenY = worldY - this.y;
    
    if (screenX < 0 || screenX >= this.width || screenY < 0 || screenY >= this.height) {
      return null; // 在视口外
    }
    
    return { x: screenX, y: screenY };
  }

  /**
   * 坐标转换：屏幕坐标 → 世界坐标
   */
  screenToWorld(screenX: number, screenY: number): Point2D {
    return {
      x: this.x + screenX,
      y: this.y + screenY
    };
  }

  /**
   * 检查世界坐标是否在视口内
   */
  isInView(worldX: number, worldY: number): boolean {
    return worldX >= this.x && 
           worldX < this.x + this.width && 
           worldY >= this.y && 
           worldY < this.y + this.height;
  }

  /**
   * 移动视口
   */
  move(dx: number, dy: number): void {
    this.setPosition(this.x + dx, this.y + dy);
  }

  /**
   * 获取当前位置
   */
  getPosition(): Point2D {
    return { x: this.x, y: this.y };
  }
}

/**
 * 瓦片（地图单元格）
 */
export interface Tile {
  char: string;      // 显示字符
  color?: string;    // 颜色代码
  bgColor?: string;  // 背景色
  walkable: boolean; // 是否可行走
  transparent?: boolean; // 是否透明（视野）
  data?: Record<string, unknown>; // 额外数据
}

/**
 * 地图图层
 */
export class TileMap {
  public readonly width: number;
  public readonly height: number;
  private tiles: (Tile | null)[][];
  private entities: Map<string, { x: number; y: number; tile: Tile }>;

  constructor(width: number, height: number, defaultTile?: Tile) {
    this.width = width;
    this.height = height;
    this.tiles = Array(height).fill(null).map(() => Array(width).fill(null));
    this.entities = new Map();

    if (defaultTile) {
      this.fill(defaultTile);
    }
  }

  /**
   * 填充整个地图
   */
  fill(tile: Tile): void {
    for (let y = 0; y < this.height; y++) {
      for (let x = 0; x < this.width; x++) {
        this.tiles[y][x] = { ...tile };
      }
    }
  }

  /**
   * 设置指定位置的瓦片
   */
  setTile(x: number, y: number, tile: Tile | null): boolean {
    if (!this.isInBounds(x, y)) return false;
    this.tiles[y][x] = tile;
    return true;
  }

  /**
   * 获取指定位置的瓦片
   */
  getTile(x: number, y: number): Tile | null {
    if (!this.isInBounds(x, y)) return null;
    return this.tiles[y][x];
  }

  /**
   * 检查坐标是否在地图范围内
   */
  isInBounds(x: number, y: number): boolean {
    return x >= 0 && x < this.width && y >= 0 && y < this.height;
  }

  /**
   * 检查是否可行走
   */
  isWalkable(x: number, y: number): boolean {
    const tile = this.getTile(x, y);
    return tile !== null && tile.walkable;
  }

  /**
   * 添加实体到地图
   */
  addEntity(id: string, x: number, y: number, tile: Tile): boolean {
    if (!this.isInBounds(x, y)) return false;
    this.entities.set(id, { x, y, tile });
    return true;
  }

  /**
   * 移除实体
   */
  removeEntity(id: string): boolean {
    return this.entities.delete(id);
  }

  /**
   * 移动实体
   */
  moveEntity(id: string, newX: number, newY: number): boolean {
    const entity = this.entities.get(id);
    if (!entity) return false;
    if (!this.isInBounds(newX, newY)) return false;
    
    entity.x = newX;
    entity.y = newY;
    return true;
  }

  /**
   * 获取实体位置
   */
  getEntityPosition(id: string): Point2D | null {
    const entity = this.entities.get(id);
    if (!entity) return null;
    return { x: entity.x, y: entity.y };
  }

  /**
   * 获取视口范围内的所有实体
   */
  getEntitiesInView(viewport: Viewport): Array<{ id: string; screenX: number; screenY: number; tile: Tile }> {
    const result = [];
    
    for (const [id, entity] of this.entities) {
      const screenPos = viewport.worldToScreen(entity.x, entity.y);
      if (screenPos) {
        result.push({
          id,
          screenX: screenPos.x,
          screenY: screenPos.y,
          tile: entity.tile
        });
      }
    }
    
    return result;
  }

  /**
   * 从二维数组加载地图
   */
  loadFromArray(tileMap: (Tile | null)[][]): void {
    const height = Math.min(this.height, tileMap.length);
    for (let y = 0; y < height; y++) {
      const row = tileMap[y];
      const width = Math.min(this.width, row.length);
      for (let x = 0; x < width; x++) {
        this.tiles[y][x] = row[x];
      }
    }
  }

  /**
   * 导出为二维数组
   */
  exportToArray(): (Tile | null)[][] {
    return this.tiles.map(row => row.map(tile => tile ? { ...tile } : null));
  }

  /**
   * 获取实体列表
   */
  getEntities(): Map<string, { x: number; y: number; tile: Tile }> {
    return new Map(this.entities);
  }
}

/**
 * 地图渲染器
 */
export class MapRenderer {
  private viewport: Viewport;
  private map: TileMap;

  constructor(viewport: Viewport, map: TileMap) {
    this.viewport = viewport;
    this.map = map;
  }

  /**
   * 渲染地图到缓冲区
   * @returns 字符串数组（每行）
   */
  render(): string[] {
    const bounds = this.viewport.getBounds();
    const lines: string[] = [];

    for (let y = bounds.top; y < bounds.bottom; y++) {
      let line = '';
      for (let x = bounds.left; x < bounds.right; x++) {
        const tile = this.map.getTile(x, y);
        line += tile ? tile.char : ' ';
      }
      lines.push(line);
    }

    return lines;
  }

  /**
   * 渲染地图和实体
   */
  renderWithEntities(): string[] {
    const bounds = this.viewport.getBounds();
    const lines: string[][] = [];

    // 初始化缓冲区
    for (let y = bounds.top; y < bounds.bottom; y++) {
      const row: string[] = [];
      for (let x = bounds.left; x < bounds.right; x++) {
        const tile = this.map.getTile(x, y);
        row.push(tile ? tile.char : ' ');
      }
      lines.push(row);
    }

    // 叠加实体
    const entities = this.map.getEntitiesInView(this.viewport);
    for (const entity of entities) {
      lines[entity.screenY][entity.screenX] = entity.tile.char;
    }

    return lines.map(row => row.join(''));
  }

  /**
   * 获取渲染高度
   */
  getRenderHeight(): number {
    return this.viewport.height;
  }

  /**
   * 获取渲染宽度
   */
  getRenderWidth(): number {
    return this.viewport.width;
  }
}

/**
 * 预定义瓦片类型
 */
export const TILES = {
  /** 空地 - 使用双空格与 emoji 宽度对齐 */
  FLOOR: { char: '  ', walkable: true, transparent: true } as Tile,
  /** 墙壁 - 使用双宽字符 */
  WALL: { char: '██', walkable: false, transparent: false } as Tile,
  /** 水 */
  WATER: { char: '~', walkable: false, transparent: true } as Tile,
  /** 草地 */
  GRASS: { char: '"', walkable: true, transparent: true } as Tile,
  /** 树木 */
  TREE: { char: '♣', walkable: false, transparent: false } as Tile,
  /** 门 */
  DOOR: { char: '+', walkable: true, transparent: false } as Tile,
  /** 楼梯上 */
  STAIRS_UP: { char: '<', walkable: true, transparent: true } as Tile,
  /** 楼梯下 */
  STAIRS_DOWN: { char: '>', walkable: true, transparent: true } as Tile,
  /** 玩家 */
  PLAYER: { char: '@', walkable: false, transparent: true } as Tile,
  /** NPC */
  NPC: { char: '&', walkable: false, transparent: true } as Tile,
  /** 敌人 */
  ENEMY: { char: 'E', walkable: false, transparent: true } as Tile,
  /** 宝箱 */
  CHEST: { char: '□', walkable: false, transparent: true } as Tile,
  /** 物品 */
  ITEM: { char: '✦', walkable: true, transparent: true } as Tile
} as const;

/**
 * 生成简单房间地图
 */
export function generateRoomMap(
  width: number,
  height: number,
  roomCount: number = 5
): TileMap {
  const map = new TileMap(width, height, TILES.WALL);
  
  // 简单算法：随机放置房间并连接
  const rooms: Array<{ x: number; y: number; w: number; h: number }> = [];
  
  for (let i = 0; i < roomCount; i++) {
    const w = 4 + Math.floor(Math.random() * 6);
    const h = 3 + Math.floor(Math.random() * 5);
    const x = 1 + Math.floor(Math.random() * (width - w - 2));
    const y = 1 + Math.floor(Math.random() * (height - h - 2));
    
    // 挖房间
    for (let ry = y; ry < y + h; ry++) {
      for (let rx = x; rx < x + w; rx++) {
        map.setTile(rx, ry, TILES.FLOOR);
      }
    }
    
    // 连接上一个房间
    if (rooms.length > 0) {
      const prev = rooms[rooms.length - 1];
      const prevCenterX = Math.floor(prev.x + prev.w / 2);
      const prevCenterY = Math.floor(prev.y + prev.h / 2);
      const currCenterX = Math.floor(x + w / 2);
      const currCenterY = Math.floor(y + h / 2);
      
      // 水平走廊
      const startX = Math.min(prevCenterX, currCenterX);
      const endX = Math.max(prevCenterX, currCenterX);
      for (let cx = startX; cx <= endX; cx++) {
        map.setTile(cx, prevCenterY, TILES.FLOOR);
      }
      
      // 垂直走廊
      const startY = Math.min(prevCenterY, currCenterY);
      const endY = Math.max(prevCenterY, currCenterY);
      for (let cy = startY; cy <= endY; cy++) {
        map.setTile(currCenterX, cy, TILES.FLOOR);
      }
    }
    
    rooms.push({ x, y, w, h });
  }
  
  return map;
}
