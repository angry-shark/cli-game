#!/usr/bin/env node

/**
 * CLI RPG Game
 * 基于 engine-core 构建的终端角色扮演游戏
 */

import { RPGGame } from './rpg-game';
import * as readline from 'readline';

async function main(): Promise<void> {
  // 显示开始菜单
  console.clear();
  console.log('╔══════════════════════════════════════════════════════════════╗');
  console.log('║                                                              ║');
  console.log('║                    🗡️  CLI RPG  🛡️                          ║');
  console.log('║                                                              ║');
  console.log('║              终端角色扮演游戏                                ║');
  console.log('║                                                              ║');
  console.log('╠══════════════════════════════════════════════════════════════╣');
  console.log('║                                                              ║');
  console.log('║  控制方式:                                                   ║');
  console.log('║    WASD / ↑↓←→  - 移动                                       ║');
  console.log('║    E            - 互动（对话/开宝箱/战斗）                   ║');
  console.log('║    I            - 打开背包                                   ║');
  console.log('║    F            - 快速存档                                   ║');
  console.log('║    O            - 快速读档                                   ║');
  console.log('║    ESC / Q      - 退出游戏                                   ║');
  console.log('║                                                              ║');
  console.log('║  图例: 🧙玩家 👴村长 🧑‍💼商人 🧙‍♂️老者 🦠史莱姆 👺哥布林      ║');
  console.log('║        💀骷髅 🦇蝙蝠 📦宝箱 📭开启的宝箱                     ║');
  console.log('║                                                              ║');
  console.log('║  背包模式:                                                   ║');
  console.log('║    ↑↓           - 选择物品                                   ║');
  console.log('║    Tab          - 切换分类                                   ║');
  console.log('║    U            - 使用物品                                   ║');
  console.log('║    E            - 装备/卸下                                  ║');
  console.log('║    D            - 丢弃物品                                   ║');
  console.log('║    I / ESC      - 关闭背包                                   ║');
  console.log('║                                                              ║');
  console.log('╚══════════════════════════════════════════════════════════════╝');
  console.log('\n按任意键开始游戏...');

  // 等待任意按键
  await waitForAnyKey();

  // 启动游戏
  try {
    const game = new RPGGame();
    await game.start();
    
    // 保持进程运行，直到游戏退出
    await new Promise(() => {});
  } catch (error) {
    console.error('\n游戏发生错误:', error);
    process.exit(1);
  }
}

/**
 * 等待任意按键
 */
function waitForAnyKey(): Promise<void> {
  return new Promise((resolve) => {
    // 启用 raw mode 以接收单个按键
    readline.emitKeypressEvents(process.stdin);
    if (process.stdin.isTTY) {
      process.stdin.setRawMode(true);
    }
    
    const handler = (str: string, key: { name?: string; ctrl?: boolean }) => {
      process.stdin.off('keypress', handler);
      // 如果是 Ctrl+C，退出
      if (key && key.ctrl && key.name === 'c') {
        process.exit(0);
      }
      resolve();
    };
    
    process.stdin.once('keypress', handler);
  });
}

// 如果是直接运行此文件
if (require.main === module) {
  main().catch((error) => {
    console.error('未捕获的错误:', error);
    process.exit(1);
  });
}

export { main };
