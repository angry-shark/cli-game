# Roguelike RPG - Agent Documentation

## Project Overview

**Roguelike RPG** 是一个基于 TypeScript 开发的跨平台肉鸽（Roguelike）游戏，使用 monorepo 结构管理。

项目核心特性：
- 🗺️ **多地图类型**：城镇（Town）、野外（Wilderness）、地下城（Dungeon）
- 🌍 **世界地图系统**：支持多城镇、多野外区域连接和传送
- 🏘️ **建筑内部系统**：可进入商店、旅馆、铁匠铺等建筑
- ⚔️ **回合制战斗**：带技能、Buff/Debuff 系统的策略战斗
- 📈 **角色成长**：升级、属性点分配、装备系统
- 🎯 **多平台支持**：Web、移动端、桌面端、小程序、Steam

## Technology Stack

| 组件 | 技术 | 版本 | 用途 |
|------|------|------|------|
| 语言 | TypeScript | 5.9+ | 类型安全开发 |
| 游戏引擎 | Phaser | ^3.87.0 | HTML5 游戏渲染 |
| 地图生成 | rot.js | ^2.2.1 | 地图生成、FOV、调度器 |
| UI 框架 | React | ^18.3.1 | UI 覆盖层 |
| 构建工具 | Vite | ^6.2.3 | 开发和生产构建 |
| 移动端 | Capacitor | ^8.1.0 | iOS/Android 打包 |
| 桌面端 | Tauri v2 | 2.0.0-rc.18 | Windows/macOS/Linux |
| Steam | steamworks.js | ^0.4.0 | Steam 集成 |
| 包管理 | pnpm | 10.13.0 | Monorepo 管理 |

## Multi-Platform Build Support

### 平台对比表

| 目标平台 | 推荐方案 | 包体积 | 技术栈匹配度 | 适用场景 | 命令 |
|---------|---------|--------|-------------|---------|------|
| **Web** | Vite | ~500KB | ⭐⭐⭐⭐⭐ | 浏览器游玩 | `pnpm build:web` |
| **iOS/Android** | Capacitor | ~5MB（基础壳） | ⭐⭐⭐⭐⭐ | 上架 App Store/应用宝 | `pnpm build:mobile` |
| **Windows/macOS/Linux** | Tauri v2 | ~3MB（Rust 后端） | ⭐⭐⭐⭐⭐ | Steam 上架、独立客户端 | `pnpm build:desktop` |
| **微信小程序** | 微信开发者工具 | ~2MB | ⭐⭐⭐ | 国内社交传播 | `pnpm build:wechat` |
| **抖音/QQ 小游戏** | 对应厂商 SDK | ~2MB | ⭐⭐⭐ | 短视频平台引流 | `pnpm build:bytedance` |
| **Steam** | Tauri + Steamworks | ~5MB | ⭐⭐⭐⭐ | PC 独立游戏发行 | `pnpm build:steam` |

### 各平台详细说明

#### 1. Web (Vite)
- **构建输出**: `dist/`
- **技术特点**: ES2022 模块，自动代码分割
- **浏览器支持**: Chrome 90+, Firefox 90+, Safari 14+, Edge 90+
- **注意事项**: 
  - 需要配置 CORS 才能加载本地资源
  - 建议使用 HTTPS 部署以获得最佳性能

#### 2. iOS/Android (Capacitor)
- **Android 输出**: `android/app/build/outputs/apk/`
- **iOS 输出**: `ios/App/build/`
- **技术特点**: 
  - WebView 渲染（Android: Chrome WebView，iOS: WKWebView）
  - 原生插件桥接
  - 支持热更新（通过 Capacitor Live Updates）
- **签名要求**:
  - Android: 需要 keystore 进行 release 签名
  - iOS: 需要 Apple Developer 账号和证书

#### 3. Desktop (Tauri v2)
- **输出目录**: `src-tauri/target/release/bundle/`
- **技术特点**:
  - Rust 后端，WebView 前端
  - Windows 使用 WebView2，macOS 使用 WKWebView，Linux 使用 WebKitGTK
  - 原生系统 API 访问
- **平台特定**:
  - Windows: 生成 `.msi` 安装包
  - macOS: 生成 `.dmg` 和 `.app`
  - Linux: 生成 `.deb`, `.rpm`, `.AppImage`

#### 4. 微信小程序
- **输出目录**: `dist-wechat/`
- **技术特点**:
  - WebGL 渲染支持
  - 本地存储适配（wx.getStorageSync）
  - 音频适配（wx.createInnerAudioContext）
  - Canvas 适配（wx.createCanvas）
- **限制**:
  - 主包大小限制 2MB（压缩后）
  - 总包大小限制 20MB（含分包）
  - 需要使用微信开发者工具上传

#### 5. 抖音小游戏
- **输出目录**: `dist-bytedance/`
- **技术特点**:
  - 类似微信小程序架构
  - 支持录屏分享
  - 支持广告变现（激励视频、插屏广告）
- **限制**:
  - 包大小限制 10MB
  - 需要字节跳动开发者账号

#### 6. Steam (Tauri + Steamworks)
- **输出目录**: `dist-steam/`
- **技术特点**:
  - 基于 Tauri 桌面版
  - Steamworks API 集成（成就、统计、云存档）
  - Steam Overlay 支持
- **发布要求**:
  - Steam 开发者账号（$100 押金）
  - Steamworks SDK
  - 配置 app.vdf 和 depot 配置

## Project Structure

```
cli_game/
├── package.json                   # 根配置
├── pnpm-workspace.yaml            # pnpm workspace
├── README.md                      # 用户文档
├── AGENTS.md                      # 本文件
└── packages/
    └── cli-game/                  # 游戏主包
        ├── package.json           # 包配置 + 打包脚本
        ├── tsconfig.json          # TS 配置
        ├── vite.config.ts         # Vite 配置
        ├── index.html             # HTML 入口
        ├── capacitor.config.json  # Capacitor 配置
        ├── src-tauri/             # Tauri 配置
        │   ├── tauri.conf.json    # Tauri 主配置
        │   ├── Cargo.toml         # Rust 配置
        │   ├── build.rs           # Rust 构建脚本
        │   └── src/               # Rust 源码
        │       ├── main.rs        # 入口
        │       └── lib.rs         # 库代码
        ├── scripts/               # 打包脚本
        │   ├── wechat-adapt.js    # 微信小程序适配
        │   ├── bytedance-adapt.js # 抖音小游戏适配
        │   └── steam-prepare.js   # Steam 发行准备
        ├── src/
        │   ├── main.tsx           # React 入口
        │   ├── game.ts            # 游戏核心逻辑
        │   ├── types.ts           # 类型定义
        │   ├── items.ts           # 物品数据库
        │   ├── skills.ts          # 技能数据库
        │   ├── steam-config.ts    # Steam 配置
        │   ├── steam-integration.ts # Steam 集成
        │   ├── phaser/
        │   │   └── GameScene.ts   # Phaser 游戏场景
        │   └── components/
        │       └── App.tsx        # React UI 组件
        ├── android/               # Capacitor Android 项目（生成）
        ├── ios/                   # Capacitor iOS 项目（生成）
        ├── assets/                # 资源目录
        ├── saves/                 # 存档目录
        ├── dist/                  # Web 构建输出
        ├── dist-wechat/           # 微信小程序输出
        ├── dist-bytedance/        # 抖音小游戏输出
        └── dist-steam/            # Steam 发行文件
```

## Build Commands

### Web
```bash
# 开发模式
pnpm dev

# 构建生产版本
pnpm build:web

# 预览生产版本
pnpm preview:web
```

### Desktop (Windows/macOS/Linux)
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

### Mobile (iOS/Android)
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

### 微信小程序
```bash
# 构建并适配
pnpm build:wechat

# 或分步执行
pnpm build:web
pnpm wechat:adapt

# 开发模式
pnpm wechat:dev

# 使用微信开发者工具打开 dist-wechat 目录
pnpm wechat:open
```

### 抖音小游戏
```bash
# 构建并适配
pnpm build:bytedance

# 或分步执行
pnpm build:web
pnpm bytedance:adapt

# 开发模式
pnpm bytedance:dev

# 使用抖音开发者工具打开 dist-bytedance 目录
pnpm bytedance:open
```

### Steam
```bash
# 构建桌面版并准备 Steam 文件
pnpm build:steam

# 或分步执行
pnpm build:desktop
pnpm steam:prepare

# Steam 开发模式
pnpm steam:dev
```

### 批量构建
```bash
# 构建所有平台（Web + Desktop + Mobile）
pnpm build:all
```

## Platform-Specific Details

### Capacitor (Mobile)

#### 前置要求
- **Android**: Android Studio + JDK 11+
- **iOS**: Xcode 14+ (仅 macOS)

#### 签名配置
编辑 `capacitor.config.json`：
```json
{
  "android": {
    "buildOptions": {
      "keystorePath": "android/keystore.jks",
      "keystoreAlias": "key0"
    }
  }
}
```

#### 原生插件开发
```typescript
// 注册自定义插件
import { registerPlugin } from '@capacitor/core';

interface EchoPlugin {
  echo(options: { value: string }): Promise<{ value: string }>;
}

const Echo = registerPlugin<EchoPlugin>('Echo');
export default Echo;
```

### Tauri (Desktop)

#### 前置要求
- **Rust**: https://rustup.rs/
- **Windows**: Microsoft Visual Studio C++ Build Tools
- **macOS**: Xcode Command Line Tools
- **Linux**: 
  ```bash
  sudo apt-get install build-essential libgtk-3-dev libwebkit2gtk-4.0-dev
  ```

#### 自定义命令
```rust
// src-tauri/src/lib.rs
#[tauri::command]
fn greet(name: &str) -> String {
    format!("Hello, {}!", name)
}

// 注册命令
tauri::Builder::default()
    .invoke_handler(tauri::generate_handler![greet])
```

```typescript
// 前端调用
import { invoke } from '@tauri-apps/api/core';
const response = await invoke('greet', { name: 'World' });
```

#### Steam 集成
```typescript
import { steam } from './steam-integration.js';

// 初始化
await steam.init();

// 解锁成就
steam.unlockAchievement('ACH_FIRST_WIN');

// 设置统计
steam.setStat('STAT_ENEMIES_DEFEATED', 100);
steam.incrementStat('STAT_DUNGEONS_CLEARED');

// Steam Cloud 存档
await steam.saveToCloud('save1.json', JSON.stringify(gameData));
const data = await steam.loadFromCloud('save1.json');

// 获取用户信息
const user = steam.getUserInfo();
console.log(user?.name, user?.level);

// 打开 Steam 页面
steam.openStore();
steam.openCommunity();
```

### 微信小程序

#### 特性
- WebGL 渲染支持
- 本地存储适配（wx.getStorageSync）
- 音频适配（wx.createInnerAudioContext）
- Canvas 适配（wx.createCanvas）

#### 适配实现
```typescript
// 适配 localStorage
window.localStorage = {
  getItem(key) { return wx.getStorageSync(key); },
  setItem(key, value) { wx.setStorageSync(key, value); },
  removeItem(key) { wx.removeStorageSync(key); },
  clear() { wx.clearStorageSync(); }
};

// 适配 Audio
window.Audio = class Audio {
  constructor(src) {
    this.innerAudioContext = wx.createInnerAudioContext();
    this.innerAudioContext.src = src;
  }
  play() { this.innerAudioContext.play(); }
  pause() { this.innerAudioContext.pause(); }
};
```

#### 限制
- 主包大小限制 2MB（压缩后）
- 总包大小限制 20MB（含分包）
- 需要使用微信开发者工具上传

### 抖音小游戏

#### 特性
- 类似于微信小程序的架构
- 支持录屏分享（tt.getGameRecorderManager）
- 支持广告变现（激励视频、插屏广告）

#### 限制
- 包大小限制 10MB
- 需要字节跳动开发者账号

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

### 3. 平台检测
```typescript
// 检测平台
const isMobile = /iPhone|iPad|iPod|Android/i.test(navigator.userAgent);
const isWechat = typeof wx !== 'undefined';
const isBytedance = typeof tt !== 'undefined';
const isTauri = typeof window !== 'undefined' && !!(window as any).__TAURI__;
const isSteam = typeof window !== 'undefined' && !!(window as any).steamworks;
```

### 4. 条件编译
```typescript
// 针对不同平台的代码
if (import.meta.env.VITE_TARGET === 'wechat') {
  // 微信小程序特定代码
}
```

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
```typescript
// game.ts
this.onUpdate(); // 状态变更后调用

// GameScene.ts
private onGameUpdate(): void {
  this.renderGame();
}
```

### 3. 视野计算 (FOV)
```typescript
this.fov = new ROT.FOV.PreciseShadowcasting((x, y) => {
  return this.isTransparent(x, y);
});
```

### 4. 地下城生成
```typescript
const digger = new ROT.Map.Digger(width, height, {
  roomWidth: [4, 10],
  roomHeight: [4, 8],
  corridorLength: [2, 6],
  dugPercentage: 0.2
});
```

### 5. 调度系统
```typescript
this.scheduler = new ROT.Scheduler.Simple();
this.scheduler.add(this, true);
this.engine = new ROT.Engine(this.scheduler);
```

## Testing Strategy

1. **Web 测试**: `pnpm dev` - 浏览器开发调试
2. **桌面测试**: `pnpm dev:desktop` - Tauri 开发模式
3. **移动测试**: `pnpm cap:open:android/ios` - 真机/模拟器调试
4. **小程序测试**: 使用对应开发者工具
5. **类型检查**: `pnpm typecheck`
6. **构建验证**: `pnpm build`

## Release Checklist

### Web 发布
- [ ] 运行 `pnpm build:web`
- [ ] 验证 `dist/` 目录内容
- [ ] 部署到静态托管服务（Vercel/Netlify/Cloudflare Pages）

### Mobile 发布
- [ ] Android: 配置签名密钥
- [ ] iOS: 配置证书和 Provisioning Profile
- [ ] 运行 `pnpm build:mobile`
- [ ] 测试 Release 版本
- [ ] 上传到 Google Play / App Store

### Desktop 发布
- [ ] Windows: 测试安装流程
- [ ] macOS: 签名和公证
- [ ] Linux: 测试各发行版兼容性
- [ ] 运行 `pnpm build:desktop`

### Steam 发布
- [ ] 创建 Steamworks 应用
- [ ] 配置成就和统计
- [ ] 上传游戏素材（截图、视频）
- [ ] 配置价格和销售
- [ ] 运行 `pnpm build:steam`
- [ ] 使用 Steamworks SDK 上传构建

### 小程序发布
- [ ] 注册开发者账号
- [ ] 配置 AppID
- [ ] 运行 `pnpm build:wechat` / `pnpm build:bytedance`
- [ ] 使用开发者工具上传
- [ ] 提交审核

## Dependencies

### Production
- `phaser`: HTML5 游戏引擎
- `react` / `react-dom`: UI 框架
- `rot-js`: 地图生成和 FOV 计算

### Development
- `typescript`: 类型系统
- `vite`: 构建工具
- `@vitejs/plugin-react`: React 插件
- `@capacitor/*`: 移动端打包
- `@tauri-apps/*`: 桌面端打包
- `steamworks.js`: Steam 集成
- `@types/*`: 类型定义

## Troubleshooting

### Capacitor 常见问题
**Q: Android 构建失败**
A: 检查 JDK 版本（需要 11+），确保 ANDROID_HOME 环境变量已设置

**Q: iOS 构建失败**
A: 确保 Xcode 命令行工具已安装：`xcode-select --install`

### Tauri 常见问题
**Q: Rust 编译错误**
A: 运行 `rustup update` 更新 Rust 工具链

**Q: WebView 不显示**
A: 
- Windows: 安装 WebView2 Runtime
- Linux: 安装 WebKitGTK

### 小程序常见问题
**Q: 包大小超限**
A: 
- 启用代码分割
- 压缩图片资源
- 使用分包加载

**Q: Canvas 渲染异常**
A: 检查 WebGL 支持，必要时回退到 Canvas 2D

## License

ISC
