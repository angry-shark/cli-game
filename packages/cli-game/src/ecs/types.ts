/**
 * ECS (Entity-Component-System) 基础类型定义
 */

/** 实体 ID */
export type EntityId = number;

/** 组件类型名称 */
export type ComponentType = string;

/** 基础组件接口 */
export interface Component {
  readonly type: ComponentType;
}

/** 组件构造函数 */
export interface ComponentConstructor<T extends Component> {
  new (...args: any[]): T;
  readonly type: ComponentType;
}

/** 系统接口 */
export interface System {
  /** 系统名称 */
  readonly name: string;
  
  /** 系统优先级（数字越小优先级越高） */
  readonly priority: number;
  
  /** 初始化 */
  init(world: World): void;
  
  /** 更新 */
  update(world: World, deltaTime: number): void;
  
  /** 销毁 */
  destroy(world: World): void;
}

/** 查询条件 */
export interface Query {
  /** 必须包含的所有组件 */
  all?: ComponentType[];
  /** 包含任意一个组件 */
  any?: ComponentType[];
  /** 必须不包含的组件 */
  none?: ComponentType[];
}

/** 世界接口 */
export interface World {
  /** 创建实体 */
  createEntity(): EntityId;
  
  /** 销毁实体 */
  destroyEntity(entity: EntityId): void;
  
  /** 添加组件 */
  addComponent<T extends Component>(entity: EntityId, component: T): void;
  
  /** 移除组件 */
  removeComponent(entity: EntityId, componentType: ComponentType): void;
  
  /** 获取组件 */
  getComponent<T extends Component>(entity: EntityId, componentType: ComponentType): T | undefined;
  
  /** 检查是否有组件 */
  hasComponent(entity: EntityId, componentType: ComponentType): boolean;
  
  /** 查询实体 */
  query(query: Query): EntityId[];
  
  /** 获取所有带有指定组件的实体 */
  getEntitiesWith(...componentTypes: ComponentType[]): EntityId[];
  
  /** 注册系统 */
  registerSystem(system: System): void;
  
  /** 移除系统 */
  removeSystem(name: string): void;
  
  /** 更新世界 */
  update(deltaTime: number): void;
  
  /** 销毁世界 */
  destroy(): void;
  
  /** 实体是否存在 */
  hasEntity(entity: EntityId): boolean;
  
  /** 获取实体数量 */
  getEntityCount(): number;
  
  /** 事件发射 */
  emit(event: string, data?: any): void;
  
  /** 事件监听 */
  on(event: string, callback: (data?: any) => void): void;
  
  /** 移除事件监听 */
  off(event: string, callback: (data?: any) => void): void;
  
  /** 设置资源 */
  setResource<T extends Resource>(resource: T): void;
  
  /** 获取资源 */
  getResource<T extends Resource>(type: string): T | undefined;
  
  /** 移除资源 */
  removeResource(type: string): void;
}

/** 资源接口（全局共享数据） */
export interface Resource {
  readonly type: string;
}
