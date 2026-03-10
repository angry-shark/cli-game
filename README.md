# cli_game 🐍

一个基于 TypeScript 的终端动态贪吃蛇游戏！

![game](https://img.shields.io/badge/game-snake-green)
![typescript](https://img.shields.io/badge/TypeScript-5.0-blue)
![monorepo](https://img.shields.io/badge/monorepo-pnpm-orange)

## 项目架构

本项目使用 pnpm workspaces 管理的 monorepo 结构：

```
cli_game/
├── packages/
│   ├── engine-core/              # 游戏引擎核心库
│   │   ├── src/
│   │   │   ├── core/             # 底层核心模块
│   │   │   │   ├── terminal.ts   # 终端控制
│   │   │   │   ├── renderer.ts   # 渲染系统
│   │   │   │   └── input.ts      # 输入处理
│   │   │   ├── functions/        # 高级功能封装
│   │   │   │   ├── scene.ts      # 场景管理
│   │   │   │   ├── menu.ts       # 菜单系统
│   │   │   │   ├── progress.ts   # 进度条组件
│   │   │   │   ├── logger.ts     # 日志系统
│   │   │   │   └── utils.ts      # 通用工具
│   │   │   └── index.ts          # 统一导出
│   │   └── package.json
│   │
│   └── cli-game/                 # 贪吃蛇游戏主程序
│       ├── src/
│       │   ├── game.ts           # 游戏逻辑
│       │   └── index.ts          # 入口
│       └── package.json
│
├── package.json                  # 根配置
└── pnpm-workspace.yaml           # pnpm workspace 配置
```

### 包说明

#### `@cli-game/engine-core`
游戏引擎核心库，提供：

**Core 模块（底层基础）**:
- 🖥️ `terminal.ts` - 终端控制（清屏、光标、原始模式）
- 🎨 `renderer.ts` - 渲染系统（GameRenderer、格式化）
- ⌨️ `input.ts` - 输入处理（InputManager、按键映射）
- 📁 `file.ts` - 文件操作（读写、创建、删除、复制等）

**Functions 模块（高级功能）**:
- 🎬 `scene.ts` - 场景管理器（SceneManager、场景切换）
- 📋 `menu.ts` - 菜单系统（InteractiveMenu、确认对话框）
- 📊 `progress.ts` - 进度条（ProgressBar、loading、countdown）
- 📝 `logger.ts` - 日志系统（Logger、带颜色输出）
- 💾 `save.ts` - 存档系统（SaveManager、自动存档、导入导出）
- 🛠️ `utils.ts` - 通用工具（sleep、formatTime、drawTable 等）

#### `cli-game`
依赖 `engine-core`，实现具体的贪吃蛇游戏逻辑。

## 游戏特性

- 🎮 流畅的终端动画
- 🍎 吃食物成长
- ⚡ 速度随分数增加
- ⌨️ 支持 WASD 和方向键控制
- ⏸️ 暂停功能 (P/空格)
- 🔄 游戏结束后可重新开始
- 📘 TypeScript 类型支持

## 快速开始

```bash
# 安装依赖
pnpm install

# 运行游戏
pnpm start

# 或
pnpm --filter cli-game start
```

## 游戏控制

| 按键 | 操作 |
|------|------|
| `W` / `↑` | 向上移动 |
| `S` / `↓` | 向下移动 |
| `A` / `←` | 向左移动 |
| `D` / `→` | 向右移动 |
| `P` / `空格` | 暂停/继续游戏 |
| `Q` / `Esc` | 退出游戏 |
| `R` | 重新开始 |

## 开发命令

| 命令 | 说明 |
|------|------|
| `pnpm start` | 运行游戏 |
| `pnpm dev` | 开发模式（热重载） |
| `pnpm typecheck` | 类型检查所有包 |
| `pnpm build` | 构建所有包 |
| `pnpm clean` | 清理所有构建产物 |

### 单独操作某个包

```bash
# 只构建 engine-core
pnpm --filter @cli-game/engine-core build

# 只运行 cli-game 类型检查
pnpm --filter cli-game typecheck
```

## engine-core 使用示例

### 基础用法 - 使用 Core 模块

```typescript
import { 
  InputManager, 
  GameAction, 
  Direction,
  GameRenderer,
  clearScreen 
} from '@cli-game/engine-core';

// 创建输入管理器
const input = new InputManager({
  onInput: (event) => {
    if (event.action === GameAction.MOVE) {
      console.log('移动方向:', event.direction);
    }
  }
});

// 自定义按键映射
input.bindKey('j', { 
  action: GameAction.MOVE, 
  direction: Direction.DOWN,
  rawKey: { name: 'j' }
});
```

### 高级用法 - 使用 Functions 模块

```typescript
import { 
  SceneManager,
  InteractiveMenu,
  ProgressBar,
  Logger,
  drawTable,
  sleep 
} from '@cli-game/engine-core';

// 场景管理
const sceneManager = new SceneManager();
sceneManager.registerScene({
  name: 'menu',
  onEnter: () => console.log('进入菜单'),
  onRender: () => renderMenu()
});
sceneManager.switchTo('menu');

// 交互式菜单
const menu = new InteractiveMenu({
  title: '主菜单',
  items: [
    { label: '开始游戏', value: 'start', shortcut: 's' },
    { label: '设置', value: 'settings', shortcut: 'o' },
    { label: '退出', value: 'quit', shortcut: 'q' }
  ]
});

// 进度条
const bar = new ProgressBar({
  total: 100,
  title: '加载中',
  showPercent: true
});
bar.update(50);

// 日志系统
const logger = new Logger({ level: LogLevel.DEBUG });
logger.info('游戏启动');
logger.error('发生错误', error);

// 绘制表格
drawTable({
  headers: ['名称', '分数', '时间'],
  rows: [
    ['玩家1', '100', '01:30'],
    ['玩家2', '85', '02:15']
  ],
  align: ['left', 'right', 'center']
});
```

## TypeScript 特性

- ✅ 完整的类型定义
- ✅ 接口和类封装
- ✅ 类型安全的游戏逻辑
- ✅ 模块化设计
- ✅ Monorepo 架构
- ✅ 分层架构（Core + Functions）

## License

ISC
