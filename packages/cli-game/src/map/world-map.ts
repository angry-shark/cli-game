/**
 * 世界地图系统
 * 管理城镇、野外、地下城之间的连接和传送
 */

import { Point2D } from '../core/types.js';

/** 地图类型 */
export enum WorldMapType {
  TOWN = 'town',
  WILDERNESS = 'wilderness',
  DUNGEON = 'dungeon'
}

/** 传送门方向 */
export enum PortalDirection {
  NORTH = 'north',
  SOUTH = 'south',
  EAST = 'east',
  WEST = 'west',
  DUNGEON = 'dungeon'
}

/** 传送门定义 */
export interface Portal {
  id: string;
  direction: PortalDirection;
  x: number;
  y: number;
  targetMapId: string;
  targetX: number;
  targetY: number;
  label: string;
}

/** 世界地图节点 */
export interface WorldMapNode {
  id: string;
  type: WorldMapType;
  name: string;
  // 城镇特有
  townSize?: { width: number; height: number }; // 城镇大小（区块数）
  // 野外特有
  difficulty?: number; // 难度等级
  resources?: string[]; // 资源类型
  // 通用
  portals: Portal[];
  discovered: boolean;
  visited: boolean;
}

/** 世界地图配置 */
export interface WorldMapConfig {
  townSpacing: number; // 城镇之间的最小间隔（野外地图数量）
  maxTowns: number;    // 最大城镇数量
  townSize: { width: number; height: number }; // 每个城镇的大小
}

const DEFAULT_WORLD_CONFIG: WorldMapConfig = {
  townSpacing: 2,      // 城镇之间至少间隔2个野外地图
  maxTowns: 5,         // 最多5个城镇
  townSize: { width: 3, height: 3 } // 每个城镇3x3区块
};

/** 世界地图管理器 */
export class WorldMapManager {
  private nodes: Map<string, WorldMapNode> = new Map();
  private currentNodeId: string = '';
  private config: WorldMapConfig;
  private townCount: number = 0;

  constructor(config: Partial<WorldMapConfig> = {}) {
    this.config = { ...DEFAULT_WORLD_CONFIG, ...config };
    this.initializeWorld();
  }

  /** 初始化世界地图 */
  private initializeWorld(): void {
    // 创建起始城镇（0号城镇）
    const startTown = this.createTown(0, { x: 0, y: 0 });
    this.nodes.set(startTown.id, startTown);
    this.currentNodeId = startTown.id;
    
    // 在新手村四个方向创建通往不同野外区域的传送门和对应的野外节点
    // 南方：森林（难度1）
    const forestWild = this.createWilderness('wilderness_forest_0', 1);
    this.nodes.set(forestWild.id, forestWild);
    this.connectNodes(startTown.id, forestWild.id, PortalDirection.SOUTH, PortalDirection.NORTH, '迷雾森林', '新手村');
    
    // 东方：荒野（难度2）
    const wastelandWild = this.createWilderness('wilderness_wasteland_0', 2);
    this.nodes.set(wastelandWild.id, wastelandWild);
    this.connectNodes(startTown.id, wastelandWild.id, PortalDirection.EAST, PortalDirection.WEST, '荒芜之地', '新手村');
    
    // 北方：雪山（难度3）
    const mountainWild = this.createWilderness('wilderness_mountain_0', 3);
    this.nodes.set(mountainWild.id, mountainWild);
    this.connectNodes(startTown.id, mountainWild.id, PortalDirection.NORTH, PortalDirection.SOUTH, '冰封山脉', '新手村');
    
    // 西方：遗迹（难度4）
    const ruinWild = this.createWilderness('wilderness_ruin_0', 4);
    this.nodes.set(ruinWild.id, ruinWild);
    this.connectNodes(startTown.id, ruinWild.id, PortalDirection.WEST, PortalDirection.EAST, '古代遗迹', '新手村');
    
    // 预生成其他城镇和野外地图连接
    this.generateWorldConnections();
  }

  /** 创建城镇 */
  private createTown(index: number, position: Point2D): WorldMapNode {
    this.townCount++;
    const townNames = ['新手村', '铁炉堡', '风行镇', '暗影村', '圣光城'];
    const name = townNames[index] || `城镇${index + 1}`;
    
    const town: WorldMapNode = {
      id: `town_${index}`,
      type: WorldMapType.TOWN,
      name,
      townSize: { ...this.config.townSize },
      portals: [],
      discovered: index === 0, // 起始城镇已发现
      visited: index === 0
    };

    // 在城镇边缘添加传送门位置（实际传送门在地图生成时创建）
    return town;
  }

  /** 创建野外地图 */
  private createWilderness(id: string, difficulty: number): WorldMapNode {
    const wilderness: WorldMapNode = {
      id,
      type: WorldMapType.WILDERNESS,
      name: `野外区域 ${id.split('_').pop()}`,
      difficulty,
      resources: this.generateResources(difficulty),
      portals: [],
      discovered: false,
      visited: false
    };
    return wilderness;
  }

  /** 生成资源类型 */
  private generateResources(difficulty: number): string[] {
    const resources: string[] = [];
    if (difficulty <= 1) {
      resources.push('herb', 'wood');
    } else if (difficulty <= 3) {
      resources.push('herb', 'wood', 'iron_ore');
    } else {
      resources.push('herb', 'iron_ore', 'gold_ore', 'crystal');
    }
    return resources;
  }

  /** 生成世界连接关系 */
  private generateWorldConnections(): void {
    // 从起始城镇向南扩展
    let currentNodeId = 'town_0';
    
    for (let townIndex = 1; townIndex < this.config.maxTowns; townIndex++) {
      // 在城镇之间创建野外地图
      for (let wildIndex = 0; wildIndex < this.config.townSpacing; wildIndex++) {
        const wildId = `wilderness_${townIndex - 1}_${wildIndex}`;
        const wilderness = this.createWilderness(wildId, townIndex);
        
        // 连接前一个节点到野外
        this.connectNodes(currentNodeId, wildId, PortalDirection.SOUTH, PortalDirection.NORTH);
        
        this.nodes.set(wildId, wilderness);
        currentNodeId = wildId;
      }
      
      // 创建新城镇
      const newTown = this.createTown(townIndex, { x: 0, y: townIndex * (this.config.townSpacing + 1) });
      
      // 连接野外到新城镇
      this.connectNodes(currentNodeId, newTown.id, PortalDirection.SOUTH, PortalDirection.NORTH);
      
      // 在城镇的东西方向也添加野外地图（可选路径）
      this.addSideWilderness(newTown.id, townIndex);
      
      this.nodes.set(newTown.id, newTown);
      currentNodeId = newTown.id;
    }
  }

  /** 添加城镇侧边的野外地图（分支路径） */
  private addSideWilderness(townId: string, townIndex: number): void {
    const town = this.nodes.get(townId);
    if (!town) return;

    // 30%概率在东侧有野外
    if (Math.random() < 0.3) {
      const eastWildId = `wilderness_${townIndex}_east`;
      const eastWild = this.createWilderness(eastWildId, townIndex + 1);
      this.connectNodes(townId, eastWildId, PortalDirection.EAST, PortalDirection.WEST);
      this.nodes.set(eastWildId, eastWild);
    }

    // 30%概率在西侧有野外
    if (Math.random() < 0.3) {
      const westWildId = `wilderness_${townIndex}_west`;
      const westWild = this.createWilderness(westWildId, townIndex + 1);
      this.connectNodes(townId, westWildId, PortalDirection.WEST, PortalDirection.EAST);
      this.nodes.set(westWildId, westWild);
    }
  }

  /** 连接两个节点 */
  private connectNodes(fromId: string, toId: string, fromDir: PortalDirection, toDir: PortalDirection, fromLabel?: string, toLabel?: string): void {
    const fromNode = this.nodes.get(fromId);
    const toNode = this.nodes.get(toId);
    if (!fromNode || !toNode) return;

    // 从fromNode到toNode的传送门
    const fromPortal: Portal = {
      id: `${fromId}_to_${toId}`,
      direction: fromDir,
      x: 0, y: 0, // 具体位置在地图生成时设置
      targetMapId: toId,
      targetX: 0, targetY: 0,
      label: fromLabel || toNode.name
    };

    // 从toNode到fromNode的传送门
    const toPortal: Portal = {
      id: `${toId}_to_${fromId}`,
      direction: toDir,
      x: 0, y: 0,
      targetMapId: fromId,
      targetX: 0, targetY: 0,
      label: toLabel || fromNode.name
    };

    fromNode.portals.push(fromPortal);
    toNode.portals.push(toPortal);
  }

  // ========== 公共方法 ==========

  /** 获取当前节点 */
  getCurrentNode(): WorldMapNode | undefined {
    return this.nodes.get(this.currentNodeId);
  }

  /** 获取当前节点ID */
  getCurrentNodeId(): string {
    return this.currentNodeId;
  }

  /** 切换当前节点 */
  switchToNode(nodeId: string): WorldMapNode | undefined {
    const node = this.nodes.get(nodeId);
    if (node) {
      this.currentNodeId = nodeId;
      node.visited = true;
      node.discovered = true;
    }
    return node;
  }

  /** 获取指定方向的传送门 */
  getPortalInDirection(direction: PortalDirection): Portal | undefined {
    const currentNode = this.getCurrentNode();
    if (!currentNode) return undefined;
    return currentNode.portals.find(p => p.direction === direction);
  }

  /** 获取所有节点 */
  getAllNodes(): WorldMapNode[] {
    return Array.from(this.nodes.values());
  }

  /** 获取已发现的节点 */
  getDiscoveredNodes(): WorldMapNode[] {
    return this.getAllNodes().filter(n => n.discovered);
  }

  /** 获取世界地图大小 */
  getWorldSize(): { towns: number; wilderness: number } {
    const nodes = this.getAllNodes();
    return {
      towns: nodes.filter(n => n.type === WorldMapType.TOWN).length,
      wilderness: nodes.filter(n => n.type === WorldMapType.WILDERNESS).length
    };
  }

  /** 判断是否为城镇 */
  isCurrentTown(): boolean {
    const node = this.getCurrentNode();
    return node?.type === WorldMapType.TOWN;
  }

  /** 判断是否为野外 */
  isCurrentWilderness(): boolean {
    const node = this.getCurrentNode();
    return node?.type === WorldMapType.WILDERNESS;
  }
}

export default WorldMapManager;
