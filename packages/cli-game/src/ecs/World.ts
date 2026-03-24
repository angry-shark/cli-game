/**
 * ECS World 实现
 */

import { 
  EntityId, Component, ComponentType, System, 
  World as IWorld, Query, Resource 
} from './types.js';

/** 组件存储 */
type ComponentStorage = Map<ComponentType, Component>;

/** 事件监听器 */
type EventListener = (data?: any) => void;

export class World implements IWorld {
  private entities: Map<EntityId, ComponentStorage> = new Map();
  private systems: System[] = [];
  private resources: Map<string, Resource> = new Map();
  private eventListeners: Map<string, Set<EventListener>> = new Map();
  private nextEntityId: EntityId = 1;
  private entityPool: EntityId[] = [];
  private destroyedEntities: Set<EntityId> = new Set();

  createEntity(): EntityId {
    // 优先使用回收的 ID
    const id = this.entityPool.length > 0 
      ? this.entityPool.pop()! 
      : this.nextEntityId++;
    
    this.entities.set(id, new Map());
    return id;
  }

  destroyEntity(entity: EntityId): void {
    if (!this.entities.has(entity)) return;
    
    // 延迟销毁，避免在遍历时修改
    this.destroyedEntities.add(entity);
  }

  private processDestroyedEntities(): void {
    for (const entity of this.destroyedEntities) {
      const components = this.entities.get(entity);
      if (components) {
        // 清理组件引用
        components.clear();
      }
      this.entities.delete(entity);
      this.entityPool.push(entity);
    }
    this.destroyedEntities.clear();
  }

  addComponent<T extends Component>(entity: EntityId, component: T): void {
    const components = this.entities.get(entity);
    if (!components) {
      throw new Error(`Entity ${entity} does not exist`);
    }
    components.set(component.type, component);
  }

  removeComponent(entity: EntityId, componentType: ComponentType): void {
    const components = this.entities.get(entity);
    if (components) {
      components.delete(componentType);
    }
  }

  getComponent<T extends Component>(entity: EntityId, componentType: ComponentType): T | undefined {
    const components = this.entities.get(entity);
    return components?.get(componentType) as T | undefined;
  }

  hasComponent(entity: EntityId, componentType: ComponentType): boolean {
    const components = this.entities.get(entity);
    return components?.has(componentType) ?? false;
  }

  query(query: Query): EntityId[] {
    const result: EntityId[] = [];
    
    for (const [entityId, components] of this.entities) {
      if (this.destroyedEntities.has(entityId)) continue;
      
      let match = true;
      
      // 检查 all 条件
      if (query.all) {
        for (const type of query.all) {
          if (!components.has(type)) {
            match = false;
            break;
          }
        }
      }
      
      // 检查 any 条件
      if (match && query.any && query.any.length > 0) {
        let hasAny = false;
        for (const type of query.any) {
          if (components.has(type)) {
            hasAny = true;
            break;
          }
        }
        if (!hasAny) match = false;
      }
      
      // 检查 none 条件
      if (match && query.none) {
        for (const type of query.none) {
          if (components.has(type)) {
            match = false;
            break;
          }
        }
      }
      
      if (match) {
        result.push(entityId);
      }
    }
    
    return result;
  }

  getEntitiesWith(...componentTypes: ComponentType[]): EntityId[] {
    return this.query({ all: componentTypes });
  }

  registerSystem(system: System): void {
    this.systems.push(system);
    // 按优先级排序
    this.systems.sort((a, b) => a.priority - b.priority);
    system.init(this);
  }

  removeSystem(name: string): void {
    const index = this.systems.findIndex(s => s.name === name);
    if (index !== -1) {
      const system = this.systems[index];
      system.destroy(this);
      this.systems.splice(index, 1);
    }
  }

  update(deltaTime: number): void {
    // 更新所有系统
    for (const system of this.systems) {
      system.update(this, deltaTime);
    }
    
    // 处理销毁的实体
    this.processDestroyedEntities();
  }

  destroy(): void {
    // 销毁所有系统
    for (const system of this.systems) {
      system.destroy(this);
    }
    this.systems = [];
    
    // 清理实体
    this.entities.clear();
    this.destroyedEntities.clear();
    this.entityPool = [];
    this.nextEntityId = 1;
    
    // 清理资源
    this.resources.clear();
    
    // 清理事件
    this.eventListeners.clear();
  }

  hasEntity(entity: EntityId): boolean {
    return this.entities.has(entity) && !this.destroyedEntities.has(entity);
  }

  getEntityCount(): number {
    return this.entities.size - this.destroyedEntities.size;
  }

  emit(event: string, data?: any): void {
    const listeners = this.eventListeners.get(event);
    if (listeners) {
      for (const listener of listeners) {
        listener(data);
      }
    }
  }

  on(event: string, callback: EventListener): void {
    if (!this.eventListeners.has(event)) {
      this.eventListeners.set(event, new Set());
    }
    this.eventListeners.get(event)!.add(callback);
  }

  off(event: string, callback: EventListener): void {
    const listeners = this.eventListeners.get(event);
    if (listeners) {
      listeners.delete(callback);
    }
  }

  setResource<T extends Resource>(resource: T): void {
    this.resources.set(resource.type, resource);
  }

  getResource<T extends Resource>(type: string): T | undefined {
    return this.resources.get(type) as T | undefined;
  }

  removeResource(type: string): void {
    this.resources.delete(type);
  }
}
