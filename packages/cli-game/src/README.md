# 项目目录结构

本目录按照功能模块进行组织，采用分层架构设计。

## 目录结构

```
src/
├── core/           # 游戏核心逻辑
│   ├── game.ts         # 原游戏主类（旧版，保留参考）
│   ├── game-ecs.ts     # ECS 架构游戏主类（当前使用）
│   └── types.ts        # 全局类型定义
├── ecs/            # ECS (Entity-Component-System) 架构
│   ├── components/     # 组件定义
│   ├── systems/        # 系统定义
│   ├── World.ts        # ECS 世界实现
│   └── types.ts        # ECS 类型定义
├── data/           # 游戏数据定义
│   ├── items.ts        # 物品数据库
│   ├── skills.ts       # 技能数据库
│   └── chars.ts        # 字符/Emoji 定义
├── map/            # 地图生成与管理
│   ├── map-manager.ts          # 地图管理器基类
│   ├── town-map-manager.ts     # 城镇地图管理
│   ├── town-generator.ts       # 城镇生成器
│   ├── wilderness-map-manager.ts # 野外地图管理
│   ├── wilderness-generator.ts   # 野外生成器
│   ├── world-map.ts            # 世界地图系统
│   └── building-interior.ts    # 建筑内部系统
├── render/         # 渲染层
│   └── phaser/
│       └── GameScene.ts        # Phaser 游戏场景
├── ui/             # UI 层
│   ├── main.tsx              # React 入口
│   └── components/
│       └── App.tsx           # React UI 组件
├── utils/          # 工具/临时文件
│   └── items_temp.ts       # 临时物品数据
└── vite-env.d.ts   # Vite 类型声明
```

## 架构说明

### Core (核心层)
包含游戏的核心逻辑和类型定义。
- `game-ecs.ts`: 基于 ECS 架构的游戏主类，协调各系统工作
- `types.ts`: 全局 TypeScript 类型定义

### ECS (实体-组件-系统)
ECS 架构的实现，将游戏逻辑拆分为：
- **Components**: 纯数据组件（位置、生命值、装备等）
- **Systems**: 处理逻辑的系统（移动、战斗、AI 等）
- **World**: 管理所有实体和系统的容器

### Data (数据层)
游戏静态数据定义：
- 物品、技能、字符等配置数据
- 不包含业务逻辑

### Map (地图层)
地图相关的生成和管理：
- 城镇、野外、地下城等不同地图类型
- 世界地图系统（连接不同区域）
- 建筑内部场景

### Render (渲染层)
与渲染引擎相关的代码：
- Phaser 游戏场景
- 未来可扩展其他渲染引擎（如 Three.js）

### UI (界面层)
用户界面相关代码：
- React 组件
- UI 状态管理

### Utils (工具层)
临时文件和工具函数：
- 开发中的代码
- 测试数据

## 导入规范

```typescript
// 从 core 导入
import { GameECS } from '../core/game-ecs.js';
import { Entity } from '../core/types.js';

// 从 ecs 导入
import { Position, Health } from '../ecs/components/index.js';
import { MovementSystem } from '../ecs/systems/index.js';

// 从 data 导入
import { createItem } from '../data/items.js';

// 从 map 导入
import { TownMapManager } from '../map/town-map-manager.js';

// 从 render 导入（UI 层）
import { GameScene } from '../render/phaser/GameScene.js';
```

## 添加新功能

### 添加新组件
1. 在 `ecs/components/index.ts` 中定义组件类
2. 导出组件类型

### 添加新系统
1. 在 `ecs/systems/index.ts` 中实现 System 接口
2. 在 `GameECS.registerSystems()` 中注册系统

### 添加新地图类型
1. 在 `map/` 目录创建新的管理器和生成器
2. 继承 `MapManager` 基类
3. 在 `GameECS` 中集成新地图

### 添加新物品/技能
1. 在 `data/items.ts` 或 `data/skills.ts` 中添加数据
2. 更新相应的数据库对象
