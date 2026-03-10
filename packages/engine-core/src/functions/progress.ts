/**
 * 进度条组件
 * 提供各种进度显示功能
 */

import { clearScreen } from '../core/terminal';

/**
 * 进度条配置
 */
export interface ProgressBarConfig {
  total: number;
  width?: number;
  title?: string;
  showPercent?: boolean;
  showValue?: boolean;
  charFilled?: string;
  charEmpty?: string;
}

/**
 * 进度条类
 */
export class ProgressBar {
  private config: Required<ProgressBarConfig>;
  private current: number;

  constructor(config: ProgressBarConfig) {
    this.config = {
      width: 40,
      title: '',
      showPercent: true,
      showValue: true,
      charFilled: '█',
      charEmpty: '░',
      ...config
    };
    this.current = 0;
  }

  /**
   * 更新进度
   * @param value 当前值
   */
  update(value: number): void {
    this.current = Math.min(Math.max(0, value), this.config.total);
    this.render();
  }

  /**
   * 增加进度
   * @param delta 增量
   */
  increment(delta: number = 1): void {
    this.update(this.current + delta);
  }

  /**
   * 渲染进度条
   */
  render(): void {
    const percent = this.current / this.config.total;
    const filled = Math.round(this.config.width * percent);
    const empty = this.config.width - filled;
    
    const bar = this.config.charFilled.repeat(filled) + this.config.charEmpty.repeat(empty);
    
    let output = '\r';
    
    if (this.config.title) {
      output += `${this.config.title} `;
    }
    
    output += `|${bar}|`;
    
    if (this.config.showPercent) {
      output += ` ${Math.round(percent * 100)}%`;
    }
    
    if (this.config.showValue) {
      output += ` (${this.current}/${this.config.total})`;
    }
    
    process.stdout.write(output);
  }

  /**
   * 完成进度条
   */
  complete(message?: string): void {
    this.update(this.config.total);
    process.stdout.write('\n');
    if (message) {
      console.log(message);
    }
  }

  /**
   * 获取当前进度
   */
  getCurrent(): number {
    return this.current;
  }

  /**
   * 获取总进度
   */
  getTotal(): number {
    return this.config.total;
  }
}

/**
 * 带 ETA 的进度条
 */
export class ProgressBarWithETA extends ProgressBar {
  private startTime: number;

  constructor(config: ProgressBarConfig) {
    super(config);
    this.startTime = Date.now();
  }

  /**
   * 渲染带 ETA 的进度条
   */
  render(): void {
    const percent = this.getCurrent() / this.getTotal();
    const elapsed = Date.now() - this.startTime;
    const eta = percent > 0 ? (elapsed / percent) - elapsed : 0;
    
    super.render();
    
    // 添加 ETA
    const etaSec = Math.round(eta / 1000);
    process.stdout.write(` ETA: ${etaSec}s`);
  }
}

/**
 * 简单的加载动画
 * @param message 加载消息
 * @returns 停止动画的函数
 */
export function loading(message: string = '加载中'): () => void {
  const frames = ['⠋', '⠙', '⠹', '⠸', '⠼', '⠴', '⠦', '⠧', '⠇', '⠏'];
  let frameIndex = 0;
  
  const interval = setInterval(() => {
    process.stdout.write(`\r${frames[frameIndex]} ${message}...`);
    frameIndex = (frameIndex + 1) % frames.length;
  }, 80);
  
  return () => {
    clearInterval(interval);
    process.stdout.write('\r' + ' '.repeat(message.length + 10) + '\r');
  };
}

/**
 * 显示倒计时
 * @param seconds 倒计时秒数
 * @param message 显示消息
 * @returns Promise，倒计时结束 resolve
 */
export function countdown(seconds: number, message?: string): Promise<void> {
  return new Promise((resolve) => {
    let remaining = seconds;
    
    const tick = () => {
      if (message) {
        process.stdout.write(`\r${message} ${remaining}秒...`);
      } else {
        process.stdout.write(`\r倒计时: ${remaining}秒`);
      }
      
      remaining--;
      
      if (remaining < 0) {
        process.stdout.write('\n');
        resolve();
      } else {
        setTimeout(tick, 1000);
      }
    };
    
    tick();
  });
}

/**
 * 模拟异步操作的进度
 * @param operation 异步操作
 * @param config 进度条配置
 * @returns 操作结果
 */
export async function withProgress<T>(
  operation: Promise<T>,
  config: Omit<ProgressBarConfig, 'total'>
): Promise<T> {
  const bar = new ProgressBar({ ...config, total: 100 });
  
  // 模拟进度
  let progress = 0;
  const interval = setInterval(() => {
    progress += Math.random() * 10;
    if (progress > 90) progress = 90;
    bar.update(progress);
  }, 200);
  
  try {
    const result = await operation;
    clearInterval(interval);
    bar.complete('完成!');
    return result;
  } catch (error) {
    clearInterval(interval);
    throw error;
  }
}
