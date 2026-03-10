/**
 * 背包/物品系统
 * 提供物品管理、背包、装备等功能
 */

import { Panel } from './panel';
import { InputEvent, GameAction, Direction } from '../core/input';

/**
 * 物品类型
 */
export enum ItemType {
  WEAPON = 'weapon',
  ARMOR = 'armor',
  ACCESSORY = 'accessory',
  CONSUMABLE = 'consumable',
  MATERIAL = 'material',
  QUEST = 'quest',
  MISC = 'misc'
}

/**
 * 物品稀有度
 */
export enum ItemRarity {
  COMMON = 'common',
  UNCOMMON = 'uncommon',
  RARE = 'rare',
  EPIC = 'epic',
  LEGENDARY = 'legendary'
}

/**
 * 物品属性
 */
export interface ItemStats {
  attack?: number;
  defense?: number;
  hp?: number;
  mp?: number;
  speed?: number;
  critical?: number;
  [key: string]: number | undefined;
}

/**
 * 物品定义
 */
export interface Item {
  id: string;
  name: string;
  description: string;
  type: ItemType;
  rarity: ItemRarity;
  icon: string;
  stackable: boolean;
  maxStack: number;
  value: number; // 金币价值
  stats?: ItemStats;
  usable?: boolean;
  equippable?: boolean;
  equipSlot?: string;
  levelReq?: number;
  effects?: Array<{
    type: string;
    value: number;
    duration?: number;
  }>;
}

/**
 * 背包中的物品槽
 */
export interface InventorySlot {
  item: Item;
  quantity: number;
}

/**
 * 已装备的物品
 */
export interface Equipment {
  weapon?: Item;
  helmet?: Item;
  armor?: Item;
  gloves?: Item;
  boots?: Item;
  accessory1?: Item;
  accessory2?: Item;
}

/**
 * 背包配置
 */
export interface InventoryConfig {
  capacity: number;
  maxWeight?: number;
}

/**
 * 背包系统
 */
export class Inventory {
  private slots: (InventorySlot | null)[];
  private equipment: Equipment;
  private capacity: number;
  private gold: number;

  constructor(config: InventoryConfig) {
    this.capacity = config.capacity;
    this.slots = Array(config.capacity).fill(null);
    this.equipment = {};
    this.gold = 0;
  }

  /**
   * 添加物品到背包
   * @param item 物品
   * @param quantity 数量
   * @returns 实际添加数量，0 表示背包已满
   */
  addItem(item: Item, quantity: number = 1): number {
    if (quantity <= 0) return 0;

    let remaining = quantity;

    // 先尝试堆叠到已有物品
    if (item.stackable) {
      for (const slot of this.slots) {
        if (slot && slot.item.id === item.id && slot.quantity < item.maxStack) {
          const canAdd = Math.min(remaining, item.maxStack - slot.quantity);
          slot.quantity += canAdd;
          remaining -= canAdd;
          if (remaining <= 0) return quantity;
        }
      }
    }

    // 放入空槽位
    for (let i = 0; i < this.slots.length; i++) {
      if (this.slots[i] === null) {
        const canAdd = item.stackable ? Math.min(remaining, item.maxStack) : 1;
        this.slots[i] = { item: { ...item }, quantity: canAdd };
        remaining -= canAdd;
        if (remaining <= 0) return quantity;
      }
    }

    return quantity - remaining;
  }

  /**
   * 移除物品
   * @param slotIndex 槽位索引
   * @param quantity 数量，默认为全部
   * @returns 是否成功
   */
  removeItem(slotIndex: number, quantity?: number): boolean {
    const slot = this.slots[slotIndex];
    if (!slot) return false;

    const removeQty = quantity || slot.quantity;
    
    if (removeQty >= slot.quantity) {
      this.slots[slotIndex] = null;
    } else {
      slot.quantity -= removeQty;
    }

    return true;
  }

  /**
   * 使用物品
   * @param slotIndex 槽位索引
   * @returns 使用效果，null 表示无法使用
   */
  useItem(slotIndex: number): Item | null {
    const slot = this.slots[slotIndex];
    if (!slot || !slot.item.usable) return null;

    const item = slot.item;

    // 消耗物品
    if (item.stackable) {
      slot.quantity--;
      if (slot.quantity <= 0) {
        this.slots[slotIndex] = null;
      }
    } else {
      this.slots[slotIndex] = null;
    }

    return item;
  }

  /**
   * 装备物品
   * @param slotIndex 背包槽位索引
   * @returns 卸下的旧装备（如果有）
   */
  equipItem(slotIndex: number): Item | null {
    const slot = this.slots[slotIndex];
    if (!slot || !slot.item.equippable || !slot.item.equipSlot) return null;

    const item = slot.item;
    const equipSlot = item.equipSlot as keyof Equipment;

    // 获取当前装备
    const oldEquipment = this.equipment[equipSlot];

    // 装备新物品
    this.equipment[equipSlot] = { ...item };

    // 从背包移除
    this.removeItem(slotIndex, 1);

    // 旧装备放回背包（如果有）
    if (oldEquipment) {
      this.addItem(oldEquipment, 1);
    }

    return oldEquipment || null;
  }

  /**
   * 卸下装备
   * @param equipSlot 装备槽位
   * @returns 卸下的装备，null 表示背包满或没有装备
   */
  unequipItem(equipSlot: keyof Equipment): Item | null {
    const item = this.equipment[equipSlot];
    if (!item) return null;

    // 尝试放入背包
    const added = this.addItem(item, 1);
    if (added === 0) return null;

    // 卸下成功
    delete this.equipment[equipSlot];
    return item;
  }

  /**
   * 获取装备属性总和
   */
  getEquipmentStats(): ItemStats {
    const total: ItemStats = {};

    for (const item of Object.values(this.equipment)) {
      if (item?.stats) {
        for (const [key, value] of Object.entries(item.stats)) {
          if (typeof value === 'number') {
            total[key] = (total[key] || 0) + value;
          }
        }
      }
    }

    return total;
  }

  /**
   * 获取背包物品
   */
  getItems(): (InventorySlot | null)[] {
    return [...this.slots];
  }

  /**
   * 获取已占用槽位数
   */
  getUsedSlots(): number {
    return this.slots.filter(slot => slot !== null).length;
  }

  /**
   * 获取空槽位数
   */
  getEmptySlots(): number {
    return this.capacity - this.getUsedSlots();
  }

  /**
   * 获取背包容量
   */
  getCapacity(): number {
    return this.capacity;
  }

  /**
   * 检查背包是否已满
   */
  isFull(): boolean {
    return this.getEmptySlots() === 0;
  }

  /**
   * 获取装备
   */
  getEquipment(): Equipment {
    return { ...this.equipment };
  }

  /**
   * 添加金币
   */
  addGold(amount: number): void {
    this.gold += amount;
  }

  /**
   * 扣除金币
   * @returns 是否成功
   */
  removeGold(amount: number): boolean {
    if (this.gold < amount) return false;
    this.gold -= amount;
    return true;
  }

  /**
   * 获取金币数量
   */
  getGold(): number {
    return this.gold;
  }

  /**
   * 查找物品
   * @param itemId 物品ID
   * @returns 槽位索引数组
   */
  findItem(itemId: string): number[] {
    const indices: number[] = [];
    for (let i = 0; i < this.slots.length; i++) {
      if (this.slots[i]?.item.id === itemId) {
        indices.push(i);
      }
    }
    return indices;
  }

  /**
   * 获取物品总数
   */
  getItemCount(itemId: string): number {
    let count = 0;
    for (const slot of this.slots) {
      if (slot?.item.id === itemId) {
        count += slot.quantity;
      }
    }
    return count;
  }

  /**
   * 整理背包（堆叠相同物品）
   */
  organize(): void {
    // 收集所有物品
    const allItems: Array<{ item: Item; quantity: number }> = [];
    for (const slot of this.slots) {
      if (slot) {
        allItems.push({ item: slot.item, quantity: slot.quantity });
      }
    }

    // 清空背包
    this.slots.fill(null);

    // 重新添加（会自动堆叠）
    for (const { item, quantity } of allItems) {
      this.addItem(item, quantity);
    }
  }

  /**
   * 序列化
   */
  serialize(): object {
    return {
      slots: this.slots,
      equipment: this.equipment,
      gold: this.gold
    };
  }

  /**
   * 反序列化
   */
  static deserialize(data: { slots: (InventorySlot | null)[]; equipment: Equipment; gold: number }, config: InventoryConfig): Inventory {
    const inv = new Inventory(config);
    inv.slots = data.slots;
    inv.equipment = data.equipment;
    inv.gold = data.gold;
    return inv;
  }
}

/**
 * 稀有度颜色
 */
export const RARITY_COLORS: Record<ItemRarity, string> = {
  [ItemRarity.COMMON]: '\x1b[37m',     // 白色
  [ItemRarity.UNCOMMON]: '\x1b[32m',   // 绿色
  [ItemRarity.RARE]: '\x1b[34m',       // 蓝色
  [ItemRarity.EPIC]: '\x1b[35m',       // 紫色
  [ItemRarity.LEGENDARY]: '\x1b[33m'   // 黄色/金色
};

/**
 * 物品类型图标
 */
export const ITEM_TYPE_ICONS: Record<ItemType, string> = {
  [ItemType.WEAPON]: '⚔️',
  [ItemType.ARMOR]: '🛡️',
  [ItemType.ACCESSORY]: '💍',
  [ItemType.CONSUMABLE]: '🧪',
  [ItemType.MATERIAL]: '🔧',
  [ItemType.QUEST]: '📜',
  [ItemType.MISC]: '📦'
};

/**
 * 背包 UI 面板
 */
export class InventoryPanel extends Panel {
  private inventory: Inventory;
  private selectedIndex: number;
  private filter: ItemType | null;
  private filteredIndices: number[];

  constructor(config: { x?: number; y?: number; width: number; height: number; title?: string; border?: boolean; inventory: Inventory }) {
    super(config);
    this.inventory = config.inventory;
    this.selectedIndex = 0;
    this.filter = null;
    this.filteredIndices = [];
    this.refresh();
  }

  /**
   * 设置筛选
   */
  setFilter(type: ItemType | null): void {
    this.filter = type;
    this.selectedIndex = 0;
    this.refresh();
  }

  /**
   * 获取筛选后的物品索引
   */
  private getFilteredIndices(): number[] {
    if (!this.filter) {
      return this.inventory.getItems().map((_, i) => i);
    }

    const items = this.inventory.getItems();
    return items
      .map((slot, i) => ({ slot, i }))
      .filter(({ slot }) => slot?.item.type === this.filter)
      .map(({ i }) => i);
  }

  /**
   * 移动选择
   */
  moveSelection(direction: Direction): void {
    this.filteredIndices = this.getFilteredIndices();
    
    if (this.filteredIndices.length === 0) return;

    const currentFilteredIndex = this.filteredIndices.indexOf(this.selectedIndex);
    let newFilteredIndex = currentFilteredIndex;

    switch (direction) {
      case Direction.UP:
        newFilteredIndex = Math.max(0, currentFilteredIndex - 1);
        break;
      case Direction.DOWN:
        newFilteredIndex = Math.min(this.filteredIndices.length - 1, currentFilteredIndex + 1);
        break;
    }

    this.selectedIndex = this.filteredIndices[newFilteredIndex];
    this.refresh();
  }

  /**
   * 获取当前选中的物品
   */
  getSelectedItem(): InventorySlot | null {
    const items = this.inventory.getItems();
    return items[this.selectedIndex];
  }

  /**
   * 获取当前选中索引
   */
  getSelectedIndex(): number {
    return this.selectedIndex;
  }

  /**
   * 刷新显示
   */
  refresh(): void {
    this.clear();
    this.filteredIndices = this.getFilteredIndices();

    const items = this.inventory.getItems();
    const contentHeight = this.height - 4;

    // 标题
    const filterText = this.filter ? ` [${this.filter}]` : '';
    this.addLine(` 背包 ${this.inventory.getUsedSlots()}/${this.inventory.getCapacity()}${filterText}`, 'center');
    this.addSeparator();

    // 物品列表
    let displayedCount = 0;
    for (let i = 0; i < items.length && displayedCount < contentHeight; i++) {
      const slot = items[i];
      
      // 跳过不符合筛选条件的
      if (this.filter && slot?.item.type !== this.filter) continue;

      const isSelected = i === this.selectedIndex;
      const prefix = isSelected ? '▶ ' : '  ';

      if (slot) {
        const item = slot.item;
        const color = RARITY_COLORS[item.rarity];
        const reset = '\x1b[0m';
        const icon = ITEM_TYPE_ICONS[item.type] || '📦';
        const stackText = slot.quantity > 1 ? ` x${slot.quantity}` : '';
        const name = `${icon} ${item.name}${stackText}`.slice(0, this.width - 8);
        
        this.addLine(`${prefix}${color}${name}${reset}`);
      } else {
        this.addLine(`${prefix}─`.repeat(this.width - 4));
      }

      displayedCount++;
    }

    // 填充空行
    while (displayedCount < contentHeight) {
      this.addLine();
      displayedCount++;
    }

    this.addSeparator();
    this.addLine(' ↑↓选择 TAB切换分类', 'left');
  }

  /**
   * 获取背包
   */
  getInventory(): Inventory {
    return this.inventory;
  }
}

/**
 * 物品详情面板
 */
export class ItemDetailPanel extends Panel {
  private item: InventorySlot | null;

  constructor(config: { x?: number; y?: number; width: number; height: number; title?: string; border?: boolean }) {
    super(config);
    this.item = null;
  }

  /**
   * 设置显示的物品
   */
  setItem(slot: InventorySlot | null): void {
    this.item = slot;
    this.refresh();
  }

  /**
   * 刷新显示
   */
  refresh(): void {
    this.clear();

    if (!this.item) {
      this.addLine(' 物品详情', 'center');
      this.addSeparator();
      this.addLine();
      this.addLine(' 选择一个物品', 'center');
      this.addLine(' 查看详细信息', 'center');
      return;
    }

    const item = this.item.item;
    const color = RARITY_COLORS[item.rarity];
    const reset = '\x1b[0m';

    this.addLine(` ${color}${item.name}${reset}`, 'center');
    this.addSeparator();
    
    // 类型和稀有度
    this.addLine(` ${ITEM_TYPE_ICONS[item.type]} ${item.type} | ${item.rarity}`);
    this.addLine();

    // 描述
    const descLines = this.wrapText(item.description, this.width - 4);
    for (const line of descLines) {
      this.addLine(` ${line}`);
    }
    this.addLine();

    // 属性
    if (item.stats) {
      this.addLine(' 属性:', 'left');
      for (const [key, value] of Object.entries(item.stats)) {
        if (value !== undefined) {
          const sign = value >= 0 ? '+' : '';
          this.addLine(`   ${key}: ${sign}${value}`);
        }
      }
      this.addLine();
    }

    // 价值
    this.addLine(` 💰 价值: ${item.value} G`);
  }

  /**
   * 自动换行
   */
  private wrapText(text: string, maxWidth: number): string[] {
    const words = text.split(' ');
    const lines: string[] = [];
    let currentLine = '';

    for (const word of words) {
      if (currentLine.length + word.length + 1 <= maxWidth) {
        currentLine += (currentLine ? ' ' : '') + word;
      } else {
        if (currentLine) lines.push(currentLine);
        currentLine = word;
      }
    }
    if (currentLine) lines.push(currentLine);

    return lines;
  }
}

/**
 * 装备面板
 */
export class EquipmentPanel extends Panel {
  private equipment: Equipment;

  constructor(config: { x?: number; y?: number; width: number; height: number; title?: string; border?: boolean; equipment: Equipment }) {
    super(config);
    this.equipment = config.equipment;
  }

  /**
   * 刷新显示
   */
  refresh(): void {
    this.clear();
    this.addLine(' 装备', 'center');
    this.addSeparator();

    const slots: Array<{ key: keyof Equipment; label: string }> = [
      { key: 'weapon', label: '武器' },
      { key: 'helmet', label: '头盔' },
      { key: 'armor', label: '铠甲' },
      { key: 'gloves', label: '手套' },
      { key: 'boots', label: '靴子' },
      { key: 'accessory1', label: '饰品1' },
      { key: 'accessory2', label: '饰品2' }
    ];

    for (const { key, label } of slots) {
      const item = this.equipment[key];
      if (item) {
        const color = RARITY_COLORS[item.rarity];
        const reset = '\x1b[0m';
        this.addLine(` ${label}: ${color}${item.name}${reset}`);
      } else {
        this.addLine(` ${label}: ──────`);
      }
    }
  }
}

/**
 * 预定义物品库
 */
export const ITEM_DATABASE: Record<string, Item> = {
  // 武器
  'wooden_sword': {
    id: 'wooden_sword',
    name: '木剑',
    description: '新手冒险者的基础武器',
    type: ItemType.WEAPON,
    rarity: ItemRarity.COMMON,
    icon: '⚔️',
    stackable: false,
    maxStack: 1,
    value: 10,
    stats: { attack: 5 },
    equippable: true,
    equipSlot: 'weapon'
  },
  'iron_sword': {
    id: 'iron_sword',
    name: '铁剑',
    description: '坚固耐用的铁制长剑',
    type: ItemType.WEAPON,
    rarity: ItemRarity.UNCOMMON,
    icon: '⚔️',
    stackable: false,
    maxStack: 1,
    value: 50,
    stats: { attack: 12 },
    equippable: true,
    equipSlot: 'weapon'
  },
  // 护甲
  'leather_armor': {
    id: 'leather_armor',
    name: '皮甲',
    description: '轻便的皮革护甲',
    type: ItemType.ARMOR,
    rarity: ItemRarity.COMMON,
    icon: '🛡️',
    stackable: false,
    maxStack: 1,
    value: 30,
    stats: { defense: 8 },
    equippable: true,
    equipSlot: 'armor'
  },
  // 消耗品
  'health_potion': {
    id: 'health_potion',
    name: '生命药水',
    description: '恢复 50 点生命值',
    type: ItemType.CONSUMABLE,
    rarity: ItemRarity.COMMON,
    icon: '🧪',
    stackable: true,
    maxStack: 99,
    value: 20,
    usable: true,
    effects: [{ type: 'heal', value: 50 }]
  },
  'mana_potion': {
    id: 'mana_potion',
    name: '魔力药水',
    description: '恢复 30 点魔法值',
    type: ItemType.CONSUMABLE,
    rarity: ItemRarity.COMMON,
    icon: '🧪',
    stackable: true,
    maxStack: 99,
    value: 15,
    usable: true,
    effects: [{ type: 'restore_mp', value: 30 }]
  },
  // 材料
  'herb': {
    id: 'herb',
    name: '草药',
    description: '常见的药草，可用于制作药水',
    type: ItemType.MATERIAL,
    rarity: ItemRarity.COMMON,
    icon: '🌿',
    stackable: true,
    maxStack: 99,
    value: 5
  },
  'iron_ore': {
    id: 'iron_ore',
    name: '铁矿石',
    description: '可以冶炼成铁锭',
    type: ItemType.MATERIAL,
    rarity: ItemRarity.COMMON,
    icon: '⛏️',
    stackable: true,
    maxStack: 99,
    value: 10
  }
};

/**
 * 创建物品实例
 */
export function createItem(itemId: string, quantity: number = 1): Item | null {
  const template = ITEM_DATABASE[itemId];
  if (!template) return null;
  return { ...template };
}
