/**
 * ECS 模块入口
 */

export type { 
  EntityId, ComponentType, Component, ComponentConstructor,
  System, Query, World, Resource
} from './types.js';
export { World as ECSWorld } from './World.js';
export * as Components from './components/index.js';
export * as Systems from './systems/index.js';
