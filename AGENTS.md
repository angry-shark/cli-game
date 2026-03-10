# Project Overview

## 项目简介

**CLI RPG** 是一个基于 TypeScript 开发的终端角色扮演游戏，采用 pnpm monorepo 架构。

项目包含：
- **engine-core** - 自研的终端游戏引擎核心
- **cli-game** - 基于引擎构建的 RPG 游戏

## 技术栈

- **语言**: TypeScript 5.9
- **运行环境**: Node.js (ES2022)
- **构建工具**: tsc + tsx
- **包管理**: pnpm workspaces

## 项目结构

```
cli_game/
├── packages/
│   ├── engine-core/               # @cli-game/engine-core
│   │   ├── src/
│   │   │   ├── core/              # 底层核心模块
│   │   │   │   ├── terminal.ts    # 终端控制
│   │   │   │   ├── renderer.ts    # 渲染系统
│   │   │   │   ├── input.ts       # 输入处理
│   │   │   │   └── file.ts        # 文件操作
│   │   │   ├── functions/         # 高级功能封装
│   │   │   │   ├── scene.ts       # 场景管理
│   │   │   │   ├── menu.ts        # 菜单系统
│   │   │   │   ├── progress.ts    # 进度条
│   │   │   │   ├── logger.ts      # 日志系统
│   │   │   │   ├── save.ts        # 存档系统
│   │   │   │   ├── viewport.ts    # 视口/地图系统
│   │   │   │   ├── panel.ts       # UI 面板系统
│   │   │   │   ├── inventory.ts   # 背包/物品系统
│   │   │   │   └── utils.ts       # 通用工具
│   │   │   └── index.ts           # 统一导出
│   │   ├── dist/
│   │   ├── package.json
│   │   └── tsconfig.json
│   └── cli-game/                  # cli-game (RPG游戏)
│       ├── src/
│       │   ├── index.ts           # 入口
│       │   └── rpg-game.ts        # 游戏逻辑
│       ├── package.json
│       └── tsconfig.json
├── package.json                   # 根配置
├── pnpm-workspace.yaml            # pnpm workspace 配置
└── README.md
```

## Monorepo 架构

### 依赖关系

```
cli-game (RPG游戏)
    ↓ 依赖
@cli-game/engine-core (游戏引擎)
    ├── core/ (底层基础)
    │   ├── terminal.ts  - 清屏、光标、原始模式
    │   ├── renderer.ts  - GameRenderer、格式化
    │   ├── input.ts     - InputManager、按键映射
    │   └── file.ts      - 读写文件、目录操作
    └── functions/ (高级功能)
        ├── scene.ts     - 场景管理器
        ├── menu.ts      - 交互式菜单
        ├── progress.ts  - 进度条、加载动画
        ├── logger.ts    - 彩色日志系统
        ├── save.ts      - 存档管理器
        ├── viewport.ts  - 视口/相机、瓦片地图 ⭐
        ├── panel.ts     - UI面板、HUD ⭐
        ├── inventory.ts - 背包、物品、装备 ⭐
        └── utils.ts     - 工具函数
```

### ⭐ RPG 核心功能

#### viewport.ts - 视口/地图系统
- `Viewport` - 视口/相机，支持跟随和平滑移动
- `TileMap` - 瓦片地图，支持多实体管理
- `MapRenderer` - 地图渲染器
- `generateRoomMap()` - 随机房间地图生成
- `TILES` - 预定义瓦片库（墙、地板、门、宝箱等）

#### panel.ts - UI 面板系统
- `Panel` - 基础面板容器
- `HUD` - 角色状态 HUD，自动更新
- `MessageLog` - 消息日志
- `renderHealthBar()` - 彩色血条（绿/黄/红）
- `renderExpBar()` - 经验条
- `SplitLayout` - 分割布局

#### inventory.ts - 背包系统
- `Inventory` - 完整背包（堆叠、分类、装备槽）
- `InventoryPanel` - 背包 UI（支持筛选）
- `ItemDetailPanel` - 物品详情
- `EquipmentPanel` - 装备面板
- `ITEM_DATABASE` - 物品模板库
- `ItemType` / `ItemRarity` - 枚举类型

## 游戏特性

| 功能 | 实现 |
|------|------|
| 地图探索 | 随机生成房间+走廊的地下城 |
| 角色移动 | WASD/方向键，视口跟随 |
| 角色面板 | 实时显示 HP/MP/EXP/属性/装备 |
| 背包系统 | 30格背包，支持堆叠、分类筛选、使用、装备、丢弃 |
| 存档系统 | 快速存档/读档 |
| 随机事件 | 探索时触发金币、宝箱等事件 |

## 开发命令

```bash
# 安装依赖
pnpm install

# 运行游戏
pnpm start

# 开发模式
pnpm dev

# 类型检查
pnpm typecheck

# 构建
pnpm build

# 清理
pnpm clean
```

## 代码规范

- 使用严格类型检查 (`strict: true`)
- 每个包独立 tsconfig.json
- 包间通过 `workspace:*` 协议依赖
- 公共 API 必须导出类型定义
- Core 模块提供原子能力，Functions 模块提供高级封装
- 游戏逻辑与引擎分离，便于复用引擎

## 扩展指南

### 添加新地图类型

```typescript
// viewport.ts
export const TILES = {
  // ... 现有类型
  TRAP: { char: '^', walkable: true, transparent: true } as Tile,
  PORTAL: { char: '○', walkable: true, transparent: true } as Tile
};
```

### 添加新物品

```typescript
// inventory.ts
ITEM_DATABASE['legendary_sword'] = {
  id: 'legendary_sword',
  name: '传说之剑',
  type: ItemType.WEAPON,
  rarity: ItemRarity.LEGENDARY,
  // ...
};
```

### 添加新怪物

```typescript
// rpg-game.ts
interface Monster {
  name: string;
  hp: number;
  attack: number;
  tile: Tile;
}

// 在地图生成时添加怪物
this.map.addEntity('slime_1', x, y, { char: 's', walkable: false, ... });
```
