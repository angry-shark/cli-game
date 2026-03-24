#!/usr/bin/env node
/**
 * 抖音小游戏适配脚本
 * 将 Vite 构建结果转换为抖音小游戏格式
 */

import fs from 'fs';
import path from 'path';

const SRC_DIR = 'dist';
const DEST_DIR = 'dist-bytedance';

console.log('🎮 适配抖音小游戏...');

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

// 创建抖音小游戏配置文件
const gameConfig = {
  deviceOrientation: 'landscape',
  showStatusBar: false,
  networkTimeout: {
    request: 5000,
    connectSocket: 5000,
    uploadFile: 5000,
    downloadFile: 5000
  },
  subpackages: [],
  workers: '',
  plugins: {}
};

fs.writeFileSync(
  path.join(DEST_DIR, 'game.json'),
  JSON.stringify(gameConfig, null, 2)
);

// 创建 project.config.json
const projectConfig = {
  projectname: 'RoguelikeRPG',
  description: 'A Roguelike RPG',
  appid: 'ttxxxxxxxxxxxxxxxx',
  setting: {
    urlCheck: false,
    es6: true,
    enhance: true,
    postcss: true,
    minified: true,
    babelSetting: {
      ignore: [],
      disablePlugins: [],
      outputPath: ''
    }
  },
  compileType: 'game'
};

fs.writeFileSync(
  path.join(DEST_DIR, 'project.config.json'),
  JSON.stringify(projectConfig, null, 2)
);

// 创建 game.js 入口文件
const gameJs = `
// 抖音小游戏入口
const { window, document, navigator } = $global;

// 适配 localStorage
window.localStorage = {
  data: {},
  getItem(key) {
    return this.data[key] || null;
  },
  setItem(key, value) {
    this.data[key] = String(value);
    // 同步到 TT 存储
    tt.setStorageSync(key, value);
  },
  removeItem(key) {
    delete this.data[key];
    tt.removeStorageSync(key);
  },
  clear() {
    this.data = {};
    tt.clearStorageSync();
  }
};

// 从 TT 存储加载数据
try {
  const keys = tt.getStorageInfoSync().keys || [];
  keys.forEach(key => {
    window.localStorage.data[key] = tt.getStorageSync(key);
  });
} catch (e) {
  console.log('读取存储失败:', e);
}

// 适配 window 尺寸
const systemInfo = tt.getSystemInfoSync();
window.innerWidth = systemInfo.windowWidth;
window.innerHeight = systemInfo.windowHeight;
window.screen = {
  width: systemInfo.screenWidth,
  height: systemInfo.screenHeight,
  availWidth: systemInfo.windowWidth,
  availHeight: systemInfo.windowHeight
};

// 适配 Canvas
const canvas = tt.createCanvas();
window.HTMLCanvasElement = class HTMLCanvasElement {};
window.canvas = canvas;

// 适配 requestAnimationFrame
window.requestAnimationFrame = (callback) => {
  return tt.requestAnimationFrame(callback);
};
window.cancelAnimationFrame = (id) => {
  tt.cancelAnimationFrame(id);
};

// 适配 Audio
window.Audio = class Audio {
  constructor(src) {
    this.src = src;
    this.innerAudioContext = tt.createInnerAudioContext();
    if (src) {
      this.innerAudioContext.src = src;
    }
    this._volume = 1;
    this._loop = false;
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
    this._volume = value;
    this.innerAudioContext.volume = value;
  }
  
  get volume() {
    return this._volume;
  }
  
  set loop(value) {
    this._loop = value;
    this.innerAudioContext.loop = value;
  }
  
  get loop() {
    return this._loop;
  }
  
  set currentTime(value) {
    this.innerAudioContext.seek(value);
  }
  
  get currentTime() {
    return this.innerAudioContext.currentTime;
  }
  
  get duration() {
    return this.innerAudioContext.duration;
  }
  
  addEventListener(event, callback) {
    if (event === 'canplaythrough') {
      this.innerAudioContext.onCanplay(callback);
    } else if (event === 'ended') {
      this.innerAudioContext.onEnded(callback);
    } else if (event === 'error') {
      this.innerAudioContext.onError(callback);
    }
  }
};

// 适配 WebSocket
window.WebSocket = tt.connectSocket;

// 适配 fetch
try {
  if (!window.fetch) {
    window.fetch = (url, options) => {
      return new Promise((resolve, reject) => {
        const requestTask = tt.request({
          url: url,
          method: (options && options.method) || 'GET',
          data: (options && options.body) || '',
          header: (options && options.headers) || {},
          success: (res) => {
            resolve({
              ok: res.statusCode >= 200 && res.statusCode < 300,
              status: res.statusCode,
              statusText: '',
              json: () => Promise.resolve(res.data),
              text: () => Promise.resolve(typeof res.data === 'string' ? res.data : JSON.stringify(res.data)),
              headers: {
                get: (name) => res.header[name.toLowerCase()]
              }
            });
          },
          fail: (err) => {
            reject(err);
          }
        });
      });
    };
  }
} catch (e) {
  console.log('fetch 适配失败:', e);
}

// 监听游戏启动
tt.onShow(() => {
  console.log('游戏显示');
});

tt.onHide(() => {
  console.log('游戏隐藏');
});

// 加载游戏主文件
console.log('加载游戏...');
require('./assets/index.js');
`;

fs.writeFileSync(path.join(DEST_DIR, 'game.js'), gameJs);

// 修改 index.html 为抖音格式
const indexPath = path.join(DEST_DIR, 'index.html');
if (fs.existsSync(indexPath)) {
  let indexContent = fs.readFileSync(indexPath, 'utf-8');
  
  // 移除 vite 的 script 标签，因为抖音使用 game.js 作为入口
  indexContent = indexContent.replace(
    /<script type="module"[^>]*>.*?<\\/script>/s,
    ''
  );
  
  fs.writeFileSync(indexPath, indexContent);
}

console.log('✅ 抖音小游戏适配完成！');
console.log('📦 输出目录: dist-bytedance/');
console.log('💡 使用抖音开发者工具打开 dist-bytedance 目录进行预览和上传');
