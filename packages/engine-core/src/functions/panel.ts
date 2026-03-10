/**
 * UI 面板系统
 * 提供 HUD、面板、状态栏等 UI 组件
 */

import { BORDER, GameRenderer } from '../core/renderer';

/**
 * 面板配置
 */
export interface PanelConfig {
  x?: number;
  y?: number;
  width: number;
  height: number;
  title?: string;
  border?: boolean;
}

/**
 * 面板
 * 可复用的 UI 容器
 */
export class Panel {
  public x: number;
  public y: number;
  public width: number;
  public height: number;
  public title?: string;
  public border: boolean;
  private content: string[];

  constructor(config: PanelConfig) {
    this.x = config.x || 0;
    this.y = config.y || 0;
    this.width = config.width;
    this.height = config.height;
    this.title = config.title;
    this.border = config.border !== false;
    this.content = [];
  }

  /**
   * 清空内容
   */
  clear(): void {
    this.content = [];
  }

  /**
   * 添加文本行
   */
  addLine(text: string = '', align: 'left' | 'center' | 'right' = 'left'): void {
    const maxWidth = this.border ? this.width - 2 : this.width;
    let formatted = text;

    if (align === 'center') {
      const padding = Math.max(0, maxWidth - text.length);
      formatted = ' '.repeat(Math.floor(padding / 2)) + text;
    } else if (align === 'right') {
      formatted = text.padStart(maxWidth);
    }

    formatted = formatted.slice(0, maxWidth);
    this.content.push(formatted);
  }

  /**
   * 添加多行文本
   */
  addText(text: string): void {
    const maxWidth = this.border ? this.width - 2 : this.width;
    
    // 简单的自动换行
    while (text.length > 0) {
      const line = text.slice(0, maxWidth);
      this.addLine(line);
      text = text.slice(maxWidth);
    }
  }

  /**
   * 添加空行
   */
  addEmptyLine(): void {
    this.addLine();
  }

  /**
   * 添加分隔线
   */
  addSeparator(char: string = '─'): void {
    const width = this.border ? this.width - 2 : this.width;
    this.addLine(char.repeat(width));
  }

  /**
   * 渲染面板到字符串数组
   */
  render(): string[] {
    const lines: string[] = [];

    if (this.border) {
      // 顶边框
      if (this.title) {
        const titleText = ` ${this.title} `;
        const sideWidth = Math.max(0, this.width - titleText.length - 2);
        const leftWidth = Math.floor(sideWidth / 2);
        const rightWidth = sideWidth - leftWidth;
        lines.push('┌' + '─'.repeat(leftWidth) + titleText + '─'.repeat(rightWidth) + '┐');
      } else {
        lines.push('┌' + '─'.repeat(this.width - 2) + '┐');
      }
    }

    // 内容区域
    const contentHeight = this.border ? this.height - 2 : this.height;
    for (let i = 0; i < contentHeight; i++) {
      const line = this.content[i] || '';
      const padding = ' '.repeat(Math.max(0, (this.border ? this.width - 2 : this.width) - line.length));
      
      if (this.border) {
        lines.push('│' + line + padding + '│');
      } else {
        lines.push(line + padding);
      }
    }

    if (this.border) {
      lines.push('└' + '─'.repeat(this.width - 2) + '┘');
    }

    return lines;
  }

  /**
   * 设置位置
   */
  setPosition(x: number, y: number): void {
    this.x = x;
    this.y = y;
  }
}

/**
 * 进度条样式
 */
export interface ProgressBarStyle {
  filled: string;
  empty: string;
  leftCap?: string;
  rightCap?: string;
  width?: number;
  showValue?: boolean;
}

/**
 * 默认样式
 */
const DEFAULT_PROGRESS_STYLE: ProgressBarStyle = {
  filled: '█',
  empty: '░',
  leftCap: '[',
  rightCap: ']',
  width: 20,
  showValue: true
};

/**
 * 渲染进度条
 */
export function renderProgressBar(
  current: number,
  max: number,
  style: Partial<ProgressBarStyle> = {}
): string {
  const s = { ...DEFAULT_PROGRESS_STYLE, ...style };
  const percent = max > 0 ? current / max : 0;
  const filled = Math.round(s.width! * percent);
  const empty = s.width! - filled;

  let bar = '';
  if (s.leftCap) bar += s.leftCap;
  bar += s.filled.repeat(filled);
  bar += s.empty.repeat(empty);
  if (s.rightCap) bar += s.rightCap;

  if (s.showValue) {
    bar += ` ${current}/${max}`;
  }

  return bar;
}

/**
 * 血条样式
 */
export function renderHealthBar(current: number, max: number, width: number = 20): string {
  const percent = max > 0 ? current / max : 0;
  let color = '';
  
  if (percent > 0.6) {
    color = '\x1b[32m'; // 绿色
  } else if (percent > 0.3) {
    color = '\x1b[33m'; // 黄色
  } else {
    color = '\x1b[31m'; // 红色
  }
  
  const reset = '\x1b[0m';
  const filled = Math.round(width * percent);
  const empty = width - filled;
  
  return `${color}${'█'.repeat(filled)}${'░'.repeat(empty)}${reset} ${current}/${max}`;
}

/**
 * 经验条样式
 */
export function renderExpBar(current: number, max: number, width: number = 20): string {
  const percent = max > 0 ? current / max : 0;
  const filled = Math.round(width * percent);
  const empty = width - filled;
  
  return `\x1b[36m${'█'.repeat(filled)}${'░'.repeat(empty)}\x1b[0m ${current}/${max} XP`;
}

/**
 * 分割布局
 * 将屏幕分割为多个区域
 */
export class SplitLayout {
  private width: number;
  private height: number;
  private panels: Panel[];

  constructor(width: number, height: number) {
    this.width = width;
    this.height = height;
    this.panels = [];
  }

  /**
   * 添加面板
   */
  addPanel(panel: Panel): void {
    this.panels.push(panel);
  }

  /**
   * 渲染整个布局
   */
  render(): string[] {
    // 创建空白画布
    const canvas: string[][] = Array(this.height)
      .fill(null)
      .map(() => Array(this.width).fill(' '));

    // 渲染每个面板
    for (const panel of this.panels) {
      const lines = panel.render();
      for (let i = 0; i < lines.length && panel.y + i < this.height; i++) {
        const line = lines[i];
        for (let j = 0; j < line.length && panel.x + j < this.width; j++) {
          canvas[panel.y + i][panel.x + j] = line[j];
        }
      }
    }

    return canvas.map(row => row.join(''));
  }

  /**
   * 渲染并输出
   */
  flush(): void {
    const lines = this.render();
    console.clear();
    lines.forEach(line => console.log(line));
  }
}

/**
 * HUD（头顶显示）
 * 用于显示角色状态等固定信息
 */
export class HUD {
  private panels: Map<string, Panel>;
  private layout: SplitLayout | null;
  private screenWidth: number;
  private screenHeight: number;

  constructor(screenWidth: number, screenHeight: number) {
    this.panels = new Map();
    this.layout = null;
    this.screenWidth = screenWidth;
    this.screenHeight = screenHeight;
  }

  /**
   * 创建信息面板
   */
  createInfoPanel(
    name: string,
    x: number,
    y: number,
    width: number,
    height: number,
    title?: string
  ): Panel {
    const panel = new Panel({ x, y, width, height, title, border: true });
    this.panels.set(name, panel);
    return panel;
  }

  /**
   * 获取面板
   */
  getPanel(name: string): Panel | undefined {
    return this.panels.get(name);
  }

  /**
   * 更新角色状态面板
   */
  updateStatusPanel(
    panelName: string,
    data: {
      name: string;
      level: number;
      hp: number;
      maxHp: number;
      mp: number;
      maxMp: number;
      exp: number;
      maxExp: number;
      gold: number;
    }
  ): void {
    const panel = this.panels.get(panelName);
    if (!panel) return;

    panel.clear();
    panel.addLine(` ${data.name}  Lv.${data.level}`, 'center');
    panel.addSeparator();
    panel.addLine(` HP: ${renderHealthBar(data.hp, data.maxHp, 15)}`);
    panel.addLine(` MP: ${renderProgressBar(data.mp, data.maxMp, { width: 15, filled: '▓', empty: '░' })}`);
    panel.addLine(` EXP: ${renderExpBar(data.exp, data.maxExp, 15)}`);
    panel.addSeparator();
    panel.addLine(` 💰 ${data.gold} G`);
  }

  /**
   * 更新属性面板
   */
  updateStatsPanel(
    panelName: string,
    stats: Record<string, number>
  ): void {
    const panel = this.panels.get(panelName);
    if (!panel) return;

    panel.clear();
    panel.addLine(' 属性', 'center');
    panel.addSeparator();
    
    for (const [key, value] of Object.entries(stats)) {
      const label = key.padEnd(8);
      const num = value.toString().padStart(4);
      panel.addLine(` ${label}: ${num}`);
    }
  }

  /**
   * 渲染所有面板
   */
  render(): string[] {
    const layout = new SplitLayout(this.screenWidth, this.screenHeight);
    
    for (const panel of this.panels.values()) {
      layout.addPanel(panel);
    }

    return layout.render();
  }

  /**
   * 清空所有面板
   */
  clearAll(): void {
    for (const panel of this.panels.values()) {
      panel.clear();
    }
  }
}

/**
 * 消息日志面板
 */
export class MessageLog extends Panel {
  private maxMessages: number;
  private messages: Array<{ text: string; color?: string }>;

  constructor(config: PanelConfig & { maxMessages?: number }) {
    super(config);
    this.maxMessages = config.maxMessages || 100;
    this.messages = [];
  }

  /**
   * 添加消息
   */
  addMessage(text: string, color?: string): void {
    this.messages.push({ text, color });
    
    if (this.messages.length > this.maxMessages) {
      this.messages.shift();
    }

    this.refresh();
  }

  /**
   * 刷新显示
   */
  private refresh(): void {
    this.clear();
    
    const visibleMessages = this.messages.slice(-(this.height - 2));
    for (const msg of visibleMessages) {
      let text = msg.text;
      if (msg.color) {
        text = `${msg.color}${text}\x1b[0m`;
      }
      this.addLine(text);
    }
  }

  /**
   * 清空消息
   */
  clearMessages(): void {
    this.messages = [];
    this.clear();
  }
}
