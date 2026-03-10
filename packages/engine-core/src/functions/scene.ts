/**
 * 场景管理
 * 提供场景切换、场景堆栈管理能力
 */

import { clearScreen, KeyPressEvent } from '../core/terminal';
import { InputManager, InputEvent } from '../core/input';
import { GameRenderer } from '../core/renderer';

/**
 * 场景接口
 */
export interface Scene {
  name: string;
  onEnter?: () => void;
  onExit?: () => void;
  onUpdate?: () => void;
  onRender?: () => void;
  onInput?: (event: InputEvent) => void;
}

/**
 * 场景管理器配置
 */
export interface SceneManagerConfig {
  width?: number;
  height?: number;
  autoRender?: boolean;
  fps?: number;
}

/**
 * 场景管理器
 * 管理场景生命周期、切换和渲染
 */
export class SceneManager {
  private scenes: Map<string, Scene>;
  private sceneStack: Scene[];
  private currentScene: Scene | null;
  private renderer: GameRenderer;
  private inputManager: InputManager;
  private isRunning: boolean;
  private fps: number;
  private intervalId: NodeJS.Timeout | null;
  private width: number;
  private height: number;

  constructor(config: SceneManagerConfig = {}) {
    this.width = config.width || 20;
    this.height = config.height || 15;
    this.fps = config.fps || 30;
    this.scenes = new Map();
    this.sceneStack = [];
    this.currentScene = null;
    this.isRunning = false;
    this.intervalId = null;
    
    this.renderer = new GameRenderer({ width: this.width, height: this.height });
    this.inputManager = new InputManager({
      onInput: this.handleInput.bind(this)
    });
  }

  /**
   * 注册场景
   */
  registerScene(scene: Scene): void {
    this.scenes.set(scene.name, scene);
  }

  /**
   * 注销场景
   */
  unregisterScene(name: string): void {
    this.scenes.delete(name);
  }

  /**
   * 切换到指定场景
   */
  switchTo(name: string): boolean {
    const scene = this.scenes.get(name);
    if (!scene) return false;

    // 退出当前场景
    if (this.currentScene?.onExit) {
      this.currentScene.onExit();
    }

    this.currentScene = scene;

    // 进入新场景
    if (scene.onEnter) {
      scene.onEnter();
    }

    return true;
  }

  /**
   * 推入场景堆栈
   */
  pushScene(name: string): boolean {
    const scene = this.scenes.get(name);
    if (!scene) return false;

    if (this.currentScene) {
      this.sceneStack.push(this.currentScene);
    }

    this.currentScene = scene;

    if (scene.onEnter) {
      scene.onEnter();
    }

    return true;
  }

  /**
   * 弹出场景堆栈
   */
  popScene(): boolean {
    if (this.sceneStack.length === 0) return false;

    if (this.currentScene?.onExit) {
      this.currentScene.onExit();
    }

    this.currentScene = this.sceneStack.pop() || null;

    if (this.currentScene?.onEnter) {
      this.currentScene.onEnter();
    }

    return true;
  }

  /**
   * 获取当前场景
   */
  getCurrentScene(): Scene | null {
    return this.currentScene;
  }

  /**
   * 启动场景管理器
   */
  start(): void {
    this.isRunning = true;
    this.inputManager.enable();
    this.runLoop();
  }

  /**
   * 停止场景管理器
   */
  stop(): void {
    this.isRunning = false;
    this.inputManager.disable();
    if (this.intervalId) {
      clearTimeout(this.intervalId);
      this.intervalId = null;
    }
  }

  /**
   * 游戏循环
   */
  private runLoop(): void {
    if (!this.isRunning) return;

    this.update();
    this.render();

    const frameTime = 1000 / this.fps;
    this.intervalId = setTimeout(() => this.runLoop(), frameTime);
  }

  /**
   * 更新当前场景
   */
  private update(): void {
    if (this.currentScene?.onUpdate) {
      this.currentScene.onUpdate();
    }
  }

  /**
   * 渲染当前场景
   */
  private render(): void {
    if (this.currentScene?.onRender) {
      this.currentScene.onRender();
    }
  }

  /**
   * 处理输入事件
   */
  private handleInput(event: InputEvent): void {
    if (this.currentScene?.onInput) {
      this.currentScene.onInput(event);
    }
  }

  /**
   * 获取渲染器
   */
  getRenderer(): GameRenderer {
    return this.renderer;
  }

  /**
   * 获取输入管理器
   */
  getInputManager(): InputManager {
    return this.inputManager;
  }
}
