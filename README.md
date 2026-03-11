# CLI Roguelike RPG

基于 [rot.js](https://ondras.github.io/rot.js/hp/) 和 [ink](https://github.com/vadimdemedes/ink) 构建的终端肉鸽（Roguelike）RPG 游戏。

![版本](https://img.shields.io/badge/version-2.0.0-blue.svg)
![Node](https://img.shields.io/badge/node-%3E%3D18-green.svg)

## 特性

- 🗺️ **随机地图生成** - 使用 rot.js Digger 算法生成房间+走廊式地下城
- 👁️ **视野系统 (FOV)** - 基于 Precise Shadowcasting 的视野计算
- ⚔️ **回合制战斗** - 经典的肉鸽战斗体验
- 🎒 **背包系统** - 30格背包，支持堆叠、筛选、装备
- 📈 **升级系统** - 击败敌人获得经验，提升等级和属性
- 🏰 **多层地下城** - 深入更深的地下城，面对更强的敌人

## 技术栈

- **rot-js** - 肉鸽游戏工具包（地图生成、FOV、寻路等）
- **ink** - React 风格的终端 UI 库
- **TypeScript** - 类型安全的开发体验
- **tsx** - 直接运行 TypeScript 无需预编译

## 安装

```bash
pnpm install
```

## 运行

```bash
# 启动游戏
pnpm start

# 开发模式（热重载）
pnpm dev

# 类型检查
pnpm typecheck

# 构建
pnpm build
```

## 游戏控制

| 按键 | 功能 |
|------|------|
| `WASD` / `↑↓←→` | 移动角色 |
| `E` | 互动（对话/开宝箱/攻击） |
| `G` | 拾取物品 |
| `I` | 打开/关闭背包 |
| `>` | 使用楼梯（下楼） |
| `ESC` / `Q` | 退出游戏 |

### 背包模式

| 按键 | 功能 |
|------|------|
| `↑` / `↓` | 选择物品 |
| `Tab` | 切换分类筛选 |
| `U` | 使用物品 |
| `E` | 装备/卸下 |
| `D` | 丢弃物品 |
| `I` / `ESC` | 关闭背包 |

## 图例

| 符号 | 含义 |
|------|------|
| 🧙 | 玩家 |
| `██` | 墙壁（视野内） |
| `░░` | 墙壁阴影（视野外） |
| 两个空格 | 地板 |
| 🚪 | 门 |
| 🕳️ | 开启的门 |
| 🔽 | 向下的楼梯 |
| 🔼 | 向上的楼梯 |
| 👴 👲 | NPC（村民/商人） |
| 🟢 👺 💀 🦇 👹 🧟 🕷️ 🐍 👻 🐲 | 敌人 |
| 📦 📭 | 宝箱（关闭/开启） |
| ⚔️ 🗡️ | 武器 |
| 👕 👔 🛡️ 🧢 ⛑️ 💍 | 装备 |
| 🧪 📜 | 药水/卷轴 |

## 项目结构

```
packages/cli-game/
├── src/
│   ├── index.tsx          # 游戏入口（ink 渲染）
│   ├── game.ts            # 游戏核心逻辑（rot.js）
│   ├── items.ts           # 物品数据库
│   ├── types.ts           # TypeScript 类型定义
│   └── components/
│       └── Game.tsx       # 游戏 UI 组件（ink）
├── package.json
└── tsconfig.json
```

## 游戏机制

### 战斗系统
- 近战攻击：移动到敌人旁边按 `E` 或直接用方向键撞过去
- 自动反击：敌人会在它们的回合攻击你
- 伤害计算：`伤害 = max(1, 攻击者攻击 - 防御者防御)`

### 装备系统
- **武器**: 提升攻击力
- **护甲**: 提升防御力
- **头盔**: 提供额外生命值
- **盾牌**: 提供防御加成
- **戒指**: 各种属性加成

### 物品稀有度
- `Common` (灰色) - 常见
- `Uncommon` (绿色) - 少见
- `Rare` (蓝色) - 稀有
- `Epic` (紫色) - 史诗
- `Legendary` (金色) - 传说

## 扩展开发

### 添加新怪物
```typescript
// game.ts 中的 ENTITY_TEMPLATES
'goblin_warrior': {
  name: '哥布林战士',
  char: '👺',
  color: '#228B22',
  hp: 40,
  attack: 8,
  defense: 2,
  isHostile: true
}
```

### 添加新物品
```typescript
// items.ts 中的 ITEM_DATABASE
'magic_sword': {
  id: 'magic_sword',
  name: '魔法剑',
  type: ItemType.WEAPON,
  rarity: ItemRarity.RARE,
  description: '散发着魔法光芒的剑',
  char: '⚔️',
  color: '#4169E1',
  stackable: false,
  stats: { attack: 15, mp: 10 },
  equippable: true,
  equipSlot: ItemType.WEAPON
}
```

## License

MIT
