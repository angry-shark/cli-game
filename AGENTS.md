# Project Overview

## 项目简介

**CLI Roguelike RPG** 是一个基于 TypeScript 开发的终端肉鸽（Roguelike）游戏。

项目使用：
- **rot.js** - 肉鸽游戏工具包（地图生成、FOV、寻路等）
- **ink** - React 风格的终端 UI 库
- **TypeScript 5.9** - 类型安全的开发体验

## 技术栈

- **语言**: TypeScript 5.9
- **运行环境**: Node.js 18+ (ES2022)
- **游戏引擎**: rot.js
- **UI 框架**: ink (React for Terminal)
- **包管理**: pnpm

## 项目结构

```
cli_game/
├── packages/
│   └── cli-game/                  # 游戏主包
│       ├── src/
│       │   ├── index.tsx          # 游戏入口（ink 渲染）
│       │   ├── game.ts            # 游戏核心逻辑（rot.js）
│       │   ├── items.ts           # 物品数据库
│       │   ├── types.ts           # TypeScript 类型定义
│       │   └── components/
│       │       └── Game.tsx       # 游戏 UI 组件（ink）
│       ├── dist/                  # 编译输出
│       ├── package.json
│       └── tsconfig.json
├── package.json                   # 根配置
├── pnpm-workspace.yaml            # pnpm workspace 配置
└── README.md
```

## 核心功能

### 地图系统 (rot.js)
- `ROT.Map.Digger` - 房间+走廊式地下城生成
- `ROT.FOV.PreciseShadowcasting` - 精确阴影投射视野计算
- 可探索的迷雾系统

### 游戏机制
- 回合制战斗
- 视野范围限制
- 多层地下城
- 敌人 AI（追踪玩家）
- 升级系统

### 背包系统
- 30格背包容量
- 物品堆叠
- 分类筛选
- 装备槽位（武器、护甲、头盔、盾牌、戒指）

### UI 系统 (ink)
- React 组件式 UI
- 实时渲染
- 键盘事件处理
- 响应式布局

## 开发命令

```bash
# 安装依赖
pnpm install

# 运行游戏
pnpm start

# 开发模式（热重载）
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
- React 函数式组件 + Hooks
- 组件与游戏逻辑分离
- 类型定义集中在 types.ts

## 扩展指南

### 添加新怪物
```typescript
// game.ts 中的 ENTITY_TEMPLATES
'dark_knight': {
  name: '黑暗骑士',
  char: '⚔️',
  color: '#4B0082',
  hp: 100,
  attack: 15,
  defense: 8,
  isHostile: true
}
```

### 添加新物品
```typescript
// items.ts 中的 ITEM_DATABASE
'flame_sword': {
  id: 'flame_sword',
  name: '烈焰剑',
  type: ItemType.WEAPON,
  rarity: ItemRarity.EPIC,
  description: '剑身燃烧着永不熄灭的火焰',
  char: '🔥',
  color: '#FF4500',
  stackable: false,
  stats: { attack: 25, critical: 10 },
  equippable: true,
  equipSlot: ItemType.WEAPON
}
```

### 添加新地图特性
```typescript
// game.ts 中的 TILES
TRAP: { 
  char: '^', 
  color: '#FF0000', 
  bgColor: '#1a1a1a', 
  walkable: true, 
  transparent: true 
}
```

## 依赖说明

### 生产依赖
- `rot-js`: ^2.2.1 - 肉鸽游戏工具包
- `ink`: ^5.2.0 - React 终端 UI
- `react`: ^18.3.1 - React 核心

### 开发依赖
- `typescript`: ^5.9.3
- `tsx`: ^4.21.0 - TypeScript 执行器
- `@types/react`: ^18.3.18
- `@types/node`: ^25.4.0
