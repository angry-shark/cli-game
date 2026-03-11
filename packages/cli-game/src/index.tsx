#!/usr/bin/env node

/**
 * CLI Roguelike RPG
 * 使用 rot-js + ink 构建的终端肉鸽游戏
 */

// 必须在 ink 渲染前设置原始模式，禁用 macOS 长按声调弹窗
import { stdin, stdout } from 'process';
if (stdin.isTTY) {
  stdin.setRawMode(true);
  stdin.setEncoding('utf8');
}

import React from 'react';
import { render, Box, Text, useInput } from 'ink';
import GameComponent from './components/Game.js';
import { Game } from './game.js';

/** 开始菜单组件 */
function StartMenu({ onStart }: { onStart: () => void }) {
  
  useInput(() => {
    onStart();
  });

  return (
    <Box flexDirection="column" alignItems="center" justifyContent="center" paddingY={5}>
      <Box marginY={1}>
        <Text bold color="yellow">
          ╔══════════════════════════════════════════╗
        </Text>
      </Box>
      <Box>
        <Text bold color="yellow">
          ║{'     '}🗡️  ROT-JS ROGUELIKE RPG  🛡️{'      '}║
        </Text>
      </Box>
      <Box>
        <Text bold color="yellow">
          ║{'          '}终端肉鸽游戏{'                  '}║
        </Text>
      </Box>
      <Box marginY={1}>
        <Text bold color="yellow">
          ╠══════════════════════════════════════════╣
        </Text>
      </Box>
      <Box>
        <Text color="gray">
          ║{'  '}使用 <Text color="cyan">rot-js</Text> + <Text color="cyan">ink</Text> 构建{'                '}║
        </Text>
      </Box>
      <Box marginY={1}>
        <Text bold color="yellow">
          ╠══════════════════════════════════════════╣
        </Text>
      </Box>
      <Box>
        <Text>{'║  控制方式:                               ║'}</Text>
      </Box>
      <Box>
        <Text>{'║    WASD / 方向键  - 移动                 ║'}</Text>
      </Box>
      <Box>
        <Text>{'║    E              - 互动/攻击            ║'}</Text>
      </Box>
      <Box>
        <Text>{'║    G              - 拾取物品             ║'}</Text>
      </Box>
      <Box>
        <Text>{'║    I              - 打开背包             ║'}</Text>
      </Box>
      <Box>
        <Text>{'║    🔽             - 使用楼梯             ║'}</Text>
      </Box>
      <Box>
        <Text>{'║    ESC / Q        - 退出                 ║'}</Text>
      </Box>
      <Box marginY={1}>
        <Text bold color="yellow">
          ╠══════════════════════════════════════════╣
        </Text>
      </Box>
      <Box>
        <Text>{'║  图例:                                   ║'}</Text>
      </Box>
      <Box>
        <Text>{'║    🧙 玩家  👴 NPC  👺 怪物  📦 宝箱      ║'}</Text>
      </Box>
      <Box>
        <Text>{'║  ██亮墙  ░░暗墙  空格地板  ▼楼梯         ║'}</Text>
      </Box>
      <Box marginY={1}>
        <Text bold color="yellow">
          ╚══════════════════════════════════════════╝
        </Text>
      </Box>
      <Box marginTop={2}>
        <Text color="cyan" bold>
          按任意键开始游戏...
        </Text>
      </Box>
    </Box>
  );
}

/** 主应用 */
function App() {
  const [started, setStarted] = React.useState(false);
  const [game, setGame] = React.useState<Game | null>(null);

  const handleStart = () => {
    const newGame = new Game(() => {});
    setGame(newGame);
    setStarted(true);
  };

  if (!started) {
    return <StartMenu onStart={handleStart} />;
  }

  if (!game) {
    return (
      <Box>
        <Text color="red">游戏初始化失败</Text>
      </Box>
    );
  }

  return <GameComponent game={game} />;
}

// 启动游戏
render(<App />);
