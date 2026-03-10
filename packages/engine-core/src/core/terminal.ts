/**
 * 终端控制工具
 * 提供清屏、光标控制等底层终端操作
 */

import * as readline from 'readline';

export interface KeyPressEvent {
  name?: string;
  ctrl?: boolean;
  sequence?: string;
}

/**
 * 清屏并将光标移动到顶部
 */
export function clearScreen(): void {
  // 使用多种方式确保清屏彻底
  // 1. ESC[2J - 清除整个屏幕
  // 2. ESC[H 或 ESC[1;1H - 移动光标到左上角
  // 3. ESC[3J - 清除滚动缓冲区 (部分终端支持)
  process.stdout.write('\x1B[2J\x1B[H\x1B[3J');
}

/**
 * 重置终端并清屏
 */
export function resetTerminal(): void {
  // 重置终端到默认状态并清屏
  process.stdout.write('\x1Bc');
}

/**
 * 获取终端大小
 * @returns { columns: 列数, rows: 行数 }
 */
export function getTerminalSize(): { columns: number; rows: number } {
  return {
    columns: process.stdout.columns || 80,
    rows: process.stdout.rows || 24
  };
}

/**
 * 监听终端大小变化
 * @param callback 大小变化回调
 */
export function onTerminalResize(callback: (size: { columns: number; rows: number }) => void): void {
  process.stdout.on('resize', () => {
    callback(getTerminalSize());
  });
}

/**
 * 将光标移动到指定位置
 * @param x 列位置（0开始）
 * @param y 行位置（0开始）
 */
export function moveCursorTo(x: number, y: number): void {
  process.stdout.write(`\x1B[${y + 1};${x + 1}H`);
}

/**
 * 隐藏光标
 */
export function hideCursor(): void {
  process.stdout.write('\x1B[?25l');
}

/**
 * 显示光标
 */
export function showCursor(): void {
  process.stdout.write('\x1B[?25h');
}

/**
 * 设置终端原始模式并监听按键事件
 * @param onKeyPress 按键回调函数
 * @returns 清理函数，用于恢复终端设置
 */
export function setupRawMode(onKeyPress: (str: string, key: KeyPressEvent) => void): () => void {
  readline.emitKeypressEvents(process.stdin);
  
  if (process.stdin.isTTY) {
    process.stdin.setRawMode(true);
    // 禁用鼠标事件和焦点事件（iTerm2 兼容）
    process.stdout.write('\x1B[?1000l\x1B[?1002l\x1B[?1015l\x1B[?1006l');
    // 禁用焦点事件报告（iTerm2）
    process.stdout.write('\x1B[?1004l');
  }

  const keypressHandler = (str: string, key: KeyPressEvent) => {
    // 忽略鼠标事件
    if (key && key.name === 'mouse') {
      return;
    }
    
    // 忽略 iTerm2 焦点事件和其他特殊序列
    if (str && (
      str === '\x1b[I' ||      // 焦点获取
      str === '\x1b[O' ||      // 焦点丢失  
      str.startsWith('\x1b[<') || // 鼠标事件 (SGR 格式)
      str === '\x1b[M'         // 鼠标事件 (X11 格式)
    )) {
      return;
    }
    
    onKeyPress(str, key);
  };

  process.stdin.on('keypress', keypressHandler);

  // 返回清理函数
  return () => {
    process.stdin.off('keypress', keypressHandler);
    if (process.stdin.isTTY) {
      process.stdin.setRawMode(false);
    }
    showCursor();
  };
}

/**
 * 等待任意按键
 * @returns Promise，按键后 resolve
 */
export function waitForAnyKey(): Promise<void> {
  return new Promise((resolve) => {
    const handler = () => {
      process.stdin.off('keypress', handler);
      resolve();
    };
    process.stdin.once('keypress', handler);
  });
}

/**
 * 安全退出程序
 * @param message 退出前显示的消息（可选）
 * @param exitCode 退出码，默认 0
 */
export function safeExit(message?: string, exitCode: number = 0): never {
  clearScreen();
  showCursor();
  if (message) {
    console.log(message);
  }
  process.exit(exitCode);
}
