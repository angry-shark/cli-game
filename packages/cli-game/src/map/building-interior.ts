/**
 * 建筑内部系统
 * 管理可进入的建筑和室内场景
 */

import { Tile, Entity, EntityType, Point2D } from '../core/types.js';
import { TOWN_TILES, Building, BuildingType } from './town-generator.js';

/** 建筑内部布局 */
export interface BuildingInterior {
  buildingId: string;
  width: number;
  height: number;
  tiles: Tile[][];
  entities: Entity[];
  npcs: Entity[];
  entered: boolean;
}

/** 室内瓦片 - emoji + 空格 */
export const INTERIOR_TILES = {
  FLOOR: { char: '🟫', color: '#8B7355', bgColor: '#3d3220', walkable: true, transparent: true },
  WALL: { char: '🟫', color: '#5c4033', bgColor: '#3d2714', walkable: false, transparent: false },
  COUNTER: { char: '🪵', color: '#8B4513', bgColor: '#5c2e0c', walkable: false, transparent: true },
  DOOR: { char: '🚪', color: '#8B4513', bgColor: '#3d3220', walkable: true, transparent: true },
  TABLE: { char: '🪑', color: '#8B4513', bgColor: '#3d3220', walkable: false, transparent: true },
  CHAIR: { char: '🪑', color: '#A0522D', bgColor: '#3d3220', walkable: true, transparent: true },
  BED: { char: '🛏️', color: '#4682B4', bgColor: '#3d3220', walkable: false, transparent: true },
  CHEST: { char: '📦', color: '#FFD700', bgColor: '#3d3220', walkable: false, transparent: true },
  FIREPLACE: { char: '🔥', color: '#FF4500', bgColor: '#3d3220', walkable: false, transparent: true },
  SHELF: { char: '📚', color: '#8B4513', bgColor: '#5c2e0c', walkable: false, transparent: true },
};

/** 建筑内部生成器 */
export class InteriorManager {
  private interiors: Map<string, BuildingInterior> = new Map();

  /** 获取或生成建筑内部 */
  getInterior(building: Building): BuildingInterior {
    const key = building.id;
    
    if (this.interiors.has(key)) {
      return this.interiors.get(key)!;
    }

    const interior = this.generateInterior(building);
    this.interiors.set(key, interior);
    return interior;
  }

  /** 生成建筑内部 */
  private generateInterior(building: Building): BuildingInterior {
    const width = building.width - 2; // 内部宽度（不含墙壁）
    const height = building.height - 2; // 内部高度
    
    const interior: BuildingInterior = {
      buildingId: building.id,
      width,
      height,
      tiles: [],
      entities: [],
      npcs: [],
      entered: false
    };

    // 初始化地板
    for (let x = 0; x < width; x++) {
      interior.tiles[x] = [];
      for (let y = 0; y < height; y++) {
        interior.tiles[x][y] = INTERIOR_TILES.FLOOR;
      }
    }

      // 设置出口门（在底部中央，更明显）
    const doorX = Math.floor(width / 2);
    const doorY = height - 1;
    interior.tiles[doorX][doorY] = {
      ...INTERIOR_TILES.DOOR,
      char: '🚪',  // 门
      color: '#FF6347',  // 红色更醒目
      bgColor: '#8B4513'
    };
    
    // 在门两侧添加箭头指示
    if (doorX > 0) {
      interior.tiles[doorX - 1][doorY] = {
        ...INTERIOR_TILES.FLOOR,
        char: '⬅️',
        color: '#FFD700'
      };
    }
    if (doorX < width - 1) {
      interior.tiles[doorX + 1][doorY] = {
        ...INTERIOR_TILES.FLOOR,
        char: '➡️',
        color: '#FFD700'
      };
    }

    // 根据建筑类型布置内部
    switch (building.type) {
      case BuildingType.SHOP:
        this.generateShopInterior(interior, width, height);
        break;
      case BuildingType.INN:
        this.generateInnInterior(interior, width, height);
        break;
      case BuildingType.BLACKSMITH:
        this.generateBlacksmithInterior(interior, width, height);
        break;
      case BuildingType.TEMPLE:
        this.generateTempleInterior(interior, width, height);
        break;
      default:
        this.generateHouseInterior(interior, width, height);
        break;
    }

    // 放置NPC
    this.placeInteriorNPC(interior, building);

    return interior;
  }

  /** 生成商店内部 */
  private generateShopInterior(interior: BuildingInterior, width: number, height: number): void {
    const doorX = Math.floor(width / 2);
    const doorY = height - 1;
    
    // 柜台沿墙放置（避开门口正上方）
    for (let x = 1; x < width - 1; x++) {
      if (x !== doorX) {  // 避开门口正上方
        interior.tiles[x][1] = INTERIOR_TILES.COUNTER;
      }
    }
    
    // 货架（避开门口区域）
    for (let y = 3; y < height - 2; y += 2) {  // height - 2 避开门口所在行
      for (let x = 0; x < width; x += 2) {
        if (interior.tiles[x][y].walkable) {
          interior.tiles[x][y] = INTERIOR_TILES.SHELF;
        }
      }
    }
  }

  /** 生成旅馆内部 */
  private generateInnInterior(interior: BuildingInterior, width: number, height: number): void {
    const doorX = Math.floor(width / 2);
    
    // 吧台（避开门口正上方）
    for (let x = 1; x < width - 1; x++) {
      if (x !== doorX) {
        interior.tiles[x][1] = INTERIOR_TILES.COUNTER;
      }
    }
    
    // 桌椅（避开门口区域）
    for (let y = 3; y < height - 2; y += 2) {  // height - 2 避开门口
      for (let x = 1; x < width - 1; x += 3) {
        interior.tiles[x][y] = INTERIOR_TILES.TABLE;
        if (x + 1 < width - 1 && interior.tiles[x + 1][y].walkable) {
          interior.tiles[x + 1][y] = INTERIOR_TILES.CHAIR;
        }
      }
    }
    
    // 壁炉（放在左侧或右侧，避开门口）
    const fireplaceX = doorX > width / 2 ? 1 : width - 2;
    interior.tiles[fireplaceX][height - 2] = INTERIOR_TILES.FIREPLACE;
  }

  /** 生成铁匠铺内部 */
  private generateBlacksmithInterior(interior: BuildingInterior, width: number, height: number): void {
    const doorX = Math.floor(width / 2);
    
    // 工作台/铁砧区域（避开门口正上方）
    for (let x = 1; x < width - 1; x++) {
      if (x !== doorX) {
        interior.tiles[x][1] = INTERIOR_TILES.COUNTER;
      }
    }
    
    // 工具和材料堆
    interior.tiles[1][3] = INTERIOR_TILES.CHEST;
    interior.tiles[width - 2][3] = INTERIOR_TILES.CHEST;
    
    // 熔炉/壁炉（避开门口）
    const furnaceX = doorX > width / 2 ? 2 : width - 3;
    interior.tiles[furnaceX][height - 2] = INTERIOR_TILES.FIREPLACE;
  }

  /** 生成神殿内部 */
  private generateTempleInterior(interior: BuildingInterior, width: number, height: number): void {
    const doorX = Math.floor(width / 2);
    
    // 祭坛（避开门口正上方）
    const altarX = doorX > width / 2 ? doorX - 1 : doorX + 1;
    interior.tiles[altarX][2] = INTERIOR_TILES.TABLE;
    
    // 长椅（避开门口区域）
    for (let y = 4; y < height - 2; y += 2) {  // height - 2 避开门口
      for (let x = 1; x < width - 1; x += 2) {
        interior.tiles[x][y] = INTERIOR_TILES.CHAIR;
      }
    }
    
    // 圣火（放在祭坛后方）
    interior.tiles[altarX][height - 3] = INTERIOR_TILES.FIREPLACE;
  }

  /** 生成普通房屋内部 */
  private generateHouseInterior(interior: BuildingInterior, width: number, height: number): void {
    // 桌子
    interior.tiles[Math.floor(width / 2)][Math.floor(height / 2)] = INTERIOR_TILES.TABLE;
    
    // 椅子
    interior.tiles[Math.floor(width / 2) + 1][Math.floor(height / 2)] = INTERIOR_TILES.CHAIR;
    
    // 床
    interior.tiles[1][height - 2] = INTERIOR_TILES.BED;
    
    // 箱子
    if (Math.random() < 0.3) {
      interior.tiles[width - 2][height - 2] = INTERIOR_TILES.CHEST;
    }
  }

  /** 在室内放置NPC */
  private placeInteriorNPC(interior: BuildingInterior, building: Building): void {
    const { width, height } = interior;
    
    // 根据建筑类型确定NPC
    let npcData: { char: string; name: string; dialogue: string[] } | null = null;
    
    switch (building.type) {
      case BuildingType.SHOP:
        npcData = {
          char: '👲',  // 商人
          name: '店主',
          dialogue: ['欢迎光临！随便看看。', '这些商品都是上等货。', '需要买点什么吗？']
        };
        break;
      case BuildingType.INN:
        npcData = {
          char: '🧑‍🍳',  // 厨师
          name: '旅馆老板',
          dialogue: ['住店吗？一晚10金币。', '要来点什么吃的？', '楼上有空房间。']
        };
        break;
      case BuildingType.BLACKSMITH:
        npcData = {
          char: '👨‍🏭',  // 工人
          name: '铁匠',
          dialogue: ['需要打造装备？', '我的铁器是最好的。', '有矿石要卖吗？']
        };
        break;
      case BuildingType.TEMPLE:
        npcData = {
          char: '👳',  // 头巾
          name: '祭司',
          dialogue: ['愿神灵保佑你。', '需要治疗吗？', '神殿永远欢迎信徒。']
        };
        break;
      case BuildingType.HOUSE:
        // 普通民居50%概率有NPC
        if (Math.random() < 0.5) {
          const residents = [
            { char: '👴', name: '老人', dialogue: ['欢迎来我家做客。', '年纪大了，就喜欢安静。'] },
            { char: '👵', name: '老妇', dialogue: ['要喝杯茶吗？', '年轻人真有精神。'] },
            { char: '👨', name: '居民', dialogue: ['有事吗？', '我家没什么特别的。'] },
            { char: '👩', name: '居民', dialogue: ['你好，冒险者。', '附近最近不太平。'] }
          ];
          npcData = residents[Math.floor(Math.random() * residents.length)];
        }
        break;
    }
    
    if (npcData) {
      // 寻找合适的位置（柜台后面或房间中央）
      let x = Math.floor(width / 2);
      let y = 2;
      
      // 寻找柜台后面的位置
      if (building.type === BuildingType.SHOP || building.type === BuildingType.INN) {
        for (let i = 1; i < width - 1; i++) {
          if (!interior.tiles[i][1].walkable && interior.tiles[i][2].walkable) {
            x = i;
            y = 2;
            break;
          }
        }
      }
      
      interior.npcs.push({
        id: `interior_npc_${building.id}`,
        type: EntityType.NPC,
        name: npcData.name,
        position: { x, y },
        char: npcData.char,
        color: '#FFD700',
        dialogue: npcData.dialogue
      });
    }
  }

  /** 检查位置是否是建筑入口 */
  isBuildingEntrance(x: number, y: number, building: Building): boolean {
    return x === building.doorX && y === building.doorY;
  }

  /** 获取室内指定位置的实体 */
  getInteriorEntityAt(interior: BuildingInterior, x: number, y: number): Entity | undefined {
    return interior.npcs.find(e => e.position.x === x && e.position.y === y);
  }
}

export default InteriorManager;
