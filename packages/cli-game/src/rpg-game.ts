/**
 * CLI RPG 游戏
 * 基于 engine-core 构建的终端角色扮演游戏
 */

import {
  // Core
  setupRawMode,
  safeExit,
  clearScreen,
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
 * 地图实体类型
 */
enum EntityType {
  PLAYER = 'player',
  NPC = 'npc',
  ENEMY = 'enemy',
  CHEST = 'chest',
  DOOR = 'door',
  PORTAL = 'portal'
}

/**
 * 地图实体
 */
interface MapEntity {
  id: string;
  type: EntityType;
  name: string;
  position: Point2D;
  emoji: string; // 使用 emoji
  hp?: number;
  maxHp?: number;
  dialogue?: string[];
  isHostile?: boolean;
  isOpen?: boolean;
  loot?: string[];
}

/**
 * 实体 emoji 定义
 */
const ENTITY_EMOJI = {
  PLAYER: '🧙',      // 玩家（法师/冒险者）
  NPC_VILLAGER: '👴', // 村民/村长
  NPC_MERCHANT: '🧑‍💼', // 商人
  NPC_ELDER: '🧙‍♂️',  // 老者
  SLIME: '🦠',       // 史莱姆
  GOBLIN: '👺',      // 哥布林
  SKELETON: '💀',    // 骷髅
  BAT: '🦇',         // 蝙蝠
  CHEST_CLOSED: '📦', // 关闭的宝箱
  CHEST_OPEN: '📭',   // 开启的宝箱
  DOOR: '🚪',        // 门
  PORTAL: '🌀'       // 传送门
} as const;

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
  // 屏幕尺寸（固定大小，不跟随终端）
  private readonly SCREEN_WIDTH = 120;  // 增宽以容纳双宽 tile + HUD
  private readonly SCREEN_HEIGHT = 30;
  // 地图尺寸（每个 tile 占 2 字符宽度）
  private readonly MAP_WIDTH = 46;      // 46*2 = 92 字符
  private readonly MAP_HEIGHT = 20;
  private readonly HUD_WIDTH = 28;      // 右侧信息面板宽度

  // 游戏组件
  private inputManager: InputManager;
  private map: TileMap;
  private viewport: Viewport;
  private mapRenderer: MapRenderer;
  private player: PlayerData;
  private inventory: Inventory;
  private saveManager: SaveManager;
  private entities: MapEntity[];

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
  private needsRender: boolean;
  private lastRenderTime: number;
  private renderTimer: NodeJS.Timeout | null;

  constructor() {
    this.state = GameState.EXPLORE;
    this.isRunning = false;
    this.messages = [];
    this.inventoryFilterIndex = 0;
    this.entities = [];
    this.needsRender = true;
    this.lastRenderTime = 0;
    this.renderTimer = null;



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

    // 初始化地图（根据屏幕大小调整）
    const mapWorldWidth = Math.max(40, this.MAP_WIDTH + 20);
    const mapWorldHeight = Math.max(30, this.MAP_HEIGHT + 10);
    this.map = generateRoomMap(mapWorldWidth, mapWorldHeight, 10);
    this.ensurePlayerPosition();
    this.initEntities(); // 初始化地图实体

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
   * 初始化地图实体（NPC、怪物、宝箱等）
   */
  private initEntities(): void {
    // 在地图上随机放置各种实体
    let placedCount = 0;

    // 添加 NPC
    const npcs = [
      { name: '村长', emoji: ENTITY_EMOJI.NPC_VILLAGER, dialogue: ['欢迎来到我们的村庄！', '小心北方的怪物。'] },
      { name: '商人', emoji: ENTITY_EMOJI.NPC_MERCHANT, dialogue: ['需要买点什么吗？', '我有最好的货物！'] },
      { name: '老者', emoji: ENTITY_EMOJI.NPC_ELDER, dialogue: ['传说地下城深处有宝藏...'] }
    ];

    for (const npc of npcs) {
      const pos = this.findEmptyPosition();
      if (pos) {
        this.entities.push({
          id: `npc_${placedCount}`,
          type: EntityType.NPC,
          name: npc.name,
          position: pos,
          emoji: npc.emoji,
          dialogue: npc.dialogue
        });
        placedCount++;
      }
    }

    // 添加怪物
    const enemies = [
      { name: '史莱姆', emoji: ENTITY_EMOJI.SLIME, hp: 20, maxHp: 20, isHostile: true },
      { name: '哥布林', emoji: ENTITY_EMOJI.GOBLIN, hp: 30, maxHp: 30, isHostile: true },
      { name: '骷髅', emoji: ENTITY_EMOJI.SKELETON, hp: 25, maxHp: 25, isHostile: true },
      { name: '蝙蝠', emoji: ENTITY_EMOJI.BAT, hp: 15, maxHp: 15, isHostile: true }
    ];

    for (let i = 0; i < 8; i++) {
      const enemy = enemies[Math.floor(Math.random() * enemies.length)];
      const pos = this.findEmptyPosition();
      if (pos) {
        this.entities.push({
          id: `enemy_${i}`,
          type: EntityType.ENEMY,
          name: enemy.name,
          position: pos,
          emoji: enemy.emoji,
          hp: enemy.hp,
          maxHp: enemy.maxHp,
          isHostile: enemy.isHostile
        });
      }
    }

    // 添加宝箱
    for (let i = 0; i < 5; i++) {
      const pos = this.findEmptyPosition();
      if (pos) {
        this.entities.push({
          id: `chest_${i}`,
          type: EntityType.CHEST,
          name: '宝箱',
          position: pos,
          emoji: ENTITY_EMOJI.CHEST_CLOSED,
          isOpen: false,
          loot: ['health_potion', 'herb', 'iron_ore']
        });
      }
    }
  }

  /**
   * 寻找空地位置
   */
  private findEmptyPosition(): Point2D | null {
    let attempts = 0;
    while (attempts < 100) {
      const x = Math.floor(Math.random() * this.map.width);
      const y = Math.floor(Math.random() * this.map.height);
      
      // 检查是否可行走且不与玩家或其他实体重叠
      if (this.map.isWalkable(x, y)) {
        const tooCloseToPlayer = Math.abs(x - this.player.position.x) < 5 && 
                                  Math.abs(y - this.player.position.y) < 5;
        if (!tooCloseToPlayer && !this.isPositionOccupied(x, y)) {
          return { x, y };
        }
      }
      attempts++;
    }
    return null;
  }

  /**
   * 检查位置是否被占用
   */
  private isPositionOccupied(x: number, y: number): boolean {
    return this.entities.some(e => e.position.x === x && e.position.y === y);
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
    // HUD（状态面板）- 动态计算位置和大小
    const statusHeight = Math.floor(this.MAP_HEIGHT * 0.6);
    const bottomPanelHeight = this.MAP_HEIGHT - statusHeight;
    
    this.hud = new HUD(this.SCREEN_WIDTH, this.SCREEN_HEIGHT);
    // HUD x 位置基于字符坐标：地图占 MAP_WIDTH*2 字符
    const hudX = this.MAP_WIDTH * 2 + 1;
    this.hud.createInfoPanel('status', hudX, 0, this.HUD_WIDTH - 2, statusHeight, '状态');
    this.hud.createInfoPanel('stats', hudX, statusHeight, Math.floor((this.HUD_WIDTH - 2) / 2), bottomPanelHeight, '属性');
    this.hud.createInfoPanel('equip', hudX + Math.floor((this.HUD_WIDTH - 2) / 2), statusHeight, Math.floor((this.HUD_WIDTH - 2) / 2), bottomPanelHeight, '装备');

    // 消息日志 - 在地图下方
    this.messageLog = new MessageLog({
      x: 0,
      y: this.MAP_HEIGHT,
      width: this.SCREEN_WIDTH,
      height: this.SCREEN_HEIGHT - this.MAP_HEIGHT - 1,
      title: '消息',
      border: true
    });

    // 背包面板（背包模式使用）- 占左侧大部分空间
    this.inventoryPanel = new InventoryPanel({
      x: 0,
      y: 0,
      width: Math.floor(this.SCREEN_WIDTH * 0.4),
      height: this.MAP_HEIGHT,
      inventory: this.inventory
    });

    this.itemDetailPanel = new ItemDetailPanel({
      x: Math.floor(this.SCREEN_WIDTH * 0.4),
      y: 0,
      width: Math.floor(this.SCREEN_WIDTH * 0.35),
      height: this.MAP_HEIGHT
    });

    this.equipmentPanel = new EquipmentPanel({
      x: Math.floor(this.SCREEN_WIDTH * 0.75),
      y: 0,
      width: Math.floor(this.SCREEN_WIDTH * 0.25) - 1,
      height: this.MAP_HEIGHT,
      equipment: this.inventory.getEquipment()
    });
  }

  /**
   * 启动游戏
   */
  async start(): Promise<void> {
    try {
      await this.saveManager.initialize();
    } catch (error) {
      // 存档初始化失败不阻止游戏进行
      this.addMessage('存档初始化失败，将以无存档模式运行');
    }
    
    setupRawMode((str: string, key: KeyPressEvent) => {
      // 调试输出（临时）
      //console.error('DEBUG:', JSON.stringify({ str, key }));
      
      // 忽略鼠标事件
      if (key && key.name === 'mouse') {
        return;
      }
      
      // 忽略特定的控制序列（鼠标、焦点事件）
      if (str && (
        str.startsWith('\x1b[<') ||  // SGR 鼠标事件
        str.startsWith('\x1b[M') ||  // X11 鼠标事件
        str === '\x1b[I' ||          // 焦点获取
        str === '\x1b[O'             // 焦点丢失
      )) {
        return;
      }
      
      // 处理输入
      this.inputManager.handleKey(key);
    });

    this.isRunning = true;
    this.addMessage('欢迎来到 CLI RPG 世界！');
    this.addMessage('WASD=移动 E=互动 I=背包 F=存档 O=读档 ESC=退出');
    
    // 启动渲染循环
    this.renderLoop();
  }

  /**
   * 渲染循环 - 按需渲染，减少闪烁
   */
  private renderLoop(): void {
    if (!this.isRunning) return;

    const now = Date.now();
    const timeSinceLastRender = now - this.lastRenderTime;
    
    // 限制渲染频率：最多 10fps (100ms)，且只在需要时渲染
    if (this.needsRender && timeSinceLastRender >= 100) {
      this.needsRender = false;
      this.lastRenderTime = now;
      
      // 清屏并渲染
      clearScreen();
      
      try {
        if (this.state === GameState.EXPLORE) {
          this.renderExplore();
        } else if (this.state === GameState.INVENTORY) {
          this.renderInventory();
        }
      } catch (error) {
        console.error('渲染错误:', error);
      }
    }

    // 下一帧检查
    this.renderTimer = setTimeout(() => this.renderLoop(), 50);
  }

  /**
   * 请求重新渲染
   */
  private requestRender(): void {
    this.needsRender = true;
  }

  /**
   * 处理输入
   */
  private handleInput(event: InputEvent): void {
    // ESC 键特殊处理：背包状态关闭背包，探索状态退出游戏
    if (event.rawKey?.name === 'escape') {
      if (this.state === GameState.INVENTORY) {
        this.closeInventory();
      } else {
        this.quit();
      }
      return;
    }

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
        return;
      case GameAction.INTERACT:
        this.interactWithEntity();
        return;
      case GameAction.INVENTORY:
        this.openInventory();
        return;
      case GameAction.SAVE:
        this.quickSave().catch(() => this.addMessage('存档失败'));
        return;
      case GameAction.LOAD:
        this.quickLoad().catch(() => this.addMessage('读档失败'));
        return;
      case GameAction.QUIT:
        this.quit();
        return;
    }
  }

  /**
   * 与附近的实体交互
   */
  private interactWithEntity(): void {
    // 检查玩家周围是否有实体
    const nearbyEntities = this.entities.filter(e => {
      const dx = Math.abs(e.position.x - this.player.position.x);
      const dy = Math.abs(e.position.y - this.player.position.y);
      return dx <= 1 && dy <= 1 && !(dx === 0 && dy === 0);
    });

    if (nearbyEntities.length === 0) {
      this.addMessage('附近没有可以互动的对象。');
      return;
    }

    // 与最近的实体交互
    const entity = nearbyEntities[0];

    switch (entity.type) {
      case EntityType.NPC:
        // 对话
        if (entity.dialogue && entity.dialogue.length > 0) {
          const line = entity.dialogue[Math.floor(Math.random() * entity.dialogue.length)];
          this.addMessage(`${entity.name}: "${line}"`);
        }
        break;

      case EntityType.CHEST:
        // 开启宝箱
        if (!entity.isOpen && entity.loot) {
          entity.isOpen = true;
          entity.emoji = ENTITY_EMOJI.CHEST_OPEN; // 开启后的样子
          this.addMessage(`打开了 ${entity.name}！`);
          
          // 给予战利品
          for (const itemId of entity.loot) {
            const item = createItem(itemId);
            if (item) {
              this.inventory.addItem(item, 1);
              this.addMessage(`获得: ${item.name}`);
            }
          }
        } else if (entity.isOpen) {
          this.addMessage('宝箱已经空了。');
        }
        break;

      case EntityType.ENEMY:
        // 进入战斗（简化版）
        this.addMessage(`与 ${entity.name} 遭遇！`);
        if (entity.hp) {
          const damage = Math.max(1, this.player.attack - (entity.maxHp ? entity.maxHp / 10 : 0));
          entity.hp -= damage;
          this.addMessage(`你攻击了 ${entity.name}，造成 ${damage} 点伤害！`);
          
          if (entity.hp <= 0) {
            this.addMessage(`击败了 ${entity.name}！`);
            this.player.exp += 10;
            this.inventory.addGold(5 + Math.floor(Math.random() * 10));
            // 移除被击败的敌人
            this.entities = this.entities.filter(e => e.id !== entity.id);
          } else {
            // 敌人反击
            const enemyDamage = Math.max(1, 5 - this.player.defense);
            this.player.hp -= enemyDamage;
            this.addMessage(`${entity.name} 攻击了你，造成 ${enemyDamage} 点伤害！`);
            
            if (this.player.hp <= 0) {
              this.addMessage('你被击败了！游戏结束。');
              this.player.hp = 1; // 防止死亡，简化处理
            }
          }
        }
        break;

      default:
        this.addMessage(`与 ${entity.name} 互动了。`);
    }
  }

  /**
   * 处理背包模式输入
   */
  private handleInventoryInput(event: InputEvent): void {
    let needsUpdate = false;
    
    switch (event.action) {
      case GameAction.MOVE:
        if (event.direction === Direction.UP || event.direction === Direction.DOWN) {
          this.inventoryPanel.moveSelection(event.direction);
          this.updateItemDetail();
          needsUpdate = true;
        }
        break;
      case GameAction.INVENTORY:
        this.closeInventory();
        return;
    }

    // 快捷键（通过 rawKey 检查未映射的按键）
    const key = event.rawKey?.sequence?.toLowerCase() || event.rawKey?.name;
    if (key) {
      switch (key) {
        case 'u': // 使用物品
          this.useSelectedItem();
          return;
        case 'e': // 装备/卸下
          this.equipSelectedItem();
          return;
        case 'd': // 丢弃
          this.dropSelectedItem();
          return;
        case '\t': // Tab 切换筛选
        case 'tab':
          this.switchInventoryFilter();
          return;
      }
    }
    
    // 如果有界面更新需要，请求重新渲染
    if (needsUpdate) {
      this.requestRender();
    }
  }

  /**
   * 移动玩家
   */
  private movePlayer(direction: Direction): void {
    const delta = getDirectionDelta(direction);
    const newX = this.player.position.x + delta.x;
    const newY = this.player.position.y + delta.y;

    // 检查地图是否可行走
    if (!this.map.isWalkable(newX, newY)) {
      this.requestRender();
      return;
    }

    // 检查是否有实体阻挡
    const blockingEntity = this.entities.find(e => 
      e.position.x === newX && e.position.y === newY
    );

    if (blockingEntity) {
      // 不能穿过实体，显示提示
      this.addMessage(`前方有 ${blockingEntity.name} 阻挡！`);
      this.requestRender();
      return;
    }

    // 可以移动
    this.player.position.x = newX;
    this.player.position.y = newY;
    this.viewport.follow(newX, newY);
    
    // 随机事件
    if (Math.random() < 0.1) {
      this.triggerRandomEvent();
    }
    
    this.requestRender();
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
    this.requestRender();
  }

  /**
   * 关闭背包
   */
  private closeInventory(): void {
    this.state = GameState.EXPLORE;
    this.requestRender();
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
    this.requestRender();
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
      this.requestRender();
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
      this.requestRender();
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
    this.requestRender();
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
    this.requestRender(); // 添加消息后需要重新渲染
  }

  /**
   * 渲染探索模式
   */
  private renderExplore(): void {
    // 获取地图渲染输出（每个 tile 占 2 个字符宽度）
    const mapLines = this.mapRenderer.render();
    const playerScreenPos = this.viewport.worldToScreen(
      this.player.position.x,
      this.player.position.y
    );
    
    this.updateHUD();
    const hudLines = this.hud.render();

    // 处理地图行：将双宽 tile 转换为可替换的格式
    // 每个 tile 占 2 个字符位置，emoji 也占 2 个显示宽度，可以直接替换
    const mapContent: string[] = [];
    
    for (let i = 0; i < this.MAP_HEIGHT; i++) {
      if (i < mapLines.length) {
        mapContent.push(mapLines[i]);
      } else {
        mapContent.push('  '.repeat(this.MAP_WIDTH));
      }
    }

    // 辅助函数：在指定 tile 位置插入 emoji（替换 2 个字符位置）
    const placeEmojiAt = (screenX: number, screenY: number, emoji: string): void => {
      if (screenY < 0 || screenY >= this.MAP_HEIGHT || screenX < 0 || screenX >= this.MAP_WIDTH) {
        return;
      }
      const charIndex = screenX * 2; // 每个 tile 占 2 个字符
      const line = mapContent[screenY];
      if (charIndex < line.length) {
        // 替换 2 个字符位置的字符串为 emoji
        mapContent[screenY] = line.slice(0, charIndex) + emoji + line.slice(charIndex + 2);
      }
    };

    // 渲染玩家
    if (playerScreenPos) {
      placeEmojiAt(playerScreenPos.x, playerScreenPos.y, ENTITY_EMOJI.PLAYER);
    }

    // 渲染其他实体
    for (const entity of this.entities) {
      const screenPos = this.viewport.worldToScreen(entity.position.x, entity.position.y);
      if (screenPos) {
        placeEmojiAt(screenPos.x, screenPos.y, entity.emoji);
      }
    }

    // 构建输出行
    const output: string[] = [];

    // 地图 + HUD 行
    for (let i = 0; i < this.MAP_HEIGHT; i++) {
      let line = mapContent[i];
      // 确保地图部分长度正确（每个 tile 2 字符）
      line = line.slice(0, this.MAP_WIDTH * 2).padEnd(this.MAP_WIDTH * 2, ' ');
      
      // 添加 HUD 部分（HUD 从字符位置 MAP_WIDTH*2 开始）
      if (i < hudLines.length) {
        const hudPart = hudLines[i].slice(this.MAP_WIDTH * 2);
        line += hudPart;
      }
      // 截断到屏幕宽度
      output.push(line.slice(0, this.SCREEN_WIDTH).padEnd(this.SCREEN_WIDTH, ' '));
    }

    // 底部提示行
    const bottomLine = '[WASD]移动 [I]背包 [E]互动 [F]存档 [O]读档 [ESC]退出'.slice(0, this.SCREEN_WIDTH);
    
    // 填充剩余行
    while (output.length < this.SCREEN_HEIGHT - 1) {
      output.push(' '.repeat(this.SCREEN_WIDTH));
    }
    
    output.push(bottomLine.padEnd(this.SCREEN_WIDTH, ' '));

    // 输出所有行
    output.forEach(line => console.log(line));
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
    const invLines = this.inventoryPanel.render();
    const detailLines = this.itemDetailPanel.render();
    const equipLines = this.equipmentPanel.render();

    const output: string[] = [];
    const panelHeight = this.MAP_HEIGHT;

    // 背包 UI 行
    for (let i = 0; i < panelHeight; i++) {
      const parts: string[] = [];
      
      // 背包列表
      if (i < invLines.length) {
        parts.push(invLines[i]);
      }
      
      // 物品详情
      if (i < detailLines.length) {
        parts.push(detailLines[i]);
      }
      
      // 装备面板
      if (i < equipLines.length) {
        parts.push(equipLines[i]);
      }
      
      output.push(parts.join('').slice(0, this.SCREEN_WIDTH).padEnd(this.SCREEN_WIDTH, ' '));
    }

    // 底部提示
    const bottomLine = '[↑↓]选择 [Tab]筛选 [U]使用 [E]装备 [D]丢弃 [I/ESC]关闭'.slice(0, this.SCREEN_WIDTH);
    output.push(bottomLine.padEnd(this.SCREEN_WIDTH, ' '));

    output.forEach(line => console.log(line));
  }

  /**
   * 退出游戏
   */
  private quit(): void {
    this.isRunning = false;
    safeExit('\n感谢游玩 CLI RPG！');
  }
}
