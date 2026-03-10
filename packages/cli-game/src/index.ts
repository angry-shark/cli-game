#!/usr/bin/env node

/**
 * cli_game - A CLI Snake Game (TypeScript)
 */

import { GameManager } from './game';
import { formatStartMenu } from '@cli-game/engine-core';
import * as readline from 'readline';

async function main(): Promise<void> {
  // 显示开始菜单
  formatStartMenu().forEach(line => process.stdout.write(line));
  
  // 等待任意按键
  await waitForAnyKey();
  
  // 启动游戏
  const gameManager = new GameManager();
  gameManager.start();
}

/**
 * 等待任意按键
 */
function waitForAnyKey(): Promise<void> {
  return new Promise((resolve) => {
    readline.emitKeypressEvents(process.stdin);
    if (process.stdin.isTTY) {
      process.stdin.setRawMode(true);
    }
    
    const handler = () => {
      process.stdin.off('keypress', handler);
      resolve();
    };
    process.stdin.once('keypress', handler);
  });
}

// 如果是直接运行此文件
if (require.main === module) {
  main().catch(console.error);
}

export { main };
