#!/usr/bin/env node
/**
 * 微信小程序适配脚本
 * 将 Vite 构建结果转换为微信小程序格式
 */

import fs from 'fs';
import path from 'path';

const SRC_DIR = 'dist';
const DEST_DIR = 'dist-wechat';

console.log('🎮 适配微信小程序...');

// 清理并创建目标目录
if (fs.existsSync(DEST_DIR)) {
  fs.rmSync(DEST_DIR, { recursive: true });
}
fs.mkdirSync(DEST_DIR, { recursive: true });

// 复制静态资源
function copyDir(src, dest) {
  if (!fs.existsSync(dest)) {
    fs.mkdirSync(dest, { recursive: true });
  }
  
  const entries = fs.readdirSync(src, { withFileTypes: true });
  
  for (const entry of entries) {
    const srcPath = path.join(src, entry.name);
    const destPath = path.join(dest, entry.name);
    
    if (entry.isDirectory()) {
      copyDir(srcPath, destPath);
    } else {
      fs.copyFileSync(srcPath, destPath);
    }
  }
}

// 复制所有文件
copyDir(SRC_DIR, DEST_DIR);

// 创建微信小程序配置文件
const appConfig = {
  pages: ['pages/index/index'],
  window: {
    backgroundTextStyle: 'light',
    navigationBarBackgroundColor: '#1a1a2e',
    navigationBarTitleText: 'Roguelike RPG',
    navigationBarTextStyle: 'white',
    backgroundColor: '#1a1a2e'
  },
  networkTimeout: {
    request: 10000,
    downloadFile: 10000
  },
  debug: false
};

fs.writeFileSync(
  path.join(DEST_DIR, 'app.json'),
  JSON.stringify(appConfig, null, 2)
);

// 创建 app.js
const appJs = `
App({
  onLaunch() {
    console.log('游戏启动');
    
    // 检查更新
    if (wx.canIUse('getUpdateManager')) {
      const updateManager = wx.getUpdateManager();
      updateManager.onCheckForUpdate((res) => {
        if (res.hasUpdate) {
          updateManager.onUpdateReady(() => {
            wx.showModal({
              title: '更新提示',
              content: '新版本已准备好，是否重启应用？',
              success: (res) => {
                if (res.confirm) {
                  updateManager.applyUpdate();
                }
              }
            });
          });
        }
      });
    }
  },
  
  onShow() {
    console.log('游戏显示');
  },
  
  onHide() {
    console.log('游戏隐藏');
  }
});
`;

fs.writeFileSync(path.join(DEST_DIR, 'app.js'), appJs);

// 创建 app.wxss
const appWxss = `
page {
  width: 100%;
  height: 100%;
  background-color: #1a1a2e;
}

.container {
  width: 100%;
  height: 100%;
  display: flex;
  flex-direction: column;
  align-items: center;
  justify-content: center;
}
`;

fs.writeFileSync(path.join(DEST_DIR, 'app.wxss'), appWxss);

// 创建 pages/index 目录
const pagesDir = path.join(DEST_DIR, 'pages', 'index');
fs.mkdirSync(pagesDir, { recursive: true });

// 创建 index.wxml
const indexWxml = `
<view class="container">
  <web-view src="./index.html" bindmessage="onMessage"></web-view>
</view>
`;

fs.writeFileSync(path.join(pagesDir, 'index.wxml'), indexWxml);

// 创建 index.js
const indexJs = `
Page({
  data: {},
  
  onLoad() {
    console.log('页面加载');
    
    // 获取系统信息
    wx.getSystemInfo({
      success: (res) => {
        console.log('系统信息:', res);
      }
    });
  },
  
  onReady() {
    console.log('页面就绪');
  },
  
  onShow() {
    console.log('页面显示');
  },
  
  onHide() {
    console.log('页面隐藏');
  },
  
  onUnload() {
    console.log('页面卸载');
  },
  
  onMessage(e) {
    console.log('收到消息:', e.detail);
  }
});
`;

fs.writeFileSync(path.join(pagesDir, 'index.js'), indexJs);

// 创建 index.json
const indexJson = {
  usingComponents: {},
  navigationBarTitleText: 'Roguelike RPG',
  navigationBarBackgroundColor: '#1a1a2e',
  navigationBarTextStyle: 'white',
  backgroundColor: '#1a1a2e'
};

fs.writeFileSync(
  path.join(pagesDir, 'index.json'),
  JSON.stringify(indexJson, null, 2)
);

// 创建 index.wxss
const indexWxss = `
.container {
  width: 100%;
  height: 100%;
}

web-view {
  width: 100%;
  height: 100%;
}
`;

fs.writeFileSync(path.join(pagesDir, 'index.wxss'), indexWxss);

// 创建 game.js 适配文件
const gameAdapter = `
// 微信小程序适配
if (typeof wx !== 'undefined') {
  // 适配 localStorage
  window.localStorage = {
    getItem(key) {
      return wx.getStorageSync(key);
    },
    setItem(key, value) {
      wx.setStorageSync(key, value);
    },
    removeItem(key) {
      wx.removeStorageSync(key);
    },
    clear() {
      wx.clearStorageSync();
    }
  };
  
  // 适配 Audio
  window.Audio = class Audio {
    constructor(src) {
      this.innerAudioContext = wx.createInnerAudioContext();
      this.innerAudioContext.src = src;
    }
    
    play() {
      this.innerAudioContext.play();
    }
    
    pause() {
      this.innerAudioContext.pause();
    }
    
    stop() {
      this.innerAudioContext.stop();
    }
    
    set volume(value) {
      this.innerAudioContext.volume = value;
    }
    
    get volume() {
      return this.innerAudioContext.volume;
    }
    
    set loop(value) {
      this.innerAudioContext.loop = value;
    }
    
    get loop() {
      return this.innerAudioContext.loop;
    }
  };
  
  // 适配 Canvas（Phaser 使用）
  const originalCreateElement = document.createElement;
  document.createElement = function(tagName) {
    const element = originalCreateElement.call(document, tagName);
    if (tagName.toLowerCase() === 'canvas') {
      // 微信小程序 Canvas 适配
      const canvas = wx.createCanvas();
      element.getContext = function(type) {
        if (type === '2d') {
          return canvas.getContext('2d');
        }
        return null;
      };
    }
    return element;
  };
}
`;

fs.writeFileSync(path.join(DEST_DIR, 'wechat-adapter.js'), gameAdapter);

// 修改 index.html 注入适配器
const indexPath = path.join(DEST_DIR, 'index.html');
let indexContent = fs.readFileSync(indexPath, 'utf-8');
indexContent = indexContent.replace(
  '<script type="module"',
  '<script src="./wechat-adapter.js"></script>\\n    <script type="module"'
);
fs.writeFileSync(indexPath, indexContent);

// 创建 project.config.json（微信开发者工具配置）
const projectConfig = {
  description: 'Roguelike RPG',
  packOptions: {
    ignore: [],
    include: []
  },
  setting: {
    urlCheck: false,
    es6: true,
    enhance: true,
    postcss: true,
    preloadBackgroundData: false,
    minified: true,
    newFeature: false,
    coverView: true,
    nodeModules: false,
    autoAudits: false,
    showShadowRootInWxmlPanel: true,
    scopeDataCheck: false,
    uglifyFileName: false,
    checkInvalidKey: true,
    checkSiteMap: true,
    uploadWithSourceMap: true,
    compileHotReLoad: false,
    lazyloadPlaceholderEnable: false,
    useMultiFrameRuntime: true,
    useApiHook: true,
    useApiHostProcess: true,
    babelSetting: {
      ignore: [],
      disablePlugins: [],
      outputPath: ''
    },
    enableEngineNative: false,
    useIsolateContext: true,
    userConfirmedBundleSwitch: false,
    packNpmManually: false,
    packNpmRelationList: [],
    minifyWXSS: true,
    disableUseStrict: false,
    minifyWXML: true,
    showES6CompileOption: false,
    useCompilerPlugins: false
  },
  compileType: 'miniprogram',
  libVersion: '2.19.4',
  appid: 'touristappid',
  projectname: 'RoguelikeRPG',
  condition: {}
};

fs.writeFileSync(
  path.join(DEST_DIR, 'project.config.json'),
  JSON.stringify(projectConfig, null, 2)
);

console.log('✅ 微信小程序适配完成！');
console.log('📦 输出目录: dist-wechat/');
console.log('💡 使用微信开发者工具打开 dist-wechat 目录进行预览和上传');
