# Project Overview

## 项目简介

**cli_game** 是一个基于 TypeScript 开发的终端游戏，采用 pnpm monorepo 架构, 除了终端游戏本体以外, 还包含了一个自己实现的终端游戏引擎。

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
│   │   │   │   └── utils.ts       # 通用工具
│   │   │   └── index.ts           # 统一导出
│   │   ├── dist/
│   │   ├── package.json
│   │   └── tsconfig.json
│   └── cli-game/                  # cli-game
│       ├── src/
│       │   ├── index.ts           # 入口
│       │   └── game.ts            # 游戏逻辑
│       ├── package.json
│       └── tsconfig.json
├── package.json                   # 根配置
├── pnpm-workspace.yaml            # pnpm workspace 配置
└── README.md
```

## Monorepo 架构

### 依赖关系

```
cli-game
    ↓ 依赖
@cli-game/engine-core
    ├── core/
    │   ├── terminal.ts
    │   ├── renderer.ts
    │   ├── input.ts
    │   └── file.ts
    └── functions/
        ├── scene.ts
        ├── menu.ts
        ├── progress.ts
        ├── logger.ts
        ├── save.ts
        └── utils.ts
```

### 包说明

#### @cli-game/engine-core
- 独立的 npm 包，可被其他项目复用
- 提供终端游戏开发的基础设施
- **分层架构**：
  - `core/` - 底层基础能力（终端、渲染、输入、文件）
  - `functions/` - 基于 core 封装的高级功能（场景、菜单、进度条等）

#### cli-game
- 依赖 engine-core
- 实现具体的终端游戏逻辑

## 架构设计原则

### Core 模块
- 提供最基础的、原子化的能力
- 不依赖任何外部模块
- 可独立使用

### Functions 模块
- 基于 Core 模块构建
- 提供更高级的、开箱即用的功能
- 简化常见开发场景

## 开发命令

```bash
# 根目录命令（操作所有包）
pnpm install           # 安装所有依赖
pnpm build             # 构建所有包
pnpm typecheck         # 类型检查所有包
pnpm clean             # 清理所有构建产物

# 包级别命令
pnpm --filter @cli-game/engine-core build
pnpm --filter cli-game dev
```

## 代码规范

- 使用严格类型检查 (`strict: true`)
- 每个包独立 tsconfig.json
- 包间通过 `workspace:*` 协议依赖
- 公共 API 必须导出类型定义
- engine-core 代码分层：core（底层）和 functions（高级功能）
