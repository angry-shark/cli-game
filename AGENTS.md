# Roguelike RPG - Agent Documentation

## Project Overview

**Roguelike RPG** 是一个基于 TypeScript 开发的肉鸽（Roguelike）游戏，使用 monorepo 结构管理。

项目核心特性：
- 多地图类型：城镇（Town）、野外（Wilderness）、地下城（Dungeon）
- 世界地图系统：支持多城镇、多野外区域连接和传送
- 建筑内部系统：可进入商店、旅馆、铁匠铺等建筑
- 回合制战斗：带技能、Buff/Debuff 系统的策略战斗
- 角色成长：升级、属性点分配、装备系统

## Technology Stack

| 组件 | 技术 | 版本 | 用途 |
|------|------|------|------|
| 语言 | TypeScript | 5.9+ | 类型安全开发 |
| 游戏引擎 | Phaser | ^3.87.0 | HTML5 游戏渲染 |
| 地图生成 | rot.js | ^2.2.1 | 地图生成、FOV、调度器 |
| UI 框架 | React | ^18.3.1 | UI 覆盖层 |
| 构建工具 | Vite | ^6.2.3 | 开发和生产构建 |
| 包管理 | pnpm | 10.13.0 | Monorepo 管理 |

## Project Structure

```
cli_game/
├── package.json                   # 根配置（scripts 委托到子包）
├── pnpm-workspace.yaml            # pnpm workspace: packages/*
├── pnpm-lock.yaml
├── README.md
└── packages/
    └── cli-game/                  # 游戏主包
        ├── package.json           # 包配置（type: "module"）
        ├── tsconfig.json          # TS 配置（strict: true, JSX: react）
        ├── vite.config.ts         # Vite 配置
        ├── index.html             # HTML 入口
        ├── src/
        │   ├── main.tsx           # React 入口
        │   ├── game.ts            # 游戏核心逻辑（~1500 行）
        │   ├── types.ts           # 类型定义（实体、物品、技能等）
        │   ├── items.ts           # 物品数据库
        │   ├── skills.ts          # 技能数据库
        │   ├── chars.ts           # 字符/Emoji 定义
        │   ├── map-manager.ts     # 地图管理器抽象基类
        │   ├── town-map-manager.ts    # 城镇地图管理
        │   ├── town-generator.ts      # 城镇生成器
        │   ├── wilderness-map-manager.ts  # 野外地图管理
        │   ├── wilderness-generator.ts    # 野外生成器
        │   ├── world-map.ts           # 世界地图系统
        │   ├── building-interior.ts   # 建筑内部系统
        │   ├── phaser/
        │   │   └── GameScene.ts       # Phaser 游戏场景
        │   └── components/
        │       └── App.tsx            # React UI 组件
        ├── assets/                # 资源目录（当前为空）
        ├── saves/                 # 存档目录
        └── dist/                  # 编译输出（Vite 生成）
```

## Key Configuration Files

### packages/cli-game/package.json
```json
{
  "name": "cli-game",
  "type": "module",
  "scripts": {
    "start": "vite",
    "dev": "vite",
    "build": "tsc && vite build",
    "typecheck": "tsc --noEmit",
    "clean": "rm -rf dist"
  },
  "dependencies": {
    "phaser": "^3.87.0",
    "react": "^18.3.1",
    "react-dom": "^18.3.1",
    "rot-js": "^2.2.1"
  },
  "devDependencies": {
    "@types/react": "^18.3.18",
    "@types/react-dom": "^18.3.5",
    "@vitejs/plugin-react": "^4.3.4",
    "vite": "^6.2.3"
  }
}
```

### vite.config.ts
```typescript
import { defineConfig } from 'vite';
import react from '@vitejs/plugin-react';

export default defineConfig({
  plugins: [react()],
  server: {
    port: 3000,
    open: true,
  },
  build: {
    outDir: 'dist',
    sourcemap: true,
  },
});
```

### tsconfig.json
- `target`: ES2022
- `module`: ES2022
- `moduleResolution`: bundler
- `jsx`: react-jsx
- `lib`: ["ES2022", "DOM", "DOM.Iterable"]
- `strict`: true
- `types`: ["vite/client", "node"]

## Build & Development Commands

```bash
# 安装依赖
pnpm install

# 开发模式（热重载）
pnpm dev

# 类型检查（不输出文件）
pnpm typecheck

# 构建（Vite 编译到 dist/）
pnpm build

# 清理
pnpm clean
```

## Architecture Overview

### 1. 渲染层 (Phaser + React)
- **Phaser**: 负责游戏地图、实体渲染和输入处理
  - `GameScene.ts`: 主游戏场景，处理所有渲染和输入
  - 支持地图滚动和视口管理
  - 文本精灵渲染（使用 Emoji 和 ASCII 字符）
  
- **React**: 负责 UI 覆盖层
  - `App.tsx`: 主 UI 组件，显示操作提示
  - 通过 `ui-layer` div 挂载在 Phaser 之上

### 2. 游戏逻辑层 (Game Class)
- **game.ts**: Game 类管理所有游戏状态
- 状态机：EXPLORE → COMBAT → INVENTORY → LEVEL_UP → GAME_OVER
- 集成 rot.js 调度器（ROT.Scheduler.Simple）

### 3. 地图系统
```
MapManager (抽象基类)
├── TownMapManager      # 3x3 区块城镇，动态加载
├── WildernessMapManager # 野外地图，含传送门
└── DungeonMap          # 地下城，房间+走廊生成
```

### 4. 世界地图系统
- **WorldMapManager**: 管理 Town ↔ Wilderness 连接
- 节点类型：TOWN, WILDERNESS, DUNGEON
- 传送门方向：NORTH, SOUTH, EAST, WEST, DUNGEON

### 5. 实体系统
- **EntityType**: PLAYER, NPC, ENEMY, CHEST, DOOR, ITEM
- 敌人模板：slime, goblin, skeleton, bat, orc, troll, spider, snake, ghost, dragon
- NPC 模板：villager, merchant

### 6. 装备系统
- **装备槽位**: weapon, armor, helmet, shield, ring
- **物品类型**: WEAPON, ARMOR, HELMET, SHIELD, RING, CONSUMABLE, MATERIAL
- **稀有度**: Common → Uncommon → Rare → Epic → Legendary

### 7. 技能系统
- **技能类型**: ATTACK, HEAL, BUFF, DEBUFF, SPECIAL
- 玩家技能：slash, power_attack, first_aid, heal, focus, iron_skin, double_strike, fireball
- 敌人技能：slime_split, goblin_stab, skeleton_bash, orc_roar, troll_regen, dragon_breath, venom_bite, ghost_haunt

## Control Scheme

### 探索模式
| 按键 | 功能 |
|------|------|
| WASD / ↑↓←→ | 移动 |
| E | 互动（对话/开门/开宝箱/进入建筑） |
| G | 拾取物品 |
| I | 打开/关闭背包 |
| ESC / Q | 退出游戏 |

### 背包模式
| 按键 | 功能 |
|------|------|
| ↑ / ↓ | 选择物品 |
| Tab | 切换分类筛选 |
| U | 使用物品 |
| E | 装备/卸下 |
| D | 丢弃物品 |
| I / ESC | 关闭背包 |

### 战斗模式
| 按键 | 功能 |
|------|------|
| 1-4 | 使用装备的技能 |
| A | 普通攻击 |
| ESC | 等待/跳过 |

## Development Conventions

### 1. 文件命名
- 组件: PascalCase (App.tsx, GameScene.ts)
- 模块: camelCase (game.ts, items.ts)
- 类型定义: PascalCase (types.ts 中)

### 2. Import 规范
- 使用 `.js` 扩展名（ES Module 要求）：
```typescript
import { Game } from './game.js';
import { Item } from './types.js';
```

### 3. 类型安全
- 所有类型定义集中导出
- 使用枚举代替字符串字面量
- 复杂类型使用 interface 定义

## Key Implementation Details

### 1. Phaser 游戏配置
```typescript
const config: Phaser.Types.Core.GameConfig = {
  type: Phaser.AUTO,
  parent: 'game-container',
  width: window.innerWidth,
  height: window.innerHeight,
  backgroundColor: '#1a1a2e',
  scene: [GameScene],
  scale: {
    mode: Phaser.Scale.RESIZE,
    autoCenter: Phaser.Scale.CENTER_BOTH,
  },
};
```

### 2. 游戏状态更新机制
Game 类持有 `onUpdate` 回调，触发 Phaser 场景重新渲染：
```typescript
// game.ts
this.onUpdate(); // 状态变更后调用

// GameScene.ts
private onGameUpdate(): void {
  this.renderGame();
}
```

### 3. 视野计算 (FOV)
使用 rot.js 的 PreciseShadowcasting：
```typescript
this.fov = new ROT.FOV.PreciseShadowcasting((x, y) => {
  return this.isTransparent(x, y);
});
```

### 4. 地下城生成
使用 ROT.Map.Digger 算法：
```typescript
const digger = new ROT.Map.Digger(width, height, {
  roomWidth: [4, 10],
  roomHeight: [4, 8],
  corridorLength: [2, 6],
  dugPercentage: 0.2
});
```

### 5. 调度系统
使用 rot.js 的简单调度器：
```typescript
this.scheduler = new ROT.Scheduler.Simple();
this.scheduler.add(this, true);
this.engine = new ROT.Engine(this.scheduler);
```

## Testing Strategy

当前项目**无自动化测试**。测试通过以下方式进行：
1. **手动测试**: 运行 `pnpm dev` 进行游戏测试
2. **类型检查**: `pnpm typecheck` 确保类型安全
3. **构建验证**: `pnpm build` 确保无编译错误

## Extending the Game

### 添加新物品
```typescript
// items.ts
'magic_sword': {
  id: 'magic_sword',
  name: '魔法剑',
  type: ItemType.WEAPON,
  rarity: ItemRarity.RARE,
  description: '散发着魔法光芒',
  char: '⚔️',
  color: '#4169E1',
  stackable: false,
  stats: { attack: 15, mp: 10 },
  equippable: true,
  equipSlot: ItemType.WEAPON
}
```

### 添加新敌人
```typescript
// game.ts 中的 ENTITY_TEMPLATES
'werewolf': {
  name: '狼人',
  char: '🐺',
  color: '#808080',
  hp: 60,
  attack: 12,
  defense: 4,
  isHostile: true
}
```

### 添加新技能
```typescript
// skills.ts
'ice_shard': {
  id: 'ice_shard',
  name: '冰锥术',
  description: '发射冰锥造成冰冻伤害',
  type: SkillType.ATTACK,
  icon: '❄️',
  effects: [{ type: 'damage', value: 1.8, target: 'enemy' }],
  cooldown: 3,
  currentCooldown: 0,
  mpCost: 15,
  power: 1.8
}
```

## Dependencies

### Production
- `phaser`: HTML5 游戏引擎
- `react` / `react-dom`: UI 框架
- `rot-js`: 地图生成和 FOV 计算

### Development
- `typescript`: 类型系统
- `vite`: 构建工具
- `@vitejs/plugin-react`: React 插件
- `@types/react`, `@types/react-dom`, `@types/node`: 类型定义
