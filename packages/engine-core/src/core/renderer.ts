/**
 * 渲染工具
 * 提供游戏画面渲染相关的底层方法
 */

import { clearScreen } from './terminal';
import { getControlsHelp } from './input';

export interface RenderCell {
  content: string;
  width: number; // 字符显示宽度（中文占2，英文占1）
}

export interface GameRenderConfig {
  width: number;
  height: number;
}

// 边框字符常量
export const BORDER = {
  TOP_LEFT: '╔',
  TOP_RIGHT: '╗',
  BOTTOM_LEFT: '╚',
  BOTTOM_RIGHT: '╝',
  HORIZONTAL: '══',
  VERTICAL: '║',
  SPACE: '  '
} as const;

// 游戏元素字符
export const GAME_CHARS = {
  SNAKE_HEAD: '🐸',
  SNAKE_BODY: '🟢',
  FOOD: '🍎',
  EMPTY: '  '
} as const;

/**
 * 渲染器类 - 负责游戏画面的构建和输出
 */
export class GameRenderer {
  private config: GameRenderConfig;
  private buffer: string[];

  constructor(config: GameRenderConfig) {
    this.config = config;
    this.buffer = [];
  }

  /**
   * 重置渲染缓冲区
   */
  reset(): void {
    this.buffer = [];
  }

  /**
   * 添加顶部边框到缓冲区
   */
  renderTopBorder(): void {
    this.buffer.push(BORDER.TOP_LEFT + BORDER.HORIZONTAL.repeat(this.config.width) + BORDER.TOP_RIGHT);
  }

  /**
   * 添加底部边框到缓冲区
   */
  renderBottomBorder(): void {
    this.buffer.push(BORDER.BOTTOM_LEFT + BORDER.HORIZONTAL.repeat(this.config.width) + BORDER.BOTTOM_RIGHT);
  }

  /**
   * 添加一行游戏内容到缓冲区
   * @param rowCells 该行的单元格内容数组
   */
  renderRow(rowCells: string[]): void {
    if (rowCells.length !== this.config.width) {
      throw new Error(`Row length ${rowCells.length} does not match config width ${this.config.width}`);
    }
    this.buffer.push(BORDER.VERTICAL + rowCells.join('') + BORDER.VERTICAL);
  }

  /**
   * 添加空行到缓冲区
   */
  renderEmptyRow(): void {
    const emptyCells = Array(this.config.width).fill(BORDER.SPACE);
    this.renderRow(emptyCells);
  }

  /**
   * 添加文本信息行（无边框）
   * @param text 文本内容
   * @param indent 缩进空格数，默认 2
   */
  renderInfo(text: string, indent: number = 2): void {
    this.buffer.push(' '.repeat(indent) + text);
  }

  /**
   * 添加空行
   */
  renderNewLine(): void {
    this.buffer.push('');
  }

  /**
   * 清空屏幕并输出缓冲区内容
   */
  flush(): void {
    clearScreen();
    process.stdout.write(this.buffer.join('\n') + '\n');
  }

  /**
   * 获取当前缓冲区内容（用于测试）
   */
  getBuffer(): string[] {
    return [...this.buffer];
  }
}

/**
 * 创建游戏网格单元格
 * @param hasSnakeHead 是否有蛇头
 * @param hasSnakeBody 是否有蛇身
 * @param hasFood 是否有食物
 * @returns 单元格字符
 */
export function createCell(
  hasSnakeHead: boolean,
  hasSnakeBody: boolean,
  hasFood: boolean
): string {
  if (hasSnakeHead) return GAME_CHARS.SNAKE_HEAD;
  if (hasSnakeBody) return GAME_CHARS.SNAKE_BODY;
  if (hasFood) return GAME_CHARS.FOOD;
  return GAME_CHARS.EMPTY;
}

/**
 * 格式化分数显示
 * @param score 当前分数
 * @param speed 当前速度等级
 * @returns 格式化后的字符串
 */
export function formatScore(score: number, speed: number): string {
  const speedLevel = Math.round((150 - speed) / 2);
  return `分数: ${score}    速度: ${speedLevel}`;
}

/**
 * 格式化控制说明
 * @returns 控制说明字符串
 */
export function formatControls(): string {
  return '控制: WASD/方向键移动, P暂停, R重开, Q退出';
}

/**
 * 格式化游戏结束提示
 * @returns 游戏结束提示字符串
 */
export function formatGameOver(): string {
  return '💀 游戏结束! 按 R 重新开始, Q 退出';
}

/**
 * 格式化开始菜单
 * @returns 开始菜单文本数组
 */
export function formatStartMenu(): string[] {
  return [
    '🐍 欢迎来到贪吃蛇游戏!\n',
    ...getControlsHelp(),
    '\n按任意键开始游戏...\n'
  ];
}
