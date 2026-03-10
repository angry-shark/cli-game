/**
 * @cli-game/engine-core
 * CLI 游戏引擎核心库
 * 
 * 提供构建终端游戏所需的基础设施：
 * - Core: 底层终端控制、渲染、输入处理
 * - Functions: 基于 Core 封装的高级功能
 */

// Core 模块 - 底层基础
export * from './core/terminal';
export * from './core/renderer';
export * from './core/input';
export * from './core/file';

// Functions 模块 - 高级功能
export * from './functions/scene';
export * from './functions/menu';
export * from './functions/progress';
export * from './functions/logger';
export * from './functions/utils';
export * from './functions/save';
export * from './functions/viewport';
export * from './functions/panel';
export * from './functions/inventory';
