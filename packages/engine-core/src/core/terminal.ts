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
  process.stdout.write('\x1Bc');
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
  }

  const keypressHandler = (str: string, key: KeyPressEvent) => {
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
