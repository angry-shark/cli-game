/**
 * 菜单系统
 * 提供交互式菜单、选择列表等功能
 */

import { GameRenderer, BORDER } from '../core/renderer';
import { InputEvent, GameAction, Direction } from '../core/input';
import { clearScreen, waitForAnyKey } from '../core/terminal';

/**
 * 菜单项
 */
export interface MenuItem {
  label: string;
  value: string;
  disabled?: boolean;
  shortcut?: string;
}

/**
 * 菜单配置
 */
export interface MenuConfig {
  title?: string;
  items: MenuItem[];
  showBorder?: boolean;
  showShortcuts?: boolean;
}

/**
 * 菜单结果
 */
export interface MenuResult {
  selected: boolean;
  value: string | null;
  index: number;
}

/**
 * 交互式菜单
 */
export class InteractiveMenu {
  private config: MenuConfig;
  private selectedIndex: number;
  private renderer: GameRenderer;

  constructor(config: MenuConfig) {
    this.config = {
      showBorder: true,
      showShortcuts: true,
      ...config
    };
    this.selectedIndex = 0;
    
    // 计算需要的宽度
    const maxLabelLength = Math.max(
      ...config.items.map(item => item.label.length),
      config.title?.length || 0
    );
    const width = Math.max(maxLabelLength + 8, 20);
    const height = config.items.length + 4 + (config.title ? 2 : 0);
    
    this.renderer = new GameRenderer({ width, height });
  }

  /**
   * 渲染菜单
   */
  render(): void {
    this.renderer.reset();

    if (this.config.showBorder) {
      this.renderer.renderTopBorder();
    }

    // 标题
    if (this.config.title) {
      const padding = ' '.repeat(Math.max(1, (this.renderer['config'].width - this.config.title.length) / 2));
      this.renderer.renderInfo(`${padding}${this.config.title}`, 0);
      if (this.config.showBorder) {
        this.renderer.renderRow(Array(this.renderer['config'].width).fill(BORDER.HORIZONTAL[0]));
      } else {
        this.renderer.renderNewLine();
      }
    }

    // 菜单项
    this.config.items.forEach((item, index) => {
      const isSelected = index === this.selectedIndex;
      const prefix = isSelected ? '▶ ' : '  ';
      const suffix = this.config.showShortcuts && item.shortcut ? ` [${item.shortcut}]` : '';
      const disabled = item.disabled ? ' (禁用)' : '';
      const label = `${prefix}${item.label}${suffix}${disabled}`;
      
      this.renderer.renderInfo(label);
    });

    if (this.config.showBorder) {
      this.renderer.renderBottomBorder();
    }

    this.renderer.renderNewLine();
    this.renderer.renderInfo('↑↓选择, Enter确认, Q退出');
    this.renderer.flush();
  }

  /**
   * 移动选择
   */
  moveUp(): void {
    do {
      this.selectedIndex = (this.selectedIndex - 1 + this.config.items.length) % this.config.items.length;
    } while (this.config.items[this.selectedIndex].disabled);
  }

  /**
   * 移动选择
   */
  moveDown(): void {
    do {
      this.selectedIndex = (this.selectedIndex + 1) % this.config.items.length;
    } while (this.config.items[this.selectedIndex].disabled);
  }

  /**
   * 处理输入
   */
  handleInput(event: InputEvent): MenuResult | null {
    switch (event.action) {
      case GameAction.MOVE:
        if (event.direction === Direction.UP) {
          this.moveUp();
        } else if (event.direction === Direction.DOWN) {
          this.moveDown();
        }
        this.render();
        return null;
      
      case GameAction.QUIT:
        return { selected: false, value: null, index: -1 };
      
      default:
        // 检查快捷键
        if (event.rawKey?.sequence) {
          const shortcut = event.rawKey.sequence.toLowerCase();
          const item = this.config.items.find(i => i.shortcut?.toLowerCase() === shortcut);
          if (item && !item.disabled) {
            return { selected: true, value: item.value, index: this.config.items.indexOf(item) };
          }
        }
        return null;
    }
  }

  /**
   * 获取当前选中的值
   */
  getSelectedValue(): string {
    return this.config.items[this.selectedIndex].value;
  }
}

/**
 * 显示简单的确认对话框
 * @param message 提示消息
 * @returns Promise<boolean> 用户选择
 */
export async function confirm(message: string): Promise<boolean> {
  clearScreen();
  console.log(`\n${message}`);
  console.log('\n  [Y] 是    [N] 否\n');
  
  return new Promise((resolve) => {
    const handler = (str: string, key: { name?: string; sequence?: string }) => {
      process.stdin.off('keypress', handler);
      
      const input = key.sequence?.toLowerCase() || key.name?.toLowerCase();
      if (input === 'y' || input === 'enter') {
        resolve(true);
      } else {
        resolve(false);
      }
    };
    
    process.stdin.once('keypress', handler);
  });
}

/**
 * 显示消息对话框
 * @param message 消息内容
 * @param title 标题（可选）
 */
export async function alert(message: string, title?: string): Promise<void> {
  clearScreen();
  
  if (title) {
    console.log(`\n╔${'═'.repeat(40)}╗`);
    console.log(`║${title.padStart(20 + title.length / 2).padEnd(40)}║`);
    console.log(`╠${'═'.repeat(40)}╣`);
  } else {
    console.log(`\n╔${'═'.repeat(40)}╗`);
  }
  
  const lines = message.split('\n');
  lines.forEach(line => {
    console.log(`║${line.padEnd(40)}║`);
  });
  
  console.log(`╚${'═'.repeat(40)}╝`);
  console.log('\n按任意键继续...');
  
  await waitForAnyKey();
}
