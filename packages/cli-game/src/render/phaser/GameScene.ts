import Phaser from 'phaser';
import { GameECS } from '../../core/game-ecs.js';
import { GameState, CombatState } from '../../core/types.js';
import { MapType } from '../../core/game-ecs.js';

/**
 * Phaser 游戏主场景
 * 负责渲染游戏地图、实体和处理输入
 */
export class GameScene extends Phaser.Scene {
  private gameLogic!: GameECS;
  private tileSize: number = 32;
  private viewportWidth: number = 35;
  private viewportHeight: number = 25;
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
  private tileGraphics!: Phaser.GameObjects.Graphics;
  private isRendering = false;
  private needsRender = false;
  private lastState?: GameState;
  
  // 长按移动
  private lastMoveTime: number = 0;
  private moveDelay: number = 150; // 移动间隔（毫秒）
  private isMoving: boolean = false;

  // 统一的色调配置
  private readonly COLORS = {
    background: 0x1a1a2e,    // 深蓝紫背景
    wall: 0x4a4a5c,          // 墙壁 - 灰白色，在深色背景中突出
    wallDark: 0x3a3a4c,      // 墙壁阴影
    floor: 0x16213e,         // 地板
    floorLight: 0x1e2a4a,    // 地板高亮
    road: 0x2a2a40,          // 道路
    grass: 0x1b3a2f,         // 草地（深墨绿）
    water: 0x1e3a5f,         // 水
    player: 0xffd700,        // 玩家金色
    entity: 0xffffff,        // 实体白色
    border: 0x0f0f1a,        // 边框（几乎不可见）
  };

  constructor() {
    super({ key: 'GameScene' });
  }

  preload(): void {
    // 无需预加载资源
  }

  create(): void {
    // 创建图形对象
    this.tileGraphics = this.add.graphics();
    
    // 创建容器
    this.mapContainer = this.add.container(0, 0);
    this.entityContainer = this.add.container(0, 0);
    this.uiContainer = this.add.container(0, 0);

    // 初始化游戏逻辑
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

    this.input.keyboard!.enabled = true;
    
    this.time.delayedCall(100, () => {
      this.renderGame();
    });
  }

  update(): void {
    this.handleInput();
  }

  private handleInput(): void {
    const now = Date.now();
    let moved = false;
    
    // 检测方向键（支持长按）
    const up = this.cursors.up!.isDown || this.wasdKeys.W.isDown;
    const down = this.cursors.down!.isDown || this.wasdKeys.S.isDown;
    const left = this.cursors.left!.isDown || this.wasdKeys.A.isDown;
    const right = this.cursors.right!.isDown || this.wasdKeys.D.isDown;
    
    // 如果有方向键按下，且距离上次移动超过间隔时间
    if ((up || down || left || right) && now - this.lastMoveTime > this.moveDelay) {
      if (up) {
        this.gameLogic.handleInput('arrowup');
        moved = true;
      } else if (down) {
        this.gameLogic.handleInput('arrowdown');
        moved = true;
      } else if (left) {
        this.gameLogic.handleInput('arrowleft');
        moved = true;
      } else if (right) {
        this.gameLogic.handleInput('arrowright');
        moved = true;
      }
      
      if (moved) {
        this.lastMoveTime = now;
      }
    }

    // 功能键（仍使用 JustDown，避免重复触发）
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
    if (this.isRendering) {
      this.needsRender = true;
      return;
    }
    
    this.time.delayedCall(0, () => {
      this.renderGame();
    });
  }

  private renderGame(): void {
    if (this.isRendering) return;
    this.isRendering = true;
    this.needsRender = false;

    try {
      const state = this.gameLogic.getState() as GameState;
      
      this.tileGraphics.clear();
      this.entityContainer.removeAll(true);
      this.uiContainer.removeAll(true);
      
      switch (state) {
        case GameState.LOADING:
          this.renderLoading();
          break;
        case GameState.INVENTORY:
          this.renderInventory();
          break;
        case GameState.COMBAT:
          this.renderCombat();
          break;
        case GameState.LEVEL_UP:
          this.renderLevelUp();
          break;
        case GameState.GAME_OVER:
          this.renderGameOver();
          break;
        default:
          this.renderExploration();
      }
    } finally {
      this.isRendering = false;
      
      if (this.needsRender) {
        this.time.delayedCall(10, () => this.renderGame());
      }
    }
  }

  private renderExploration(): void {
    const mapType = this.gameLogic.getMapType();

    if (mapType === MapType.TOWN) {
      this.renderTownMap();
    } else if (mapType === MapType.WILDERNESS) {
      this.renderWildernessMap();
    } else {
      this.renderDungeonMap();
    }
  }

  private renderTownMap(): void {
    const townManager = this.gameLogic.getTownManager();
    const player = this.gameLogic.getPlayer();
    
    const viewportTiles = townManager.getViewport(
      player.position.x, 
      player.position.y, 
      this.viewportWidth, 
      this.viewportHeight
    );
    const entities = (townManager as any).getAllEntities();

    const centerX = this.cameras.main.width / 2;
    const centerY = this.cameras.main.height / 2;
    const startX = centerX - (this.viewportWidth * this.tileSize) / 2;
    const startY = centerY - (this.viewportHeight * this.tileSize) / 2;

    const graphics = this.tileGraphics;
    
    // 绘制地图瓦片 - 统一色调
    for (let row = 0; row < viewportTiles.length; row++) {
      for (let col = 0; col < viewportTiles[row].length; col++) {
        const tile = viewportTiles[row][col];
        const x = startX + col * this.tileSize;
        const y = startY + row * this.tileSize;
        
        // 根据瓦片类型选择统一色调
        let color = this.COLORS.floor;
        
        if (tile.char === '██') {
          color = this.COLORS.wall;
        } else if (tile.char === '▓▓') {
          color = this.COLORS.road;
        } else if (tile.char === '░░') {
          color = this.COLORS.grass;
        }
        
        // 绘制纯色背景
        graphics.fillStyle(color, 1);
        graphics.fillRect(x - this.tileSize/2, y - this.tileSize/2, this.tileSize, this.tileSize);
        
        // 极细的边框（几乎不可见，仅用于分隔）
        graphics.lineStyle(1, this.COLORS.border, 0.3);
        graphics.strokeRect(x - this.tileSize/2, y - this.tileSize/2, this.tileSize, this.tileSize);
      }
    }

    // 渲染实体
    const halfW = Math.floor(this.viewportWidth / 2);
    const halfH = Math.floor(this.viewportHeight / 2);
    
    entities.forEach((entity: any) => {
      const relX = entity.position.x - player.position.x;
      const relY = entity.position.y - player.position.y;
      
      if (Math.abs(relX) <= halfW && Math.abs(relY) <= halfH) {
        const x = centerX + relX * this.tileSize;
        const y = centerY + relY * this.tileSize;
        
        // 实体下方添加阴影效果
        graphics.fillStyle(0x000000, 0.3);
        graphics.fillCircle(x + 2, y + 4, this.tileSize * 0.3);
        
        const entityText = this.add.text(x, y, entity.char, {
          fontSize: `${this.tileSize * 0.7}px`,
          color: entity.color || '#cccccc',
          fontFamily: 'Segoe UI Emoji, Apple Color Emoji, sans-serif',
        });
        entityText.setOrigin(0.5);
        this.entityContainer.add(entityText);
      }
    });

    // 渲染玩家
    const playerX = centerX;
    const playerY = centerY;
    
    // 玩家光晕
    graphics.fillStyle(this.COLORS.player, 0.15);
    graphics.fillCircle(playerX, playerY, this.tileSize * 1.2);
    graphics.fillStyle(this.COLORS.player, 0.08);
    graphics.fillCircle(playerX, playerY, this.tileSize * 2);
    
    // 玩家阴影
    graphics.fillStyle(0x000000, 0.4);
    graphics.fillCircle(playerX + 2, playerY + 4, this.tileSize * 0.35);
    
    // 玩家图标
    const playerText = this.add.text(playerX, playerY, '🧙', {
      fontSize: `${this.tileSize * 0.8}px`,
      color: '#ffd700',
      fontFamily: 'Segoe UI Emoji, Apple Color Emoji, sans-serif',
    });
    playerText.setOrigin(0.5);
    this.entityContainer.add(playerText);
  }

  private renderWildernessMap(): void {
    const wilderness = this.gameLogic.getWildernessMap();
    const player = this.gameLogic.getPlayer();
    
    if (!wilderness) return;

    const centerX = this.cameras.main.width / 2;
    const centerY = this.cameras.main.height / 2;
    const startX = centerX - (this.viewportWidth * this.tileSize) / 2;
    const startY = centerY - (this.viewportHeight * this.tileSize) / 2;

    const vpStartX = Math.max(0, Math.min(player.position.x - Math.floor(this.viewportWidth / 2), wilderness.width - this.viewportWidth));
    const vpStartY = Math.max(0, Math.min(player.position.y - Math.floor(this.viewportHeight / 2), wilderness.height - this.viewportHeight));

    const graphics = this.tileGraphics;

    for (let y = vpStartY; y < vpStartY + this.viewportHeight && y < wilderness.height; y++) {
      for (let x = vpStartX; x < vpStartX + this.viewportWidth && x < wilderness.width; x++) {
        const tile = wilderness.tiles[x][y];
        const screenX = startX + (x - vpStartX) * this.tileSize;
        const screenY = startY + (y - vpStartY) * this.tileSize;
        
        // 统一色调
        let color = this.COLORS.floor;
        if (tile.char === '🌲') color = this.COLORS.grass;
        else if (tile.char === '░') color = this.COLORS.floor;
        else if (tile.char === '▓') color = this.COLORS.road;
        
        graphics.fillStyle(color, 1);
        graphics.fillRect(screenX - this.tileSize/2, screenY - this.tileSize/2, this.tileSize, this.tileSize);
        
        graphics.lineStyle(1, this.COLORS.border, 0.2);
        graphics.strokeRect(screenX - this.tileSize/2, screenY - this.tileSize/2, this.tileSize, this.tileSize);
      }
    }

    // 渲染玩家
    const playerX = centerX;
    const playerY = centerY;
    
    graphics.fillStyle(this.COLORS.player, 0.15);
    graphics.fillCircle(playerX, playerY, this.tileSize * 1.2);
    
    graphics.fillStyle(0x000000, 0.4);
    graphics.fillCircle(playerX + 2, playerY + 4, this.tileSize * 0.35);
    
    const playerText = this.add.text(playerX, playerY, '🧙', {
      fontSize: `${this.tileSize * 0.8}px`,
      color: '#ffd700',
      fontFamily: 'Segoe UI Emoji, Apple Color Emoji, sans-serif',
    });
    playerText.setOrigin(0.5);
    this.entityContainer.add(playerText);
  }

  private renderDungeonMap(): void {
    const map = this.gameLogic.getDungeonMap();
    const player = this.gameLogic.getPlayer();
    
    const centerX = this.cameras.main.width / 2;
    const centerY = this.cameras.main.height / 2;
    const startX = centerX - (this.viewportWidth * this.tileSize) / 2;
    const startY = centerY - (this.viewportHeight * this.tileSize) / 2;

    const vpStartX = Math.max(0, Math.min(player.position.x - Math.floor(this.viewportWidth / 2), map.width - this.viewportWidth));
    const vpStartY = Math.max(0, Math.min(player.position.y - Math.floor(this.viewportHeight / 2), map.height - this.viewportHeight));

    const graphics = this.tileGraphics;

    for (let y = vpStartY; y < vpStartY + this.viewportHeight && y < map.height; y++) {
      for (let x = vpStartX; x < vpStartX + this.viewportWidth && x < map.width; x++) {
        const isVisible = map.visible[x]?.[y];
        const isExplored = map.explored[x]?.[y];
        
        const screenX = startX + (x - vpStartX) * this.tileSize;
        const screenY = startY + (y - vpStartY) * this.tileSize;
        
        if (!isExplored) {
          graphics.fillStyle(0x0a0a14, 1);
          graphics.fillRect(screenX - this.tileSize/2, screenY - this.tileSize/2, this.tileSize, this.tileSize);
          continue;
        }
        
        const tile = map.tiles[x][y];
        let color = tile.walkable ? this.COLORS.floor : this.COLORS.wall;
        let alpha = isVisible ? 1 : 0.5;
        
        graphics.fillStyle(color, alpha);
        graphics.fillRect(screenX - this.tileSize/2, screenY - this.tileSize/2, this.tileSize, this.tileSize);
        
        if (isVisible) {
          graphics.lineStyle(1, this.COLORS.border, 0.2);
          graphics.strokeRect(screenX - this.tileSize/2, screenY - this.tileSize/2, this.tileSize, this.tileSize);
        }
      }
    }

    // 渲染玩家
    const playerX = centerX;
    const playerY = centerY;
    
    // 视野光晕
    graphics.fillStyle(this.COLORS.player, 0.1);
    graphics.fillCircle(playerX, playerY, this.tileSize * 3);
    graphics.fillStyle(this.COLORS.player, 0.2);
    graphics.fillCircle(playerX, playerY, this.tileSize * 1.5);
    
    graphics.fillStyle(0x000000, 0.4);
    graphics.fillCircle(playerX + 2, playerY + 4, this.tileSize * 0.35);
    
    const playerText = this.add.text(playerX, playerY, '🧙', {
      fontSize: `${this.tileSize * 0.8}px`,
      color: '#ffd700',
      fontFamily: 'Segoe UI Emoji, Apple Color Emoji, sans-serif',
    });
    playerText.setOrigin(0.5);
    this.entityContainer.add(playerText);
  }

  private renderLoading(): void {
    const centerX = this.cameras.main.width / 2;
    const centerY = this.cameras.main.height / 2;
    
    const loadingText = this.add.text(centerX, centerY, '正在加载...', {
      fontSize: '32px',
      color: '#888888',
      fontFamily: 'Microsoft YaHei, sans-serif',
    });
    loadingText.setOrigin(0.5);
    this.uiContainer.add(loadingText);
  }

  private renderInventory(): void {
    const centerX = this.cameras.main.width / 2;
    const centerY = this.cameras.main.height / 2;
    
    const bg = this.add.rectangle(centerX, centerY, 800, 600, 0x1a1a2e, 0.95);
    bg.setStrokeStyle(2, 0x2d2d44);
    this.uiContainer.add(bg);
    
    const title = this.add.text(centerX, centerY - 250, '背包', {
      fontSize: '36px',
      color: '#cccccc',
      fontFamily: 'Microsoft YaHei, sans-serif',
    });
    title.setOrigin(0.5);
    this.uiContainer.add(title);
  }

  private renderCombat(): void {
    const centerX = this.cameras.main.width / 2;
    const centerY = this.cameras.main.height / 2;
    
    const bg = this.add.rectangle(centerX, centerY, 900, 600, 0x1a1a2e, 0.98);
    bg.setStrokeStyle(2, 0x8b0000);
    this.uiContainer.add(bg);
    
    const title = this.add.text(centerX, centerY - 250, '战斗', {
      fontSize: '48px',
      color: '#cc4444',
      fontFamily: 'Microsoft YaHei, sans-serif',
    });
    title.setOrigin(0.5);
    this.uiContainer.add(title);
  }

  private renderLevelUp(): void {
    const centerX = this.cameras.main.width / 2;
    const centerY = this.cameras.main.height / 2;
    
    const title = this.add.text(centerX, centerY - 100, '升级', {
      fontSize: '48px',
      color: '#ffd700',
      fontFamily: 'Microsoft YaHei, sans-serif',
    });
    title.setOrigin(0.5);
    this.uiContainer.add(title);
  }

  private renderGameOver(): void {
    const centerX = this.cameras.main.width / 2;
    const centerY = this.cameras.main.height / 2;
    
    const title = this.add.text(centerX, centerY, '游戏结束', {
      fontSize: '64px',
      color: '#aa4444',
      fontFamily: 'Microsoft YaHei, sans-serif',
    });
    title.setOrigin(0.5);
    this.uiContainer.add(title);
  }
}
