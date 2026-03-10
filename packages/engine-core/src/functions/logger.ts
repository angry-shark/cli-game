/**
 * 日志系统
 * 提供带颜色和级别的日志输出
 */

import { clearScreen } from '../core/terminal';

/**
 * 日志级别
 */
export enum LogLevel {
  DEBUG = 0,
  INFO = 1,
  WARN = 2,
  ERROR = 3,
  NONE = 4
}

/**
 * ANSI 颜色代码
 */
const COLORS = {
  reset: '\x1b[0m',
  bright: '\x1b[1m',
  dim: '\x1b[2m',
  red: '\x1b[31m',
  green: '\x1b[32m',
  yellow: '\x1b[33m',
  blue: '\x1b[34m',
  magenta: '\x1b[35m',
  cyan: '\x1b[36m',
  white: '\x1b[37m',
  gray: '\x1b[90m'
} as const;

/**
 * 日志级别样式
 */
const LEVEL_STYLES: Record<LogLevel, { label: string; color: string }> = {
  [LogLevel.DEBUG]: { label: 'DEBUG', color: COLORS.gray },
  [LogLevel.INFO]: { label: 'INFO ', color: COLORS.green },
  [LogLevel.WARN]: { label: 'WARN ', color: COLORS.yellow },
  [LogLevel.ERROR]: { label: 'ERROR', color: COLORS.red },
  [LogLevel.NONE]: { label: '', color: '' }
};

/**
 * 日志配置
 */
export interface LoggerConfig {
  level?: LogLevel;
  showTimestamp?: boolean;
  showLevel?: boolean;
  prefix?: string;
  useColors?: boolean;
}

/**
 * 日志记录器
 */
export class Logger {
  private config: Required<LoggerConfig>;
  private history: Array<{ level: LogLevel; message: string; timestamp: Date }>;

  constructor(config: LoggerConfig = {}) {
    this.config = {
      level: LogLevel.INFO,
      showTimestamp: true,
      showLevel: true,
      prefix: '',
      useColors: true,
      ...config
    };
    this.history = [];
  }

  /**
   * 设置日志级别
   */
  setLevel(level: LogLevel): void {
    this.config.level = level;
  }

  /**
   * 获取日志级别
   */
  getLevel(): LogLevel {
    return this.config.level;
  }

  /**
   * 记录日志
   */
  log(level: LogLevel, message: string, ...args: unknown[]): void {
    if (level < this.config.level) return;

    const timestamp = new Date();
    const formatted = this.format(level, message, args);
    
    this.history.push({ level, message: formatted, timestamp });
    
    // 限制历史记录数量
    if (this.history.length > 1000) {
      this.history.shift();
    }

    console.log(formatted);
  }

  /**
   * 格式化日志
   */
  private format(level: LogLevel, message: string, args: unknown[]): string {
    const parts: string[] = [];

    // 时间戳
    if (this.config.showTimestamp) {
      const time = new Date().toLocaleTimeString('zh-CN', { hour12: false });
      parts.push(this.colorize(`[${time}]`, COLORS.gray));
    }

    // 级别
    if (this.config.showLevel) {
      const style = LEVEL_STYLES[level];
      parts.push(this.colorize(`[${style.label}]`, style.color));
    }

    // 前缀
    if (this.config.prefix) {
      parts.push(this.colorize(`[${this.config.prefix}]`, COLORS.cyan));
    }

    // 消息
    let msg = message;
    if (args.length > 0) {
      msg += ' ' + args.map(arg => 
        typeof arg === 'object' ? JSON.stringify(arg) : String(arg)
      ).join(' ');
    }
    parts.push(msg);

    return parts.join(' ');
  }

  /**
   * 添加颜色
   */
  private colorize(text: string, color: string): string {
    if (!this.config.useColors) return text;
    return `${color}${text}${COLORS.reset}`;
  }

  /**
   * 调试日志
   */
  debug(message: string, ...args: unknown[]): void {
    this.log(LogLevel.DEBUG, message, ...args);
  }

  /**
   * 信息日志
   */
  info(message: string, ...args: unknown[]): void {
    this.log(LogLevel.INFO, message, ...args);
  }

  /**
   * 警告日志
   */
  warn(message: string, ...args: unknown[]): void {
    this.log(LogLevel.WARN, message, ...args);
  }

  /**
   * 错误日志
   */
  error(message: string, ...args: unknown[]): void {
    this.log(LogLevel.ERROR, message, ...args);
  }

  /**
   * 获取历史记录
   */
  getHistory(): Array<{ level: LogLevel; message: string; timestamp: Date }> {
    return [...this.history];
  }

  /**
   * 清空历史
   */
  clearHistory(): void {
    this.history = [];
  }

  /**
   * 显示所有历史日志
   */
  showHistory(): void {
    this.history.forEach(entry => {
      console.log(entry.message);
    });
  }
}

/**
 * 全局日志实例
 */
export const logger = new Logger();

/**
 * 带加载动画的日志
 * @param message 消息
 * @param operation 异步操作
 * @returns 操作结果
 */
export async function withSpinner<T>(
  message: string,
  operation: () => Promise<T>
): Promise<T> {
  const frames = ['⠋', '⠙', '⠹', '⠸', '⠼', '⠴', '⠦', '⠧', '⠇', '⠏'];
  let frameIndex = 0;
  
  process.stdout.write(`${frames[0]} ${message}...`);
  
  const interval = setInterval(() => {
    frameIndex = (frameIndex + 1) % frames.length;
    process.stdout.write(`\r${frames[frameIndex]} ${message}...`);
  }, 80);
  
  try {
    const result = await operation();
    clearInterval(interval);
    process.stdout.write(`\r✓ ${message} 完成\n`);
    return result;
  } catch (error) {
    clearInterval(interval);
    process.stdout.write(`\r✗ ${message} 失败\n`);
    throw error;
  }
}

/**
 * 创建带标题的分隔线
 * @param title 标题
 * @param width 宽度
 */
export function header(title: string, width: number = 50): void {
  const padding = Math.max(0, width - title.length - 2);
  const left = Math.floor(padding / 2);
  const right = padding - left;
  
  console.log('\n' + '═'.repeat(left) + ` ${title} ` + '═'.repeat(right));
}

/**
 * 创建分隔线
 * @param width 宽度
 */
export function separator(width: number = 50): void {
  console.log('─'.repeat(width));
}
