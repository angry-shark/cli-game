/**
 * CLI RPG 游戏
 * 基于 engine-core 构建的终端角色扮演游戏
 */

import {
  // Core
  setupRawMode,
  safeExit,
  KeyPressEvent,
  // Viewport & Map
  Viewport,
  TileMap,
  MapRenderer,
  Tile,
  Point2D,
  TILES,
  generateRoomMap,
  // Panel & UI
  Panel,
  HUD,
  MessageLog,
  renderHealthBar,
  renderExpBar,
  // Input
  InputManager,
  InputEvent,
  GameAction,
  Direction,
  getDirectionDelta,
  // Inventory
  Inventory,
  InventoryPanel,
  ItemDetailPanel,
  EquipmentPanel,
  createItem,
  ItemType,
  ITEM_TYPE_ICONS,
  RARITY_COLORS,
  // Save
  SaveManager
} from '@cli-game/engine-core';

/**
 * 游戏状态
 */
enum GameState {
  EXPLORE = 'explore',     // 探索模式
  INVENTORY = 'inventory', // 背包模式
  MENU = 'menu'           // 菜单模式
}

/**
 * 玩家数据
 */
interface PlayerData {
  name: string;
  level: number;
  hp: number;
  maxHp: number;
  mp: number;
  maxMp: number;
  exp: number;
  maxExp: number;
  attack: number;
  defense: number;
  gold: number;
  position: Point2D;
}

/**
 * RPG 游戏主类
 */
export class RPGGame {
  // 屏幕尺寸
  private readonly SCREEN_WIDTH = 80;
  private readonly SCREEN_HEIGHT = 24;
  private readonly MAP_WIDTH = 40;
  private readonly MAP_HEIGHT = 16;

  // 游戏组件
  private inputManager: InputManager;
  private map: TileMap;
  private viewport: Viewport;
  private mapRenderer: MapRenderer;
  private player: PlayerData;
  private inventory: Inventory;
  private saveManager: SaveManager;

  // UI 组件
  private hud!: HUD;
  private messageLog!: MessageLog;
  private inventoryPanel!: InventoryPanel;
  private itemDetailPanel!: ItemDetailPanel;
  private equipmentPanel!: EquipmentPanel;

  // 游戏状态
  private state: GameState;
  private isRunning: boolean;
  private messages: string[];
  private inventoryFilterIndex: number;

  constructor() {
    this.state = GameState.EXPLORE;
    this.isRunning = false;
    this.messages = [];
    this.inventoryFilterIndex = 0;

    // 初始化玩家
    this.player = {
      name: '勇者',
      level: 1,
      hp: 100,
      maxHp: 100,
      mp: 50,
      maxMp: 50,
      exp: 0,
      maxExp: 100,
      attack: 10,
      defense: 5,
      gold: 100,
      position: { x: 5, y: 5 }
    };

    // 初始化地图
    this.map = generateRoomMap(60, 40, 8);
    this.ensurePlayerPosition();

    // 初始化视口
    this.viewport = new Viewport({
      width: this.MAP_WIDTH,
      height: this.MAP_HEIGHT,
      mapWidth: this.map.width,
      mapHeight: this.map.height
    });
    this.viewport.follow(this.player.position.x, this.player.position.y);

    this.mapRenderer = new MapRenderer(this.viewport, this.map);

    // 初始化输入
    this.inputManager = new InputManager({
      onInput: this.handleInput.bind(this)
    });

    // 初始化背包
    this.inventory = new Inventory({ capacity: 30 });
    this.initInventory();

    // 初始化存档
    this.saveManager = new SaveManager({
      saveDir: './saves/rpg',
      version: '1.0.0'
    });

    // 初始化 UI
    this.initUI();
  }

  /**
   * 确保玩家起始位置是空地
   */
  private ensurePlayerPosition(): void {
    // 找到第一个可行走的位置
    for (let y = 0; y < this.map.height; y++) {
      for (let x = 0; x < this.map.width; x++) {
        if (this.map.isWalkable(x, y)) {
          this.player.position = { x, y };
          return;
        }
      }
    }
  }

  /**
   * 初始化背包物品
   */
  private initInventory(): void {
    this.inventory.addItem(createItem('wooden_sword')!, 1);
    this.inventory.addItem(createItem('leather_armor')!, 1);
    this.inventory.addItem(createItem('health_potion')!, 5);
    this.inventory.addItem(createItem('herb')!, 10);
    this.inventory.addItem(createItem('iron_ore')!, 3);
  }

  /**
   * 初始化 UI
   */
  private initUI(): void {
    // HUD（状态面板）
    this.hud = new HUD(this.SCREEN_WIDTH, this.SCREEN_HEIGHT);
    this.hud.createInfoPanel('status', 42, 0, 38, 10, '状态');
    this.hud.createInfoPanel('stats', 42, 10, 20, 6, '属性');
    this.hud.createInfoPanel('equip', 62, 10, 18, 6, '装备');

    // 消息日志
    this.messageLog = new MessageLog({
      x: 0,
      y: 16,
      width: 80,
      height: 8,
      title: '消息',
      border: true
    });

    // 背包面板（背包模式使用）
    this.inventoryPanel = new InventoryPanel({
      x: 0,
      y: 0,
      width: 35,
      height: 16,
      inventory: this.inventory
    });

    this.itemDetailPanel = new ItemDetailPanel({
      x: 35,
      y: 0,
      width: 25,
      height: 16
    });

    this.equipmentPanel = new EquipmentPanel({
      x: 60,
      y: 0,
      width: 20,
      height: 16,
      equipment: this.inventory.getEquipment()
    });
  }

  /**
   * 启动游戏
   */
  async start(): Promise<void> {
    await this.saveManager.initialize();
    
    setupRawMode((str: string, key: KeyPressEvent) => {
      this.inputManager.handleKey(key);
    });

    this.isRunning = true;
    this.addMessage('欢迎来到 CLI RPG 世界！');
    this.addMessage('使用 WASD 移动，I 打开背包，ESC 返回');
    
    this.render();
  }

  /**
   * 处理输入
   */
  private handleInput(event: InputEvent): void {
    switch (this.state) {
      case GameState.EXPLORE:
        this.handleExploreInput(event);
        break;
      case GameState.INVENTORY:
        this.handleInventoryInput(event);
        break;
    }
  }

  /**
   * 处理探索模式输入
   */
  private handleExploreInput(event: InputEvent): void {
    switch (event.action) {
      case GameAction.MOVE:
        if (event.direction) {
          this.movePlayer(event.direction);
        }
        // 移动时跳过快捷键检查，避免与移动键冲突
        return;
      case GameAction.QUIT:
        this.quit();
        return;
    }

    // 快捷键（仅在非移动时处理）
    if (event.rawKey?.sequence) {
      switch (event.rawKey.sequence.toLowerCase()) {
        case 'i':
          this.openInventory();
          break;
        case 's':
          this.quickSave();
          break;
        case 'l':
          this.quickLoad();
          break;
      }
    }

    if (event.rawKey?.name === 'escape') {
      this.quit();
    }
  }

  /**
   * 处理背包模式输入
   */
  private handleInventoryInput(event: InputEvent): void {
    switch (event.action) {
      case GameAction.MOVE:
        if (event.direction === Direction.UP || event.direction === Direction.DOWN) {
          this.inventoryPanel.moveSelection(event.direction);
          this.updateItemDetail();
        }
        break;
      case GameAction.QUIT:
        this.closeInventory();
        break;
    }

    // 快捷键
    if (event.rawKey?.sequence) {
      const key = event.rawKey.sequence.toLowerCase();
      
      // 使用物品
      if (key === 'u') {
        this.useSelectedItem();
      }
      // 装备/卸下
      else if (key === 'e') {
        this.equipSelectedItem();
      }
      // 丢弃
      else if (key === 'd') {
        this.dropSelectedItem();
      }
      // Tab 切换筛选
      else if (key === '\t') {
        this.switchInventoryFilter();
      }
    }

    if (event.rawKey?.name === 'escape' || event.rawKey?.name === 'i') {
      this.closeInventory();
    }
  }

  /**
   * 移动玩家
   */
  private movePlayer(direction: Direction): void {
    const delta = getDirectionDelta(direction);
    const newX = this.player.position.x + delta.x;
    const newY = this.player.position.y + delta.y;

    if (this.map.isWalkable(newX, newY)) {
      this.player.position.x = newX;
      this.player.position.y = newY;
      this.viewport.follow(newX, newY);
      
      // 随机事件
      if (Math.random() < 0.1) {
        this.triggerRandomEvent();
      }
    }
  }

  /**
   * 随机事件
   */
  private triggerRandomEvent(): void {
    const events = [
      '你发现了一些金币！',
      '前方似乎有怪物出没...',
      '这里很安全。',
      '你听到了奇怪的声音。',
      '你发现了一个宝箱！'
    ];
    const event = events[Math.floor(Math.random() * events.length)];
    this.addMessage(event);

    // 发现金币
    if (event.includes('金币')) {
      const gold = Math.floor(Math.random() * 20) + 5;
      this.inventory.addGold(gold);
      this.addMessage(`获得 ${gold} G！`);
    }
  }

  /**
   * 打开背包
   */
  private openInventory(): void {
    this.state = GameState.INVENTORY;
    this.inventoryPanel.refresh();
    this.updateItemDetail();
    this.equipmentPanel.refresh();
  }

  /**
   * 关闭背包
   */
  private closeInventory(): void {
    this.state = GameState.EXPLORE;
  }

  /**
   * 更新物品详情
   */
  private updateItemDetail(): void {
    const selected = this.inventoryPanel.getSelectedItem();
    this.itemDetailPanel.setItem(selected);
  }

  /**
   * 切换背包筛选
   */
  private switchInventoryFilter(): void {
    const filters: (ItemType | null)[] = [
      null,
      ItemType.WEAPON,
      ItemType.ARMOR,
      ItemType.CONSUMABLE,
      ItemType.MATERIAL
    ];
    this.inventoryFilterIndex = (this.inventoryFilterIndex + 1) % filters.length;
    this.inventoryPanel.setFilter(filters[this.inventoryFilterIndex]);
  }

  /**
   * 使用选中物品
   */
  private useSelectedItem(): void {
    const index = this.inventoryPanel.getSelectedIndex();
    const item = this.inventory.useItem(index);
    
    if (item) {
      if (item.effects) {
        for (const effect of item.effects) {
          if (effect.type === 'heal') {
            this.player.hp = Math.min(this.player.maxHp, this.player.hp + effect.value);
            this.addMessage(`使用了 ${item.name}，恢复 ${effect.value} HP`);
          } else if (effect.type === 'restore_mp') {
            this.player.mp = Math.min(this.player.maxMp, this.player.mp + effect.value);
            this.addMessage(`使用了 ${item.name}，恢复 ${effect.value} MP`);
          }
        }
      }
      this.inventoryPanel.refresh();
      this.updateItemDetail();
    }
  }

  /**
   * 装备/卸下选中物品
   */
  private equipSelectedItem(): void {
    const index = this.inventoryPanel.getSelectedIndex();
    const slot = this.inventory.getItems()[index];
    
    if (!slot) return;

    if (slot.item.equippable) {
      this.inventory.equipItem(index);
      this.addMessage(`装备了 ${slot.item.name}`);
      this.inventoryPanel.refresh();
      this.equipmentPanel.refresh();
      this.updateItemDetail();
    }
  }

  /**
   * 丢弃选中物品
   */
  private dropSelectedItem(): void {
    const index = this.inventoryPanel.getSelectedIndex();
    this.inventory.removeItem(index, 1);
    this.addMessage('丢弃了物品');
    this.inventoryPanel.refresh();
    this.updateItemDetail();
  }

  /**
   * 快速存档
   */
  private async quickSave(): Promise<void> {
    const saveData = {
      player: this.player,
      inventory: this.inventory.serialize()
    };
    await this.saveManager.save(1, '手动存档', saveData);
    this.addMessage('游戏已保存！');
  }

  /**
   * 快速读档
   */
  private async quickLoad(): Promise<void> {
    try {
      const saveData = await this.saveManager.load(1);
      const gameData = saveData.gameData as { player: PlayerData; inventory: object };
      this.player = gameData.player;
      // 需要重新反序列化 inventory
      this.addMessage('存档已加载！');
    } catch {
      this.addMessage('没有找到存档');
    }
  }

  /**
   * 添加消息
   */
  private addMessage(text: string): void {
    this.messages.push(text);
    this.messageLog.addMessage(text);
  }

  /**
   * 渲染游戏画面
   */
  private render(): void {
    if (!this.isRunning) return;

    // 清屏
    console.clear();

    if (this.state === GameState.EXPLORE) {
      this.renderExplore();
    } else if (this.state === GameState.INVENTORY) {
      this.renderInventory();
    }

    // 继续渲染循环
    setTimeout(() => this.render(), 50);
  }

  /**
   * 渲染探索模式
   */
  private renderExplore(): void {
    // 渲染地图
    const mapLines = this.mapRenderer.renderWithEntities();
    
    // 在玩家位置渲染玩家符号
    const playerScreenPos = this.viewport.worldToScreen(
      this.player.position.x,
      this.player.position.y
    );

    // 输出地图
    for (let y = 0; y < mapLines.length; y++) {
      let line = mapLines[y];
      if (playerScreenPos && playerScreenPos.y === y) {
        // 替换玩家位置字符
        const before = line.slice(0, playerScreenPos.x);
        const after = line.slice(playerScreenPos.x + 1);
        line = before + '@' + after;
      }
      console.log(line);
    }

    // 更新并渲染 HUD
    this.updateHUD();
    const hudLines = this.hud.render();
    
    // 覆盖输出 HUD（使用 ANSI 转义码移动光标）
    for (let i = 0; i < 16 && i < hudLines.length; i++) {
      process.stdout.write(`\x1B[${i + 1};42H${hudLines[i].slice(42)}`);
    }

    // 渲染消息日志
    const msgLines = this.messageLog.render();
    for (let i = 0; i < msgLines.length; i++) {
      process.stdout.write(`\x1B[${17 + i};1H${msgLines[i]}`);
    }

    // 底部提示
    process.stdout.write(`\x1B[24;1H[WASD]移动 [I]背包 [S]存档 [L]读档 [ESC]退出`);
  }

  /**
   * 更新 HUD 数据
   */
  private updateHUD(): void {
    // 更新状态面板
    const equipStats = this.inventory.getEquipmentStats();
    this.hud.updateStatusPanel('status', {
      name: this.player.name,
      level: this.player.level,
      hp: this.player.hp,
      maxHp: this.player.maxHp,
      mp: this.player.mp,
      maxMp: this.player.maxMp,
      exp: this.player.exp,
      maxExp: this.player.maxExp,
      gold: this.inventory.getGold()
    });

    // 更新属性面板
    this.hud.updateStatsPanel('stats', {
      攻击: this.player.attack + (equipStats.attack || 0),
      防御: this.player.defense + (equipStats.defense || 0),
      速度: equipStats.speed || 0,
      暴击: equipStats.critical || 0
    });
  }

  /**
   * 渲染背包模式
   */
  private renderInventory(): void {
    // 渲染背包面板
    const invLines = this.inventoryPanel.render();
    for (let i = 0; i < invLines.length; i++) {
      process.stdout.write(`\x1B[${i + 1};1H${invLines[i]}`);
    }

    // 渲染物品详情
    const detailLines = this.itemDetailPanel.render();
    for (let i = 0; i < detailLines.length; i++) {
      process.stdout.write(`\x1B[${i + 1};36H${detailLines[i]}`);
    }

    // 渲染装备面板
    const equipLines = this.equipmentPanel.render();
    for (let i = 0; i < equipLines.length; i++) {
      process.stdout.write(`\x1B[${i + 1};61H${equipLines[i]}`);
    }

    // 消息日志
    const msgLines = this.messageLog.render();
    for (let i = 0; i < msgLines.length; i++) {
      process.stdout.write(`\x1B[${17 + i};1H${msgLines[i]}`);
    }

    // 底部提示
    process.stdout.write(`\x1B[24;1H[↑↓]选择 [Tab]筛选 [U]使用 [E]装备 [D]丢弃 [I/ESC]关闭`);
  }

  /**
   * 退出游戏
   */
  private quit(): void {
    this.isRunning = false;
    safeExit('\n感谢游玩 CLI RPG！');
  }
}
