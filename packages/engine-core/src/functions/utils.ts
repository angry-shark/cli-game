/**
 * 通用工具函数
 * 提供各种实用辅助功能
 */

import { clearScreen, moveCursorTo } from '../core/terminal';

/**
 * 睡眠函数
 * @param ms 毫秒
 */
export function sleep(ms: number): Promise<void> {
  return new Promise(resolve => setTimeout(resolve, ms));
}

/**
 * 随机整数
 * @param min 最小值（包含）
 * @param max 最大值（包含）
 */
export function randomInt(min: number, max: number): number {
  return Math.floor(Math.random() * (max - min + 1)) + min;
}

/**
 * 打乱数组
 * @param array 数组
 * @returns 新数组
 */
export function shuffle<T>(array: T[]): T[] {
  const result = [...array];
  for (let i = result.length - 1; i > 0; i--) {
    const j = Math.floor(Math.random() * (i + 1));
    [result[i], result[j]] = [result[j], result[i]];
  }
  return result;
}

/**
 * 格式化时间
 * @param seconds 秒数
 * @returns 格式化字符串 (MM:SS)
 */
export function formatTime(seconds: number): string {
  const mins = Math.floor(seconds / 60);
  const secs = seconds % 60;
  return `${mins.toString().padStart(2, '0')}:${secs.toString().padStart(2, '0')}`;
}

/**
 * 截断字符串
 * @param str 字符串
 * @param maxLength 最大长度
 * @param suffix 后缀，默认 '...'
 */
export function truncate(str: string, maxLength: number, suffix: string = '...'): string {
  if (str.length <= maxLength) return str;
  return str.slice(0, maxLength - suffix.length) + suffix;
}

/**
 * 居中显示文本
 * @param text 文本
 * @param width 容器宽度
 * @param fill 填充字符，默认空格
 */
export function center(text: string, width: number, fill: string = ' '): string {
  const padding = Math.max(0, width - text.length);
  const left = Math.floor(padding / 2);
  return fill.repeat(left) + text + fill.repeat(padding - left);
}

/**
 * 右对齐文本
 * @param text 文本
 * @param width 容器宽度
 * @param fill 填充字符，默认空格
 */
export function rightAlign(text: string, width: number, fill: string = ' '): string {
  const padding = Math.max(0, width - text.length);
  return fill.repeat(padding) + text;
}

/**
 * 绘制盒子
 * @param content 内容数组
 * @param width 盒子宽度
 */
export function drawBox(content: string[], width: number = 40): void {
  const top = '╔' + '═'.repeat(width - 2) + '╗';
  const bottom = '╚' + '═'.repeat(width - 2) + '╝';
  
  console.log(top);
  content.forEach(line => {
    const padded = line.padEnd(width - 2).slice(0, width - 2);
    console.log('║' + padded + '║');
  });
  console.log(bottom);
}

/**
 * 表格数据
 */
export interface TableData {
  headers: string[];
  rows: string[][];
  align?: ('left' | 'right' | 'center')[];
}

/**
 * 绘制简单表格
 * @param data 表格数据
 */
export function drawTable(data: TableData): void {
  // 计算列宽
  const colWidths = data.headers.map((h, i) => {
    const headerLen = h.length;
    const maxRowLen = Math.max(...data.rows.map(row => (row[i] || '').length));
    return Math.max(headerLen, maxRowLen) + 2;
  });

  const totalWidth = colWidths.reduce((a, b) => a + b, colWidths.length + 1);
  
  // 绘制顶边框
  console.log('┌' + colWidths.map(w => '─'.repeat(w)).join('┬') + '┐');
  
  // 绘制表头
  const headerRow = data.headers.map((h, i) => {
    const align = data.align?.[i] || 'left';
    if (align === 'center') return center(h, colWidths[i]);
    if (align === 'right') return rightAlign(h, colWidths[i]);
    return ' ' + h.padEnd(colWidths[i] - 1);
  }).join('│');
  console.log('│' + headerRow + '│');
  
  // 绘制分隔线
  console.log('├' + colWidths.map(w => '─'.repeat(w)).join('┼') + '┤');
  
  // 绘制数据行
  data.rows.forEach(row => {
    const rowStr = row.map((cell, i) => {
      const align = data.align?.[i] || 'left';
      if (align === 'center') return center(cell || '', colWidths[i]);
      if (align === 'right') return rightAlign(cell || '', colWidths[i]);
      return ' ' + (cell || '').padEnd(colWidths[i] - 1);
    }).join('│');
    console.log('│' + rowStr + '│');
  });
  
  // 绘制底边框
  console.log('└' + colWidths.map(w => '─'.repeat(w)).join('┴') + '┘');
}

/**
 * 创建键盘快捷键映射
 * @param shortcuts 快捷键配置
 * @returns 处理函数
 */
export function createShortcuts(
  shortcuts: Record<string, () => void>
): (key: string) => boolean {
  return (key: string): boolean => {
    const handler = shortcuts[key.toLowerCase()];
    if (handler) {
      handler();
      return true;
    }
    return false;
  };
}

/**
 * 防抖函数
 * @param fn 原函数
 * @param ms 防抖毫秒
 */
export function debounce<T extends (...args: unknown[]) => unknown>(
  fn: T,
  ms: number
): (...args: Parameters<T>) => void {
  let timeout: NodeJS.Timeout;
  return (...args: Parameters<T>) => {
    clearTimeout(timeout);
    timeout = setTimeout(() => fn(...args), ms);
  };
}

/**
 * 节流函数
 * @param fn 原函数
 * @param ms 节流毫秒
 */
export function throttle<T extends (...args: unknown[]) => unknown>(
  fn: T,
  ms: number
): (...args: Parameters<T>) => void {
  let lastTime = 0;
  return (...args: Parameters<T>) => {
    const now = Date.now();
    if (now - lastTime >= ms) {
      lastTime = now;
      fn(...args);
    }
  };
}

/**
 * 深度克隆
 * @param obj 对象
 */
export function deepClone<T>(obj: T): T {
  if (obj === null || typeof obj !== 'object') return obj;
  if (obj instanceof Date) return new Date(obj.getTime()) as unknown as T;
  if (obj instanceof Array) return obj.map(item => deepClone(item)) as unknown as T;
  if (typeof obj === 'object') {
    const cloned = {} as Record<string, unknown>;
    Object.keys(obj).forEach(key => {
      cloned[key] = deepClone((obj as Record<string, unknown>)[key]);
    });
    return cloned as T;
  }
  return obj;
}

/**
 *  retry 重试机制
 * @param operation 操作函数
 * @param maxRetries 最大重试次数
 * @param delay 重试间隔
 */
export async function retry<T>(
  operation: () => Promise<T>,
  maxRetries: number = 3,
  delay: number = 1000
): Promise<T> {
  let lastError: Error;
  
  for (let i = 0; i < maxRetries; i++) {
    try {
      return await operation();
    } catch (error) {
      lastError = error as Error;
      if (i < maxRetries - 1) {
        await sleep(delay);
      }
    }
  }
  
  throw lastError!;
}
