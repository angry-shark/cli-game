# Roguelike RPG

基于 [Phaser](https://phaser.io/) 和 [rot.js](https://ondras.github.io/rot.js/hp/) 构建的跨平台肉鸽（Roguelike）RPG 游戏。

![版本](https://img.shields.io/badge/version-2.0.0-blue.svg)
![Node](https://img.shields.io/badge/node-%3E%3D18-green.svg)
![Phaser](https://img.shields.io/badge/phaser-3.87.0-orange.svg)

## 特性

- 🗺️ **随机地图生成** - 使用 rot.js Digger 算法生成房间+走廊式地下城
- 👁️ **视野系统 (FOV)** - 基于 Precise Shadowcasting 的视野计算
- ⚔️ **回合制战斗** - 经典的肉鸽战斗体验，带技能和 Buff/Debuff
- 🎒 **背包系统** - 30格背包，支持堆叠、筛选、装备
- 📈 **升级系统** - 击败敌人获得经验，自由分配属性点
- 🏰 **多层地下城** - 深入更深的地下城，面对更强的敌人
- 🌍 **世界地图** - 城镇、野外、地下城自由探索
- 🏘️ **建筑系统** - 可进入商店、旅馆、铁匠铺等建筑
- 🎯 **多平台支持** - Web、iOS、Android、Windows、macOS、Linux、微信小程序、抖音小游戏、Steam

## 技术栈

| 技术 | 版本 | 用途 |
|------|------|------|
| **Phaser** | ^3.87.0 | HTML5 游戏渲染引擎 |
| **rot.js** | ^2.2.1 | 地图生成、FOV、调度器 |
| **React** | ^18.3.1 | UI 覆盖层 |
| **TypeScript** | ^5.9 | 类型安全开发 |
| **Vite** | ^6.2.3 | 构建工具 |
| **Capacitor** | ^8.1.0 | iOS/Android 打包 |
| **Tauri** | v2 | Windows/macOS/Linux 打包 |

## 快速开始

### 安装依赖

```bash
pnpm install
```

### 开发模式

```bash
# Web 开发
pnpm dev

# 桌面端开发
pnpm dev:desktop
```

### 构建

```bash
# Web 版本
pnpm build:web

# 所有平台
pnpm build:all
```

## 游戏控制

| 按键 | 功能 |
|------|------|
| `WASD` / `↑↓←→` | 移动角色 |
| `E` | 互动（对话/开门/开宝箱/使用传送门） |
| `G` | 拾取物品/采集资源 |
| `I` | 打开/关闭背包 |
| `ESC` / `Q` | 退出/取消 |

### 背包模式

| 按键 | 功能 |
|------|------|
| `↑` / `↓` | 选择物品 |
| `Tab` | 切换分类筛选 |
| `U` | 使用物品 |
| `E` | 装备/卸下 |
| `D` | 丢弃物品 |
| `I` / `ESC` | 关闭背包 |

### 战斗模式

| 按键 | 功能 |
|------|------|
| `1-4` | 使用技能 |
| `A` | 普通攻击 |
| `D` | 防御 |
| `R` | 撤退 |
| `ESC` | 等待/跳过 |

## 图例

| 符号 | 含义 |
|------|------|
| 🧙 | 玩家 |
| `██` | 墙壁 |
| `░░` | 地板/草地 |
| `▓▓` | 道路 |
| 🚪 | 门口 |
| 🌲 | 树木 |
| 👴 👲 | NPC（村民/商人） |
| 🔮 | 传送门 |
| 💰 🍺 ⚒️ | 建筑（商店/旅馆/铁匠铺） |
| 🟢 👺 💀 🦇 👹 🧟 🕷️ 🐍 👻 🐲 | 敌人 |
| 📦 | 宝箱 |
| ⚔️ 🗡️ | 武器 |
| 👕 🛡️ | 护甲/盾牌 |
| 🧢 ⛑️ | 头盔 |
| 💍 | 戒指 |
| 🧪 | 药水 |

## 项目结构

```
packages/cli-game/
├── src/
│   ├── main.tsx              # React 入口
│   ├── game.ts               # 游戏核心逻辑
│   ├── types.ts              # TypeScript 类型定义
│   ├── items.ts              # 物品数据库
│   ├── skills.ts             # 技能数据库
│   ├── steam-config.ts       # Steam 配置
│   ├── steam-integration.ts  # Steamworks 集成
│   ├── phaser/
│   │   └── GameScene.ts      # Phaser 游戏场景
│   └── components/
│       └── App.tsx           # React UI 组件
├── src-tauri/                # Tauri 桌面端配置
├── scripts/                  # 打包脚本
│   ├── wechat-adapt.js       # 微信小程序适配
│   ├── bytedance-adapt.js    # 抖音小游戏适配
│   └── steam-prepare.js      # Steam 发行准备
├── capacitor.config.json     # Capacitor 配置
├── vite.config.ts            # Vite 配置
├── index.html                # HTML 入口
├── package.json
└── tsconfig.json
```

## 多平台打包

### 支持平台

| 目标平台 | 推荐方案 | 包体积 | 技术栈匹配度 | 适用场景 |
|---------|---------|--------|-------------|---------|
| **Web** | Vite | ~500KB | ⭐⭐⭐⭐⭐ | 浏览器游玩 |
| **iOS/Android** | Capacitor | ~5MB | ⭐⭐⭐⭐⭐ | 上架 App Store/应用宝 |
| **Windows/macOS/Linux** | Tauri v2 | ~3MB | ⭐⭐⭐⭐⭐ | Steam 上架、独立客户端 |
| **微信小程序** | 微信开发者工具 | ~2MB | ⭐⭐⭐ | 国内社交传播 |
| **抖音/QQ 小游戏** | 对应厂商 SDK | ~2MB | ⭐⭐⭐ | 短视频平台引流 |
| **Steam** | Tauri + Steamworks | ~5MB | ⭐⭐⭐⭐ | PC 独立游戏发行 |

### 前置要求

#### Web
- Node.js 18+
- pnpm 10+

#### Desktop (Tauri)
- **Rust**: [安装 Rust](https://rustup.rs/)
- **Windows**: Microsoft Visual Studio C++ Build Tools
- **macOS**: Xcode Command Line Tools
- **Linux**: 
  ```bash
  sudo apt-get install build-essential libgtk-3-dev libwebkit2gtk-4.0-dev
  ```

#### Mobile (Capacitor)
- **Android**: Android Studio + JDK 11+
- **iOS**: Xcode 14+ (仅 macOS)

#### 微信小程序
- 微信开发者工具
- 微信小程序开发者账号

#### 抖音小游戏
- 抖音开发者工具
- 字节跳动开发者账号

#### Steam
- Steam 开发者账号
- Steamworks SDK

### 构建命令

#### Web

```bash
# 开发模式
pnpm dev

# 构建生产版本
pnpm build:web

# 预览生产版本
pnpm preview:web
```

#### Desktop (Windows/macOS/Linux)

```bash
# 开发模式（带桌面壳）
pnpm dev:desktop

# 构建所有桌面平台
pnpm build:desktop

# 构建特定平台
pnpm build:desktop:mac        # macOS ARM64 (Apple Silicon)
pnpm build:desktop:mac-intel  # macOS Intel
pnpm build:desktop:win        # Windows
pnpm build:desktop:linux      # Linux

# Tauri 命令
pnpm tauri -- --help
```

#### Mobile (iOS/Android)

```bash
# 初始化 Capacitor（首次运行）
pnpm cap:init
pnpm cap:add:android
pnpm cap:add:ios

# 构建所有移动端
pnpm build:mobile

# Android
pnpm build:mobile:android           # Release APK
pnpm build:mobile:android:debug     # Debug APK
pnpm cap:open:android               # 打开 Android Studio

# iOS
pnpm build:mobile:ios               # Release
pnpm build:mobile:ios:simulator     # Simulator
pnpm cap:open:ios                   # 打开 Xcode

# 同步 Web 到原生项目
pnpm cap:sync
pnpm cap:copy                       # 仅复制资源
pnpm cap:update                     # 更新依赖
```

#### 微信小程序

```bash
# 构建并适配
pnpm build:wechat

# 开发模式
pnpm wechat:dev
```

**发布步骤：**
1. 运行 `pnpm build:wechat`
2. 使用微信开发者工具打开 `dist-wechat` 目录
3. 点击「预览」或「上传」

#### 抖音小游戏

```bash
# 构建并适配
pnpm build:bytedance

# 开发模式
pnpm bytedance:dev
```

**发布步骤：**
1. 运行 `pnpm build:bytedance`
2. 使用抖音开发者工具打开 `dist-bytedance` 目录
3. 点击「预览」或「上传」

#### Steam

```bash
# 构建桌面版并准备 Steam 文件
pnpm build:steam

# Steam 开发模式
pnpm steam:dev
```

**发布步骤：**
1. 在 [Steamworks](https://partner.steamgames.com/) 创建应用，获取 App ID
2. 编辑 `src/steam-config.ts`，替换 `STEAM_APP_ID`
3. 运行 `pnpm build:steam`
4. 使用 Steamworks SDK 上传
   ```bash
   steamcmd +login <username> +run_app_build <projectdir>/app.vdf +quit
   ```

**Steam 功能集成：**
```typescript
import { steam } from './steam-integration.js';

// 初始化
await steam.init();

// 解锁成就
steam.unlockAchievement('ACH_FIRST_WIN');

// 设置统计
steam.setStat('STAT_ENEMIES_DEFEATED', 100);

// Steam Cloud 存档
await steam.saveToCloud('save1.json', JSON.stringify(gameData));
const data = await steam.loadFromCloud('save1.json');
```

### 批量构建

```bash
# 构建所有平台（Web + Desktop + Mobile）
pnpm build:all
```

## 游戏机制

### 战斗系统
- **回合制**: 玩家和敌人轮流行动
- **技能系统**: 消耗 MP 释放强力技能
- **Buff/Debuff**: 攻击提升、防御提升、中毒等状态效果
- **伤害计算**: `伤害 = max(1, 攻击者攻击 × 技能倍率 - 防御者防御)`

### 装备系统
- **武器**: 提升攻击力
- **护甲**: 提升防御力
- **头盔**: 提供额外生命值和防御
- **盾牌**: 提供防御加成
- **戒指**: 各种属性加成（暴击、速度等）

### 物品稀有度
- `Common` (灰色) - 常见
- `Uncommon` (绿色) - 少见
- `Rare` (蓝色) - 稀有
- `Epic` (紫色) - 史诗
- `Legendary` (金色) - 传说

### 技能系统

**玩家技能：**
- 斩击 (Slash) - 基础攻击
- 强力攻击 (Power Attack) - 高伤害攻击
- 急救 (First Aid) - 恢复少量 HP
- 治疗 (Heal) - 恢复大量 HP
- 专注 (Focus) - 提升攻击力
- 铁皮 (Iron Skin) - 提升防御力
- 双重打击 (Double Strike) - 攻击两次
- 火球术 (Fireball) - 范围魔法伤害

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
  isHostile: true,
  skills: ['goblin_stab']
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
  mpCost: 15,
  power: 1.8
}
```

## 配置说明

### Capacitor 配置

编辑 `capacitor.config.json`：

```json
{
  "appId": "com.example.roguelikerpg",
  "appName": "Roguelike RPG",
  "webDir": "dist",
  "android": {
    "buildOptions": {
      "keystorePath": "android/keystore.jks",
      "keystoreAlias": "key0"
    }
  }
}
```

### Tauri 配置

编辑 `src-tauri/tauri.conf.json`：

```json
{
  "productName": "Roguelike RPG",
  "version": "2.0.0",
  "identifier": "com.example.roguelike-rpg",
  "app": {
    "windows": [
      {
        "title": "Roguelike RPG",
        "width": 1280,
        "height": 800
      }
    ]
  }
}
```

## 常见问题

### Q: 如何修改游戏窗口大小？
A: 编辑 `src-tauri/tauri.conf.json` 中的 `windows` 配置，或修改 `src/phaser/GameScene.ts` 中的视口大小。

### Q: 如何添加新的平台？
A: 在 `scripts/` 目录添加适配脚本，在 `package.json` 添加对应的构建命令。

### Q: 如何调试移动端？
A: 使用 `pnpm cap:open:android/ios` 打开原生 IDE，连接真机或使用模拟器调试。

### Q: Steam 集成不工作？
A: 确保：
1. Steam 客户端正在运行
2. 已正确设置 `STEAM_APP_ID`
3. 游戏是通过 Steam 启动的（或使用了 Steam 测试模式）

## License

MIT
