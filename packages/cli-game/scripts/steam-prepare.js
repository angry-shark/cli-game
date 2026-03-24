#!/usr/bin/env node
/**
 * Steam 发行准备脚本
 * 准备 Steam 上架所需的文件和配置
 */

import fs from 'fs';
import path from 'path';

const BUILD_DIR = 'src-tauri/target/release/bundle';
const STEAM_DIR = 'dist-steam';

console.log('🎮 准备 Steam 发行文件...');

// 清理并创建目标目录
if (fs.existsSync(STEAM_DIR)) {
  fs.rmSync(STEAM_DIR, { recursive: true });
}
fs.mkdirSync(STEAM_DIR, { recursive: true });

// 创建 Steam 配置文件
const steamAppConfig = {
  appid: 480, // 替换为你的 Steam App ID
  common: {
    name: 'Roguelike RPG',
    type: 'Game',
    oslist: 'windows,macos,linux',
    osarch: '64',
    clienticon: 'icon.ico',
    clienttga: 'icon_32.tga',
    linuxclienticon: 'icon_32.png',
    icon: 'icon.ico',
    logo: 'logo.png',
    logo_small: 'logo_small.png',
    controller_support: 'full',
    small_capsule: {
      english: 'capsule_231x87.png'
    },
    header_image: {
      english: 'header_292x136.png'
    },
    library_assets: {
      library_capsule: 'en/library_600x900.png',
      library_hero: 'en/library_hero.jpg',
      library_logo: 'en/logo.png',
      library_logo_transparent: 'en/logo_transparent.png'
    }
  },
  extended: {
    developer: 'Your Studio Name',
    publisher: 'Your Publisher Name',
    homepage: 'https://your-game-website.com',
    description: 'A Roguelike RPG built with Phaser',
    short_description: 'A Roguelike RPG built with Phaser'
  },
  config: {
    steamcontroller: {
      'Default': 'Default Gamepad Configuration'
    },
    installdir: 'RoguelikeRPG',
    launch: {
      '0': {
        executable: 'Roguelike RPG.exe',
        type: 'default',
        config: {
          oslist: 'windows'
        }
      },
      '1': {
        executable: 'Roguelike RPG.app',
        type: 'default',
        config: {
          oslist: 'macos'
        }
      },
      '2': {
        executable: 'roguelike-rpg',
        type: 'default',
        config: {
          oslist: 'linux'
        }
      }
    }
  },
  depots: {
    'baselanguages': 'English',
    '1031': {
      name: 'Windows Content',
      config: {
        oslist: 'windows'
      }
    },
    '1032': {
      name: 'macOS Content',
      config: {
        oslist: 'macos'
      }
    },
    '1033': {
      name: 'Linux Content',
      config: {
        oslist: 'linux'
      }
    }
  }
};

fs.writeFileSync(
  path.join(STEAM_DIR, 'app.vdf'),
  generateVDF(steamAppConfig)
);

// 创建 Steamworks SDK 配置文件
const steamworksConfig = `
// Steamworks 配置
// 请替换为你的 Steam App ID
export const STEAM_APP_ID = 480; // 测试用 App ID，生产环境请替换

// Steam 成就配置
export const STEAM_ACHIEVEMENTS = [
  { id: 'ACH_FIRST_WIN', name: '初次胜利', description: '完成第一场战斗' },
  { id: 'ACH_LEVEL_10', name: '强者之路', description: '角色达到 10 级' },
  { id: 'ACH_DUNGEON_CLEARED', name: '地下城征服者', description: '通关地下城' },
  { id: 'ACH_RARE_ITEM', name: '稀有发现', description: '获得一件稀有装备' },
  { id: 'ACH_ALL_SKILLS', name: '技能大师', description: '学会所有技能' }
];

// Steam 统计配置
export const STEAM_STATS = [
  { id: 'STAT_ENEMIES_DEFEATED', name: '击败敌人', type: 'int' },
  { id: 'STAT_DUNGEONS_CLEARED', name: '通关地下城数', type: 'int' },
  { id: 'STAT_PLAYTIME', name: '游戏时长', type: 'float' }
];
`;

fs.writeFileSync(
  path.join('src', 'steam-config.ts'),
  steamworksConfig
);

// 创建 Steam 集成模块
const steamIntegration = `
/**
 * Steamworks 集成模块
 * 提供 Steam API 封装
 */

import { STEAM_APP_ID, STEAM_ACHIEVEMENTS, STEAM_STATS } from './steam-config.js';

export class SteamIntegration {
  private static instance: SteamIntegration;
  private initialized = false;

  static getInstance(): SteamIntegration {
    if (!SteamIntegration.instance) {
      SteamIntegration.instance = new SteamIntegration();
    }
    return SteamIntegration.instance;
  }

  async init(): Promise<boolean> {
    if (this.initialized) return true;

    try {
      // 检查是否在 Steam 环境中
      if (typeof window !== 'undefined' && (window as any).steamworks) {
        const steamworks = (window as any).steamworks;
        await steamworks.init(STEAM_APP_ID);
        this.initialized = true;
        console.log('Steamworks 初始化成功');
        return true;
      }
      return false;
    } catch (error) {
      console.warn('Steamworks 初始化失败:', error);
      return false;
    }
  }

  // 解锁成就
  unlockAchievement(achievementId: string): void {
    if (!this.initialized) return;
    
    try {
      const steamworks = (window as any).steamworks;
      steamworks.achievements.unlock(achievementId);
    } catch (error) {
      console.error('解锁成就失败:', error);
    }
  }

  // 设置统计
  setStat(statId: string, value: number): void {
    if (!this.initialized) return;
    
    try {
      const steamworks = (window as any).steamworks;
      steamworks.stats.set(statId, value);
      steamworks.stats.store();
    } catch (error) {
      console.error('设置统计失败:', error);
    }
  }

  // 增加统计
  incrementStat(statId: string, increment: number = 1): void {
    if (!this.initialized) return;
    
    try {
      const steamworks = (window as any).steamworks;
      const current = steamworks.stats.get(statId) || 0;
      steamworks.stats.set(statId, current + increment);
      steamworks.stats.store();
    } catch (error) {
      console.error('增加统计失败:', error);
    }
  }

  // 保存游戏到 Steam Cloud
  async saveToCloud(saveName: string, data: string): Promise<boolean> {
    if (!this.initialized) return false;
    
    try {
      const steamworks = (window as any).steamworks;
      await steamworks.cloud.writeFile(saveName, data);
      return true;
    } catch (error) {
      console.error('保存到 Steam Cloud 失败:', error);
      return false;
    }
  }

  // 从 Steam Cloud 加载游戏
  async loadFromCloud(saveName: string): Promise<string | null> {
    if (!this.initialized) return null;
    
    try {
      const steamworks = (window as any).steamworks;
      const exists = await steamworks.cloud.fileExists(saveName);
      if (!exists) return null;
      
      return await steamworks.cloud.readFile(saveName);
    } catch (error) {
      console.error('从 Steam Cloud 加载失败:', error);
      return null;
    }
  }

  // 获取 Steam 用户信息
  getUserInfo(): { id: string; name: string; level: number } | null {
    if (!this.initialized) return null;
    
    try {
      const steamworks = (window as any).steamworks;
      return {
        id: steamworks.user.getSteamId(),
        name: steamworks.user.getName(),
        level: steamworks.user.getLevel()
      };
    } catch (error) {
      console.error('获取用户信息失败:', error);
      return null;
    }
  }

  // 是否拥有 DLC
  ownsDLC(dlcId: number): boolean {
    if (!this.initialized) return false;
    
    try {
      const steamworks = (window as any).steamworks;
      return steamworks.apps.isDlcInstalled(dlcId);
    } catch (error) {
      console.error('检查 DLC 失败:', error);
      return false;
    }
  }

  // 打开 Steam 商店页面
  openStore(): void {
    if (!this.initialized) return;
    
    try {
      const steamworks = (window as any).steamworks;
      steamworks.apps.openStore(STEAM_APP_ID);
    } catch (error) {
      console.error('打开商店失败:', error);
    }
  }

  // 打开 Steam 社区中心
  openCommunity(): void {
    if (!this.initialized) return;
    
    try {
      const steamworks = (window as any).steamworks;
      steamworks.apps.openCommunity(STEAM_APP_ID);
    } catch (error) {
      console.error('打开社区失败:', error);
    }
  }
}

export const steam = SteamIntegration.getInstance();
`;

fs.writeFileSync(
  path.join('src', 'steam-integration.ts'),
  steamIntegration
);

// 生成 VDF 格式配置文件
function generateVDF(obj: any, indent = 0): string {
  const spaces = '  '.repeat(indent);
  let result = '\\n';
  
  for (const [key, value] of Object.entries(obj)) {
    if (typeof value === 'object' && !Array.isArray(value)) {
      result += `${spaces}"${key}"${generateVDF(value, indent + 1)}${spaces}\\n`;
    } else if (Array.isArray(value)) {
      // 数组处理
    } else {
      result += `${spaces}"${key}" "${value}"\\n`;
    }
  }
  
  return result;
}

// 创建 README
const steamReadme = `
# Steam 发行准备

## 前置要求

1. Steamworks SDK
   - 下载地址：https://partner.steamgames.com/
   - 需要 Steam 开发者账号

2. Steam App ID
   - 在 Steamworks 后台创建应用
   - 替换 src/steam-config.ts 中的 STEAM_APP_ID

## 构建步骤

1. 构建桌面应用：
   \`\`\`bash
   pnpm build:desktop
   \`\`\`

2. 准备 Steam 文件：
   \`\`\`bash
   pnpm steam:prepare
   \`\`\`

3. 使用 Steamworks SDK 上传：
   \`\`\`bash
   # Windows
   sdk/tools/ContentBuilder/builder_win/steamcmd.exe +login <username> +run_app_build <projectdir>/app.vdf +quit
   
   # macOS/Linux
   sdk/tools/ContentBuilder/builder_osx/steamcmd.sh +login <username> +run_app_build <projectdir>/app.vdf +quit
   \`\`\`

## 配置文件

- app.vdf - Steam 应用配置
- src/steam-config.ts - Steamworks 配置
- src/steam-integration.ts - Steam API 封装

## 成就和统计

编辑 src/steam-config.ts 添加：
- 成就（Achievements）
- 统计（Stats）

然后在 Steamworks 后台配置对应的成就和统计。

## Steam Cloud

支持存档云同步：
\`\`\`typescript
import { steam } from './steam-integration.js';

// 保存游戏
await steam.saveToCloud('save1.json', JSON.stringify(gameData));

// 加载游戏
const data = await steam.loadFromCloud('save1.json');
\`\`\`

## Steam 覆盖层

按 Shift+Tab 打开 Steam 覆盖层（默认快捷键）。

## 调试

在 Tauri 开发模式下，Steamworks 需要在 Steam 客户端运行时才可用。
`;

fs.writeFileSync(
  path.join(STEAM_DIR, 'README.md'),
  steamReadme
);

// 复制构建文件（如果存在）
if (fs.existsSync(BUILD_DIR)) {
  const platforms = ['msi', 'dmg', 'app', 'deb', 'rpm', 'AppImage'];
  
  platforms.forEach(platform => {
    const platformDir = path.join(BUILD_DIR, platform);
    if (fs.existsSync(platformDir)) {
      const files = fs.readdirSync(platformDir);
      files.forEach(file => {
        const srcPath = path.join(platformDir, file);
        const destPath = path.join(STEAM_DIR, platform, file);
        
        if (!fs.existsSync(path.dirname(destPath))) {
          fs.mkdirSync(path.dirname(destPath), { recursive: true });
        }
        
        fs.copyFileSync(srcPath, destPath);
        console.log(`📦 复制: ${file}`);
      });
    }
  });
}

console.log('✅ Steam 发行准备完成！');
console.log(`📁 输出目录: ${STEAM_DIR}/`);
console.log('');
console.log('下一步:');
console.log('1. 在 Steamworks 后台创建应用');
console.log('2. 替换 STEAM_APP_ID（当前使用测试 ID 480）');
console.log('3. 准备游戏素材（图标、截图等）');
console.log('4. 使用 Steamworks SDK 上传');
console.log('');
console.log('详细说明请查看 dist-steam/README.md');
`;

// 使脚本可执行
import { execSync } from 'child_process';

try {
  execSync('chmod +x scripts/wechat-adapt.js');
  execSync('chmod +x scripts/bytedance-adapt.js');
  execSync('chmod +x scripts/steam-prepare.js');
} catch (e) {
  // Windows 不需要 chmod
}

console.log('✅ Steam 发行准备完成！');
console.log('📁 输出目录: dist-steam/');
console.log('');
console.log('下一步:');
console.log('1. 在 Steamworks 后台创建应用');
console.log('2. 替换 STEAM_APP_ID（当前使用测试 ID 480）');
console.log('3. 准备游戏素材（图标、截图等）');
console.log('4. 使用 Steamworks SDK 上传');
console.log('');
console.log('详细说明请查看 dist-steam/README.md');
