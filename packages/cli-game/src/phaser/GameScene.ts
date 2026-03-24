import Phaser from 'phaser';
import { GameECS } from '../game-ecs.js';
import { GameState, CombatState } from '../types.js';
import { MapType } from '../game.js';

/**
 * Phaser 游戏主场景
 * 负责渲染游戏地图、实体和处理输入
 */
export class GameScene extends Phaser.Scene {
  private gameLogic!: GameECS;
  private tileSize: number = 20;
  private mapContainer!: Phaser.GameObjects.Container;
  private entityContainer!: Phaser.GameObjects.Container;
  private uiContainer!: Phaser.GameObjects.Container;
  private cursors!: Phaser.Types.Input.Keyboard.CursorKeys;
  private wasdKeys!: {
    W: Phaser.Input.Keyboard.Key;
    A: Phaser.Input.Keyboard.Key;
    S: Phaser.Input.Keyboard.Key;
    D: Phaser.Input.Keyboard.Key;
  };
  private keyE!: Phaser.Input.Keyboard.Key;
  private keyI!: Phaser.Input.Keyboard.Key;
  private keyG!: Phaser.Input.Keyboard.Key;
  private keyESC!: Phaser.Input.Keyboard.Key;
  private keyQ!: Phaser.Input.Keyboard.Key;
  
  // 渲染缓存
  private tileSprites: Map<string, Phaser.GameObjects.Text> = new Map();
  private entitySprites: Map<string, Phaser.GameObjects.Text> = new Map();
  
  // 防止重复渲染
  private isRendering = false;
  private needsRender = false;
  private lastState?: GameState;

  constructor() {
    super({ key: 'GameScene' });
  }

  preload(): void {
    // 无需预加载资源，使用程序化渲染
  }

  create(): void {
    // 创建容器（先创建容器，再初始化游戏逻辑）
    this.mapContainer = this.add.container(0, 0);
    this.entityContainer = this.add.container(0, 0);
    this.uiContainer = this.add.container(0, 0);

    // 初始化游戏逻辑（传入更新回调）
    this.gameLogic = new GameECS(() => {
      this.onGameUpdate();
    });

    // 设置键盘输入
    this.cursors = this.input.keyboard!.createCursorKeys();
    this.wasdKeys = {
      W: this.input.keyboard!.addKey(Phaser.Input.Keyboard.KeyCodes.W),
      A: this.input.keyboard!.addKey(Phaser.Input.Keyboard.KeyCodes.A),
      S: this.input.keyboard!.addKey(Phaser.Input.Keyboard.KeyCodes.S),
      D: this.input.keyboard!.addKey(Phaser.Input.Keyboard.KeyCodes.D),
    };
    this.keyE = this.input.keyboard!.addKey(Phaser.Input.Keyboard.KeyCodes.E);
    this.keyI = this.input.keyboard!.addKey(Phaser.Input.Keyboard.KeyCodes.I);
    this.keyG = this.input.keyboard!.addKey(Phaser.Input.Keyboard.KeyCodes.G);
    this.keyESC = this.input.keyboard!.addKey(Phaser.Input.Keyboard.KeyCodes.ESC);
    this.keyQ = this.input.keyboard!.addKey(Phaser.Input.Keyboard.KeyCodes.Q);

    // 监听游戏事件
    this.events.on('update', this.handleInput, this);
    
    // 延迟初始渲染，确保 Phaser 完全准备好
    this.time.delayedCall(100, () => {
      this.renderGame();
    });
  }

  update(): void {
    // 每帧更新逻辑（如果需要）
  }

  private handleInput(): void {
    // 方向键或 WASD 移动
    if (Phaser.Input.Keyboard.JustDown(this.cursors.up!) || Phaser.Input.Keyboard.JustDown(this.wasdKeys.W)) {
      this.gameLogic.handleInput('arrowup');
    } else if (Phaser.Input.Keyboard.JustDown(this.cursors.down!) || Phaser.Input.Keyboard.JustDown(this.wasdKeys.S)) {
      this.gameLogic.handleInput('arrowdown');
    } else if (Phaser.Input.Keyboard.JustDown(this.cursors.left!) || Phaser.Input.Keyboard.JustDown(this.wasdKeys.A)) {
      this.gameLogic.handleInput('arrowleft');
    } else if (Phaser.Input.Keyboard.JustDown(this.cursors.right!) || Phaser.Input.Keyboard.JustDown(this.wasdKeys.D)) {
      this.gameLogic.handleInput('arrowright');
    }

    // 功能键
    if (Phaser.Input.Keyboard.JustDown(this.keyE)) {
      this.gameLogic.handleInput('e');
    }
    if (Phaser.Input.Keyboard.JustDown(this.keyI)) {
      this.gameLogic.handleInput('i');
    }
    if (Phaser.Input.Keyboard.JustDown(this.keyG)) {
      this.gameLogic.handleInput('g');
    }
    if (Phaser.Input.Keyboard.JustDown(this.keyESC) || Phaser.Input.Keyboard.JustDown(this.keyQ)) {
      this.gameLogic.handleInput('escape');
    }
  }

  private onGameUpdate(): void {
    // 使用标志位防止重复渲染请求
    if (this.isRendering) {
      this.needsRender = true;
      return;
    }
    
    // 延迟一帧执行渲染，合并多个更新请求
    this.time.delayedCall(0, () => {
      this.renderGame();
    });
  }

  private renderGame(): void {
    if (this.isRendering) return;
    this.isRendering = true;
    this.needsRender = false;

    try {
      // 根据游戏状态渲染不同内容
      const state = this.gameLogic.getState();
      
      // 如果状态没变且不是动态状态，可以跳过渲染（优化）
      if (state === this.lastState && 
          state !== GameState.COMBAT && 
          state !== GameState.LOADING) {
        // 只更新实体位置，不清空重绘
        this.updateEntities();
        this.isRendering = false;
        return;
      }
      
      this.lastState = state as GameState;
      
      // 清空容器
      this.entityContainer.removeAll(true);
      this.uiContainer.removeAll(true);
      
      switch (state) {
        case GameState.LOADING:
          this.renderLoading();
          break;
        case GameState.INVENTORY:
          this.mapContainer.setVisible(false);
          this.entityContainer.setVisible(false);
          this.renderInventory();
          break;
        case GameState.COMBAT:
          this.mapContainer.setVisible(false);
          this.entityContainer.setVisible(false);
          this.renderCombat();
          break;
        case GameState.LEVEL_UP:
          this.mapContainer.setVisible(false);
          this.entityContainer.setVisible(false);
          this.renderLevelUp();
          break;
        case GameState.GAME_OVER:
          this.mapContainer.setVisible(false);
          this.entityContainer.setVisible(false);
          this.renderGameOver();
          break;
        default:
          this.mapContainer.setVisible(true);
          this.entityContainer.setVisible(true);
          this.renderExploration();
      }
    } finally {
      this.isRendering = false;
      
      // 如果在渲染过程中有新的渲染请求，执行它
      if (this.needsRender) {
        this.time.delayedCall(10, () => this.renderGame());
      }
    }
  }
  
  /** 仅更新实体位置（优化） */
  private updateEntities(): void {
    // TODO: 实现增量更新，只更新变化的部分
  }

  private renderExploration(): void {
    const mapType = this.gameLogic.getMapType();
    const player = this.gameLogic.getPlayer();
    
    // 清空地图容器
    this.mapContainer.removeAll(true);

    if (mapType === MapType.TOWN) {
      this.renderTownMap();
    } else if (mapType === MapType.WILDERNESS) {
      this.renderWildernessMap();
    } else {
      this.renderDungeonMap();
    }

    // 渲染玩家（在中心）
    const centerX = this.cameras.main.width / 2;
    const centerY = this.cameras.main.height / 2;
    
    const playerSprite = this.add.text(centerX, centerY, '🧙', {
      fontSize: `${this.tileSize}px`,
      color: '#FFD700',
    });
    playerSprite.setOrigin(0.5);
    this.entityContainer.add(playerSprite);
  }

  private renderTownMap(): void {
    const townManager = this.gameLogic.getTownManager();
    const player = this.gameLogic.getPlayer();
    const viewportWidth = 25;
    const viewportHeight = 17;
    
    const viewportTiles = townManager.getViewport(player.position.x, player.position.y, viewportWidth, viewportHeight);
    const entities = (townManager as any).getAllEntities();

    const centerX = this.cameras.main.width / 2;
    const centerY = this.cameras.main.height / 2;
    const startX = centerX - (viewportWidth * this.tileSize) / 2;
    const startY = centerY - (viewportHeight * this.tileSize) / 2;

    // 渲染地图瓦片
    for (let row = 0; row < viewportTiles.length; row++) {
      for (let col = 0; col < viewportTiles[row].length; col++) {
        const tile = viewportTiles[row][col];
        const x = startX + col * this.tileSize;
        const y = startY + row * this.tileSize;
        
        const tileSprite = this.add.text(x, y, tile.char, {
          fontSize: `${this.tileSize}px`,
          color: tile.color || '#888888',
        });
        tileSprite.setOrigin(0.5);
        this.mapContainer.add(tileSprite);
      }
    }

    // 渲染实体（相对于玩家位置）
    const halfW = Math.floor(viewportWidth / 2);
    const halfH = Math.floor(viewportHeight / 2);
    
    entities.forEach((entity: any) => {
      const relX = entity.position.x - player.position.x;
      const relY = entity.position.y - player.position.y;
      
      if (Math.abs(relX) <= halfW && Math.abs(relY) <= halfH) {
        const x = centerX + relX * this.tileSize;
        const y = centerY + relY * this.tileSize;
        
        const entitySprite = this.add.text(x, y, entity.char, {
          fontSize: `${this.tileSize}px`,
          color: entity.color || '#FFFFFF',
        });
        entitySprite.setOrigin(0.5);
        this.entityContainer.add(entitySprite);
      }
    });
  }

  private renderWildernessMap(): void {
    // 类似城镇地图的渲染逻辑
    const wilderness = this.gameLogic.getWildernessMap();
    const player = this.gameLogic.getPlayer();
    
    if (!wilderness) return;

    const viewportWidth = 25;
    const viewportHeight = 17;
    
    const centerX = this.cameras.main.width / 2;
    const centerY = this.cameras.main.height / 2;
    const startX = centerX - (viewportWidth * this.tileSize) / 2;
    const startY = centerY - (viewportHeight * this.tileSize) / 2;

    // 计算视口范围
    const vpStartX = Math.max(0, Math.min(player.position.x - Math.floor(viewportWidth / 2), wilderness.width - viewportWidth));
    const vpStartY = Math.max(0, Math.min(player.position.y - Math.floor(viewportHeight / 2), wilderness.height - viewportHeight));

    // 渲染地图
    for (let y = vpStartY; y < vpStartY + viewportHeight && y < wilderness.height; y++) {
      for (let x = vpStartX; x < vpStartX + viewportWidth && x < wilderness.width; x++) {
        const tile = wilderness.tiles[x][y];
        const screenX = startX + (x - vpStartX) * this.tileSize;
        const screenY = startY + (y - vpStartY) * this.tileSize;
        
        const tileSprite = this.add.text(screenX, screenY, tile.char, {
          fontSize: `${this.tileSize}px`,
          color: tile.color || '#888888',
        });
        tileSprite.setOrigin(0.5);
        this.mapContainer.add(tileSprite);
      }
    }

    // 渲染实体和传送门
    const entities = (this.gameLogic as any).getAllEntities();
    entities.forEach((entity: any) => {
      if (entity.position.x >= vpStartX && entity.position.x < vpStartX + viewportWidth &&
          entity.position.y >= vpStartY && entity.position.y < vpStartY + viewportHeight) {
        const screenX = startX + (entity.position.x - vpStartX) * this.tileSize;
        const screenY = startY + (entity.position.y - vpStartY) * this.tileSize;
        
        const entitySprite = this.add.text(screenX, screenY, entity.char, {
          fontSize: `${this.tileSize}px`,
          color: entity.color || '#FFFFFF',
        });
        entitySprite.setOrigin(0.5);
        this.entityContainer.add(entitySprite);
      }
    });

    // 渲染传送门
    wilderness.portals.forEach((portal: any) => {
      if (portal.x >= vpStartX && portal.x < vpStartX + viewportWidth &&
          portal.y >= vpStartY && portal.y < vpStartY + viewportHeight) {
        const screenX = startX + (portal.x - vpStartX) * this.tileSize;
        const screenY = startY + (portal.y - vpStartY) * this.tileSize;
        
        const portalSprite = this.add.text(screenX, screenY, '🔮', {
          fontSize: `${this.tileSize}px`,
        });
        portalSprite.setOrigin(0.5);
        this.entityContainer.add(portalSprite);
      }
    });
  }

  private renderDungeonMap(): void {
    const map = this.gameLogic.getDungeonMap();
    const player = this.gameLogic.getPlayer();
    const dungeonEntities = (this.gameLogic as any).dungeonEntities || [];
    
    const viewportWidth = 25;
    const viewportHeight = 17;
    
    const centerX = this.cameras.main.width / 2;
    const centerY = this.cameras.main.height / 2;
    const startX = centerX - (viewportWidth * this.tileSize) / 2;
    const startY = centerY - (viewportHeight * this.tileSize) / 2;

    // 计算视口范围
    const vpStartX = Math.max(0, Math.min(player.position.x - Math.floor(viewportWidth / 2), map.width - viewportWidth));
    const vpStartY = Math.max(0, Math.min(player.position.y - Math.floor(viewportHeight / 2), map.height - viewportHeight));

    // 渲染地图
    for (let y = vpStartY; y < vpStartY + viewportHeight && y < map.height; y++) {
      for (let x = vpStartX; x < vpStartX + viewportWidth && x < map.width; x++) {
        const isVisible = map.visible[x]?.[y];
        const isExplored = map.explored[x]?.[y];
        
        let char = '██';
        let color = '#333333';
        
        if (isExplored) {
          const tile = map.tiles[x][y];
          if (!isVisible) {
            char = tile.walkable ? '  ' : '░░';
            color = '#666666';
          } else {
            char = tile.char;
            color = tile.color || '#888888';
          }
        }
        
        const screenX = startX + (x - vpStartX) * this.tileSize;
        const screenY = startY + (y - vpStartY) * this.tileSize;
        
        const tileSprite = this.add.text(screenX, screenY, char, {
          fontSize: `${this.tileSize}px`,
          color: color,
        });
        tileSprite.setOrigin(0.5);
        this.mapContainer.add(tileSprite);
      }
    }

    // 渲染实体（只在视野内显示）
    dungeonEntities.forEach((entity: any) => {
      if (entity.position.x >= vpStartX && entity.position.x < vpStartX + viewportWidth &&
          entity.position.y >= vpStartY && entity.position.y < vpStartY + viewportHeight &&
          map.visible[entity.position.x]?.[entity.position.y]) {
        const screenX = startX + (entity.position.x - vpStartX) * this.tileSize;
        const screenY = startY + (entity.position.y - vpStartY) * this.tileSize;
        
        const entitySprite = this.add.text(screenX, screenY, entity.char, {
          fontSize: `${this.tileSize}px`,
          color: entity.color || '#FFFFFF',
        });
        entitySprite.setOrigin(0.5);
        this.entityContainer.add(entitySprite);
      }
    });
  }

  private renderLoading(): void {
    const centerX = this.cameras.main.width / 2;
    const centerY = this.cameras.main.height / 2;
    
    const progress = this.gameLogic.getLoadingProgress();
    const message = this.gameLogic.getLoadingMessage();
    
    const loadingText = this.add.text(centerX, centerY - 50, `正在前往 ${this.gameLogic.getLoadingTarget()}`, {
      fontSize: '24px',
      color: '#00FFFF',
    });
    loadingText.setOrigin(0.5);
    
    const progressBar = '█'.repeat(Math.floor(progress / 2)) + '░'.repeat(50 - Math.floor(progress / 2));
    const barText = this.add.text(centerX, centerY, progressBar, {
      fontSize: '16px',
      color: '#FFFF00',
    });
    barText.setOrigin(0.5);
    
    const percentText = this.add.text(centerX, centerY + 30, `${progress}%`, {
      fontSize: '18px',
      color: '#FFFF00',
    });
    percentText.setOrigin(0.5);
    
    const messageText = this.add.text(centerX, centerY + 60, message, {
      fontSize: '14px',
      color: '#888888',
    });
    messageText.setOrigin(0.5);
    
    this.uiContainer.add([loadingText, barText, percentText, messageText]);
  }

  private renderInventory(): void {
    const centerX = this.cameras.main.width / 2;
    const centerY = this.cameras.main.height / 2;
    
    // 背景
    const bg = this.add.rectangle(centerX, centerY, 600, 400, 0x000000, 0.9);
    bg.setStrokeStyle(2, 0xFFFFFF);
    this.uiContainer.add(bg);
    
    const title = this.add.text(centerX, centerY - 180, '📦 背包', {
      fontSize: '24px',
      color: '#FFFFFF',
    });
    title.setOrigin(0.5);
    this.uiContainer.add(title);
    
    // 提示文字
    const hint = this.add.text(centerX, centerY + 180, '[↑↓]选择 [Tab]筛选 [U]使用 [E]装备 [D]丢弃 [I/ESC]关闭', {
      fontSize: '12px',
      color: '#888888',
    });
    hint.setOrigin(0.5);
    this.uiContainer.add(hint);
  }

  private renderCombat(): void {
    const centerX = this.cameras.main.width / 2;
    const centerY = this.cameras.main.height / 2;
    
    const player = this.gameLogic.getPlayer();
    const enemies = this.gameLogic.getCombatEnemies();
    const combatState = this.gameLogic.getCombatState();
    
    // 背景
    const bg = this.add.rectangle(centerX, centerY, 800, 500, 0x000000, 0.95);
    bg.setStrokeStyle(2, 0xFF0000);
    this.uiContainer.add(bg);
    
    // 标题
    const title = this.add.text(centerX, centerY - 220, '⚔️ 战斗 ⚔️', {
      fontSize: '32px',
      color: '#FF0000',
    });
    title.setOrigin(0.5);
    this.uiContainer.add(title);
    
    // 回合指示
    const turnText = this.add.text(centerX, centerY - 180, 
      combatState === CombatState.PLAYER_TURN ? '▶ 你的回合' : '⏳ 敌人回合', {
      fontSize: '18px',
      color: combatState === CombatState.PLAYER_TURN ? '#00FF00' : '#888888',
    });
    turnText.setOrigin(0.5);
    this.uiContainer.add(turnText);
    
    // 玩家信息
    const playerSprite = this.add.text(centerX - 200, centerY - 50, '🧙', {
      fontSize: '64px',
    });
    playerSprite.setOrigin(0.5);
    this.uiContainer.add(playerSprite);
    
    const playerName = this.add.text(centerX - 200, centerY + 20, player.name, {
      fontSize: '16px',
      color: '#FFFFFF',
    });
    playerName.setOrigin(0.5);
    this.uiContainer.add(playerName);
    
    const playerHp = this.add.text(centerX - 200, centerY + 50, `HP: ${player.hp}/${player.maxHp}`, {
      fontSize: '14px',
      color: '#00FF00',
    });
    playerHp.setOrigin(0.5);
    this.uiContainer.add(playerHp);
    
    // VS
    const vs = this.add.text(centerX, centerY, 'VS', {
      fontSize: '24px',
      color: '#FFFF00',
    });
    vs.setOrigin(0.5);
    this.uiContainer.add(vs);
    
    // 敌人信息
    enemies.forEach((enemy: any, index: number) => {
      const x = centerX + 200;
      const y = centerY - 50 + index * 100;
      
      const enemySprite = this.add.text(x, y, enemy.char, {
        fontSize: '48px',
      });
      enemySprite.setOrigin(0.5);
      this.uiContainer.add(enemySprite);
      
      const enemyName = this.add.text(x, y + 40, enemy.name, {
        fontSize: '14px',
        color: '#FFFFFF',
      });
      enemyName.setOrigin(0.5);
      this.uiContainer.add(enemyName);
      
      const enemyHp = this.add.text(x, y + 60, `HP: ${enemy.hp}/${enemy.maxHp}`, {
        fontSize: '12px',
        color: '#FF0000',
      });
      enemyHp.setOrigin(0.5);
      this.uiContainer.add(enemyHp);
    });
    
    // 技能提示
    if (combatState === CombatState.PLAYER_TURN) {
      const skills = this.gameLogic.getAvailableSkills();
      let skillText = '技能: ';
      skills.slice(0, 4).forEach((skill: any, i: number) => {
        const status = skill.currentCooldown > 0 ? `[CD:${skill.currentCooldown}]` : 
                      player.mp < skill.mpCost ? `[!${skill.mpCost}MP]` : 
                      `[${skill.mpCost}MP]`;
        skillText += `[${i + 1}]${skill.icon}${skill.name}${status} `;
      });
      
      const skillsHint = this.add.text(centerX, centerY + 180, skillText, {
        fontSize: '12px',
        color: '#00FF00',
      });
      skillsHint.setOrigin(0.5);
      this.uiContainer.add(skillsHint);
      
      const hint = this.add.text(centerX, centerY + 210, '[A]攻击 [D]防御 [1-4]技能 [R]撤退', {
        fontSize: '12px',
        color: '#888888',
      });
      hint.setOrigin(0.5);
      this.uiContainer.add(hint);
    }
  }

  private renderLevelUp(): void {
    const centerX = this.cameras.main.width / 2;
    const centerY = this.cameras.main.height / 2;
    
    const player = this.gameLogic.getPlayer();
    
    // 背景
    const bg = this.add.rectangle(centerX, centerY, 500, 350, 0x000000, 0.95);
    bg.setStrokeStyle(2, 0xFFD700);
    this.uiContainer.add(bg);
    
    const title = this.add.text(centerX, centerY - 150, '🎉 升级！🎉', {
      fontSize: '28px',
      color: '#FFD700',
    });
    title.setOrigin(0.5);
    this.uiContainer.add(title);
    
    const levelText = this.add.text(centerX, centerY - 100, `当前等级: ${player.level}`, {
      fontSize: '18px',
      color: '#FFFFFF',
    });
    levelText.setOrigin(0.5);
    this.uiContainer.add(levelText);
    
    const pointsText = this.add.text(centerX, centerY - 60, `剩余属性点: ${player.statPoints}`, {
      fontSize: '16px',
      color: '#00FFFF',
    });
    pointsText.setOrigin(0.5);
    this.uiContainer.add(pointsText);
    
    // 属性选项
    const options = [
      { key: '1', name: '⚔️ 攻击力', desc: '+2 攻击力', color: '#00FF00' },
      { key: '2', name: '🛡️ 防御力', desc: '+1 防御力', color: '#0088FF' },
      { key: '3', name: '💚 生命上限', desc: '+15 生命上限', color: '#FF0000' },
      { key: '4', name: '💙 法力上限', desc: '+10 法力上限', color: '#FF00FF' },
    ];
    
    options.forEach((opt, i) => {
      const y = centerY - 10 + i * 40;
      const optText = this.add.text(centerX, y, `[${opt.key}] ${opt.name}`, {
        fontSize: '14px',
        color: opt.color,
      });
      optText.setOrigin(0.5);
      this.uiContainer.add(optText);
    });
    
    const hint = this.add.text(centerX, centerY + 150, 
      player.statPoints > 0 ? '[1-4]分配点数 [Enter]确认' : '按任意键继续', {
      fontSize: '12px',
      color: '#888888',
    });
    hint.setOrigin(0.5);
    this.uiContainer.add(hint);
  }

  private renderGameOver(): void {
    const centerX = this.cameras.main.width / 2;
    const centerY = this.cameras.main.height / 2;
    
    const bg = this.add.rectangle(centerX, centerY, 600, 400, 0x000000, 0.95);
    bg.setStrokeStyle(2, 0xFF0000);
    this.uiContainer.add(bg);
    
    const title = this.add.text(centerX, centerY - 100, '☠️ 游戏结束 ☠️', {
      fontSize: '32px',
      color: '#FF0000',
    });
    title.setOrigin(0.5);
    this.uiContainer.add(title);
    
    const dungeonLevel = this.gameLogic.getDungeonLevel();
    const text = this.add.text(centerX, centerY - 30, `你在地下城第 ${dungeonLevel} 层倒下了`, {
      fontSize: '16px',
      color: '#FFFFFF',
    });
    text.setOrigin(0.5);
    this.uiContainer.add(text);
    
    const player = this.gameLogic.getPlayer();
    const stats = this.add.text(centerX, centerY + 20, 
      `回合数: ${this.gameLogic.getTurn()}\n等级: ${player.level}`, {
      fontSize: '14px',
      color: '#888888',
      align: 'center',
    });
    stats.setOrigin(0.5);
    this.uiContainer.add(stats);
    
    const hint = this.add.text(centerX, centerY + 100, '按任意键退出...', {
      fontSize: '12px',
      color: '#666666',
    });
    hint.setOrigin(0.5);
    this.uiContainer.add(hint);
  }
}
