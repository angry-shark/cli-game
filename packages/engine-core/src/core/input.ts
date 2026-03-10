/**
 * 用户输入处理工具
 * 封装键盘输入映射、按键绑定和输入事件处理
 */

import { KeyPressEvent } from './terminal';

/**
 * 方向枚举
 */
export enum Direction {
  UP = 'up',
  DOWN = 'down',
  LEFT = 'left',
  RIGHT = 'right'
}

/**
 * 游戏动作枚举
 */
export enum GameAction {
  MOVE = 'move',
  RESTART = 'restart',
  QUIT = 'quit',
  PAUSE = 'pause',
  INTERACT = 'interact',
  INVENTORY = 'inventory',
  SAVE = 'save',
  LOAD = 'load',
  NONE = 'none'
}

/**
 * 输入事件
 */
export interface InputEvent {
  action: GameAction;
  direction?: Direction;
  rawKey: KeyPressEvent;
}

/**
 * 输入处理器回调函数类型
 */
export type InputHandlerCallback = (event: InputEvent) => void;

/**
 * 按键映射配置
 */
export interface KeyMapping {
  [key: string]: InputEvent;
}

/**
 * 默认按键映射
 */
export const DEFAULT_KEY_MAPPING: KeyMapping = {
  // WASD 方向控制
  w: { action: GameAction.MOVE, direction: Direction.UP, rawKey: { name: 'w' } },
  s: { action: GameAction.MOVE, direction: Direction.DOWN, rawKey: { name: 's' } },
  a: { action: GameAction.MOVE, direction: Direction.LEFT, rawKey: { name: 'a' } },
  d: { action: GameAction.MOVE, direction: Direction.RIGHT, rawKey: { name: 'd' } },
  // 方向键控制
  up: { action: GameAction.MOVE, direction: Direction.UP, rawKey: { name: 'up' } },
  down: { action: GameAction.MOVE, direction: Direction.DOWN, rawKey: { name: 'down' } },
  left: { action: GameAction.MOVE, direction: Direction.LEFT, rawKey: { name: 'left' } },
  right: { action: GameAction.MOVE, direction: Direction.RIGHT, rawKey: { name: 'right' } },
  // 功能键
  r: { action: GameAction.RESTART, rawKey: { name: 'r' } },
  q: { action: GameAction.QUIT, rawKey: { name: 'q' } },
  p: { action: GameAction.PAUSE, rawKey: { name: 'p' } },
  space: { action: GameAction.PAUSE, rawKey: { name: 'space' } },
  escape: { action: GameAction.QUIT, rawKey: { name: 'escape' } },
  // RPG 快捷键
  e: { action: GameAction.INTERACT, rawKey: { name: 'e' } },
  i: { action: GameAction.INVENTORY, rawKey: { name: 'i' } },
  f: { action: GameAction.SAVE, rawKey: { name: 'f' } },  // file/save
  o: { action: GameAction.LOAD, rawKey: { name: 'o' } }   // open/load
};

/**
 * 输入管理器配置
 */
export interface InputManagerConfig {
  keyMapping?: KeyMapping;
  onInput?: InputHandlerCallback;
  enabled?: boolean;
}

/**
 * 输入管理器
 * 负责处理所有键盘输入，将原始按键转换为游戏动作
 */
export class InputManager {
  private keyMapping: KeyMapping;
  private onInput: InputHandlerCallback | null;
  private enabled: boolean;
  private lastDirection: Direction | null;

  constructor(config: InputManagerConfig = {}) {
    this.keyMapping = config.keyMapping || { ...DEFAULT_KEY_MAPPING };
    this.onInput = config.onInput || null;
    this.enabled = config.enabled !== false;
    this.lastDirection = null;
  }

  /**
   * 启用输入处理
   */
  enable(): void {
    this.enabled = true;
  }

  /**
   * 禁用输入处理
   */
  disable(): void {
    this.enabled = false;
  }

  /**
   * 检查是否已启用
   */
  isEnabled(): boolean {
    return this.enabled;
  }

  /**
   * 设置输入回调
   */
  setCallback(callback: InputHandlerCallback | null): void {
    this.onInput = callback;
  }

  /**
   * 移除输入回调
   */
  removeCallback(): void {
    this.onInput = null;
  }

  /**
   * 更新按键映射
   */
  setKeyMapping(mapping: KeyMapping): void {
    this.keyMapping = { ...mapping };
  }

  /**
   * 添加或覆盖单个按键映射
   */
  bindKey(key: string, event: InputEvent): void {
    this.keyMapping[key.toLowerCase()] = event;
  }

  /**
   * 移除按键映射
   */
  unbindKey(key: string): void {
    delete this.keyMapping[key.toLowerCase()];
  }

  /**
   * 获取当前按键映射
   */
  getKeyMapping(): KeyMapping {
    return { ...this.keyMapping };
  }

  /**
   * 处理原始按键事件
   * @param key 原始按键事件
   * @returns 是否成功处理
   */
  handleKey(key: KeyPressEvent): boolean {
    if (!this.enabled) {
      return false;
    }

    // 获取按键名：优先使用 key.name，否则使用 key.sequence
    let keyName = key.name || key.sequence;
    
    if (!keyName) {
      return false;
    }

    // Ctrl+C 特殊处理
    if (key.ctrl && keyName === 'c') {
      const event: InputEvent = {
        action: GameAction.QUIT,
        rawKey: key
      };
      this.dispatch(event);
      return true;
    }

    const normalizedKeyName = keyName.toLowerCase();
    const mappedEvent = this.keyMapping[normalizedKeyName];

    if (!mappedEvent) {
      return false;
    }

    // 创建新的输入事件，保留原始按键信息
    const event: InputEvent = {
      ...mappedEvent,
      rawKey: key
    };

    // 防止 180 度反向移动
    if (event.action === GameAction.MOVE && event.direction) {
      if (this.isOppositeDirection(event.direction)) {
        return false;
      }
      this.lastDirection = event.direction;
    }

    this.dispatch(event);
    return true;
  }

  /**
   * 检查是否为相反方向
   */
  private isOppositeDirection(newDirection: Direction): boolean {
    if (!this.lastDirection) return false;

    const opposites: Record<Direction, Direction> = {
      [Direction.UP]: Direction.DOWN,
      [Direction.DOWN]: Direction.UP,
      [Direction.LEFT]: Direction.RIGHT,
      [Direction.RIGHT]: Direction.LEFT
    };

    return opposites[newDirection] === this.lastDirection;
  }

  /**
   * 分发输入事件
   */
  private dispatch(event: InputEvent): void {
    if (this.onInput) {
      this.onInput(event);
    }
  }

  /**
   * 重置方向记录（游戏重新开始时调用）
   */
  resetDirection(): void {
    this.lastDirection = null;
  }

  /**
   * 获取最后移动方向
   */
  getLastDirection(): Direction | null {
    return this.lastDirection;
  }
}

/**
   * 获取方向对应的坐标增量
   */
export function getDirectionDelta(direction: Direction): { x: number; y: number } {
  const deltas: Record<Direction, { x: number; y: number }> = {
    [Direction.UP]: { x: 0, y: -1 },
    [Direction.DOWN]: { x: 0, y: 1 },
    [Direction.LEFT]: { x: -1, y: 0 },
    [Direction.RIGHT]: { x: 1, y: 0 }
  };
  return deltas[direction];
}

/**
 * 方向转换为中文描述
 */
export function directionToString(direction: Direction): string {
  const names: Record<Direction, string> = {
    [Direction.UP]: '上',
    [Direction.DOWN]: '下',
    [Direction.LEFT]: '左',
    [Direction.RIGHT]: '右'
  };
  return names[direction];
}

/**
 * 获取控制说明文本
 */
export function getControlsHelp(): string[] {
  return [
    '控制方式:',
    '  W/↑ - 向上',
    '  S/↓ - 向下',
    '  A/← - 向左',
    '  D/→ - 向右',
    '  P/空格 - 暂停',
    '  R - 重新开始',
    '  Q/Esc - 退出游戏'
  ];
}
