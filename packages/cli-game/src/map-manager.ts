/**
 * 地图管理器抽象基类
 * 定义所有地图类型的通用接口
 */

import { Tile, Point2D, Entity } from './types.js';

/** 视口配置 */
export interface ViewportConfig {
  width: number;
  height: number;
}

/** 地图传送门 */
export interface MapPortal {
  x: number;
  y: number;
  targetMapId: string;
  direction: string;
  label?: string;
}

/** 地图管理器抽象基类 */
export abstract class MapManager {
  /** 获取地图宽度 */
  abstract getWidth(): number;

  /** 获取地图高度 */
  abstract getHeight(): number;

  /** 获取指定位置的瓦片 */
  abstract getTile(x: number, y: number): Tile;

  /** 检查位置是否可行走 */
  abstract isWalkable(x: number, y: number): boolean;

  /** 检查位置是否透明 */
  abstract isTransparent(x: number, y: number): boolean;

  /** 检查坐标是否在地图范围内 */
  abstract isInBounds(x: number, y: number): boolean;

  /** 获取所有实体 */
  abstract getAllEntities(): Entity[];

  /** 获取指定位置的实体 */
  abstract getEntityAt(x: number, y: number): Entity | undefined;

  /** 添加实体 */
  abstract addEntity(x: number, y: number, entity: Omit<Entity, 'position'>): Entity;

  /** 移除实体 */
  abstract removeEntity(entity: Entity): void;

  /** 更新玩家位置（用于动态加载等） */
  abstract updatePlayerPosition(x: number, y: number): void;

  /** 获取视口范围内的瓦片 */
  abstract getViewport(centerX: number, centerY: number, width: number, height: number): Tile[][];

  /** 寻找安全的出生点 */
  abstract findSpawnPoint(): Point2D;

  /** 获取所有传送门 */
  abstract getPortals(): MapPortal[];

  /** 获取指定位置的传送门 */
  getPortalAt(x: number, y: number): MapPortal | undefined {
    return this.getPortals().find(p => p.x === x && p.y === y);
  }

  /** 获取传送门旁边的安全位置（面向地图中心） */
  getEntryPosition(portal: MapPortal): Point2D {
    let offsetX = 0, offsetY = 0;
    switch (portal.direction) {
      case 'north':
        offsetY = 2;
        break;
      case 'south':
        offsetY = -2;
        break;
      case 'east':
        offsetX = -2;
        break;
      case 'west':
        offsetX = 2;
        break;
    }
    return {
      x: Math.max(1, Math.min(this.getWidth() - 2, portal.x + offsetX)),
      y: Math.max(1, Math.min(this.getHeight() - 2, portal.y + offsetY))
    };
  }
}
