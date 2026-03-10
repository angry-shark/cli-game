# CLI RPG 🗡️

一个基于 TypeScript 的终端角色扮演游戏！

![game](https://img.shields.io/badge/game-RPG-red)
![typescript](https://img.shields.io/badge/TypeScript-5.0-blue)
![monorepo](https://img.shields.io/badge/monorepo-pnpm-orange)

## 游戏特性

- 🗺️ **地图探索** - 随机生成的地下城地图
- 🏃 **角色移动** - WASD/方向键控制角色在地图中移动
- 💼 **背包系统** - 完整的物品管理、装备、使用
- 📊 **角色面板** - 实时显示 HP/MP/经验值/属性
- 💾 **存档系统** - 支持快速存档/读档
- 🎯 **随机事件** - 探索中触发各种事件

## 游戏控制

### 探索模式

| 按键 | 操作 |
|------|------|
| `W` / `↑` | 向上移动 |
| `S` / `↓` | 向下移动 |
| `A` / `←` | 向左移动 |
| `D` / `→` | 向右移动 |
| `I` | 打开背包 |
| `S` | 快速存档 |
| `L` | 快速读档 |
| `Q` / `ESC` | 退出游戏 |

### 背包模式

| 按键 | 操作 |
|------|------|
| `↑` / `↓` | 选择物品 |
| `Tab` | 切换分类筛选 |
| `U` | 使用物品 |
| `E` | 装备/卸下 |
| `D` | 丢弃物品 |
| `I` / `ESC` | 关闭背包 |

## 快速开始

```bash
# 安装依赖
pnpm install

# 运行游戏
pnpm start

# 或
pnpm --filter cli-game start
```

## 项目架构

```
cli_game/
├── packages/
│   ├── engine-core/              # 游戏引擎核心库
│   │   ├── src/
│   │   │   ├── core/             # 底层核心模块
│   │   │   │   ├── terminal.ts   # 终端控制
│   │   │   │   ├── renderer.ts   # 渲染系统
│   │   │   │   ├── input.ts      # 输入处理
│   │   │   │   └── file.ts       # 文件操作
│   │   │   └── functions/        # 高级功能封装
│   │   │       ├── scene.ts      # 场景管理
│   │   │       ├── menu.ts       # 菜单系统
│   │   │       ├── progress.ts   # 进度条
│   │   │       ├── logger.ts     # 日志系统
│   │   │       ├── save.ts       # 存档系统
│   │   │       ├── viewport.ts   # 视口/地图系统 ⭐
│   │   │       ├── panel.ts      # UI 面板系统 ⭐
│   │   │       └── inventory.ts  # 背包/物品系统 ⭐
│   │   └── package.json
│   │
│   └── cli-game/                 # RPG 游戏主程序
│       ├── src/
│       │   ├── index.ts          # 入口
│       │   └── rpg-game.ts       # 游戏逻辑
│       └── package.json
│
├── package.json                  # 根配置
└── pnpm-workspace.yaml           # pnpm workspace 配置
```

### ⭐ 新增核心功能

#### `functions/viewport.ts`
- `Viewport` - 视口/相机系统，支持跟随和平滑移动
- `TileMap` - 瓦片地图，支持实体管理和图层
- `MapRenderer` - 地图渲染器
- `generateRoomMap()` - 随机房间地图生成器
- `TILES` - 预定义瓦片类型（墙壁、地板、门、楼梯等）

#### `functions/panel.ts`
- `Panel` - 基础面板容器
- `HUD` - 角色状态 HUD
- `MessageLog` - 消息日志面板
- `renderHealthBar()` - 彩色血条
- `renderExpBar()` - 经验条
- `SplitLayout` - 分割布局管理

#### `functions/inventory.ts`
- `Inventory` - 背包系统（支持堆叠、分类、装备）
- `InventoryPanel` - 背包 UI 面板
- `ItemDetailPanel` - 物品详情面板
- `EquipmentPanel` - 装备面板
- `ITEM_DATABASE` - 预定义物品库
- `createItem()` - 物品工厂函数

## 游戏截图

```
╔══════════════════════════════════════╗┌────────────────────────┐
║······································║│        状态            │
║········@·····························║├────────────────────────┤
║··················█···················║│ 勇者  Lv.1             │
║··················█···················║│ HP: ████████████ 100/100│
║······································║│ MP: ▓▓▓▓▓▓▓░░░░░ 50/50 │
║······································║│ EXP: █████░░░░░░░ 30/100│
║·················□····················║├────────────────────────┤
║······································║│ 💰 100 G               │
║······································╚╪════════════════════════╝
║······································│  消息                  │
║······································│  欢迎来到 CLI RPG！    │
║······································│  使用 WASD 移动...     │
║······································│                        │
╚══════════════════════════════════════╝└────────────────────────┘
[WASD]移动 [I]背包 [S]存档 [L]读档 [ESC]退出
```

## 开发命令

| 命令 | 说明 |
|------|------|
| `pnpm start` | 运行游戏 |
| `pnpm dev` | 开发模式（热重载） |
| `pnpm typecheck` | 类型检查所有包 |
| `pnpm build` | 构建所有包 |

## 扩展开发

### 添加新物品

```typescript
// 在 engine-core 的 ITEM_DATABASE 中添加
const ITEM_DATABASE: Record<string, Item> = {
  'magic_sword': {
    id: 'magic_sword',
    name: '魔法剑',
    description: '散发着魔法光芒的长剑',
    type: ItemType.WEAPON,
    rarity: ItemRarity.RARE,
    icon: '⚔️',
    stackable: false,
    maxStack: 1,
    value: 500,
    stats: { attack: 25, mp: 10 },
    equippable: true,
    equipSlot: 'weapon'
  }
};
```

### 创建新地图

```typescript
import { TileMap, TILES, Viewport, MapRenderer } from '@cli-game/engine-core';

const map = new TileMap(50, 30, TILES.FLOOR);
// 设置墙壁
map.setTile(10, 10, TILES.WALL);
// 添加实体
map.addEntity('chest', 15, 15, TILES.CHEST);
```

## TypeScript 特性

- ✅ 完整的类型定义
- ✅ 分层架构（Core + Functions）
- ✅ Monorepo 包管理
- ✅ 类型安全的游戏逻辑

## License

ISC
