import { 
  setupRawMode, 
  safeExit,
  KeyPressEvent,
  GameRenderer,
  createCell,
  formatScore,
  formatControls,
  formatGameOver,
  formatStartMenu,
  InputManager,
  InputEvent,
  GameAction,
  Direction,
  getDirectionDelta
} from '@cli-game/engine-core';

interface Position {
  x: number;
  y: number;
}

export class SnakeGame {
  public width: number;
  public height: number;
  public snake: Position[];
  public food: Position;
  public score: number;
  public gameOver: boolean;
  public speed: number;
  private renderer: GameRenderer;
  private currentDirection: { x: number; y: number };

  constructor(width: number = 20, height: number = 15) {
    this.width = width;
    this.height = height;
    this.snake = [
      { x: Math.floor(width / 2), y: Math.floor(height / 2) }
    ];
    this.currentDirection = { x: 1, y: 0 };
    this.food = this.generateFood();
    this.score = 0;
    this.gameOver = false;
    this.speed = 150;
    this.renderer = new GameRenderer({ width, height });
  }

  generateFood(): Position {
    let food: Position;
    do {
      food = {
        x: Math.floor(Math.random() * this.width),
        y: Math.floor(Math.random() * this.height)
      };
    } while (this.isSnakeAt(food.x, food.y));
    return food;
  }

  isSnakeAt(x: number, y: number): boolean {
    return this.snake.some(segment => segment.x === x && segment.y === y);
  }

  update(): void {
    if (this.gameOver) return;

    const head: Position = { ...this.snake[0] };
    head.x += this.currentDirection.x;
    head.y += this.currentDirection.y;

    // 碰撞检测 - 墙壁
    if (head.x < 0 || head.x >= this.width || head.y < 0 || head.y >= this.height) {
      this.gameOver = true;
      return;
    }

    // 碰撞检测 - 自身
    if (this.isSnakeAt(head.x, head.y)) {
      this.gameOver = true;
      return;
    }

    this.snake.unshift(head);

    // 吃到食物
    if (head.x === this.food.x && head.y === this.food.y) {
      this.score += 10;
      this.food = this.generateFood();
      this.speed = Math.max(50, this.speed - 2);
    } else {
      this.snake.pop();
    }
  }

  changeDirection(direction: Direction): void {
    const delta = getDirectionDelta(direction);
    // 防止 180 度反向（由 InputManager 处理，这里是双重保险）
    if (this.currentDirection.x !== -delta.x || this.currentDirection.y !== -delta.y) {
      this.currentDirection = delta;
    }
  }

  render(): void {
    this.renderer.reset();
    this.renderer.renderTopBorder();

    // 渲染每一行
    for (let y = 0; y < this.height; y++) {
      const row: string[] = [];
      for (let x = 0; x < this.width; x++) {
        const isHead = this.snake[0].x === x && this.snake[0].y === y;
        const isBody = !isHead && this.isSnakeAt(x, y);
        const isFood = this.food.x === x && this.food.y === y;
        row.push(createCell(isHead, isBody, isFood));
      }
      this.renderer.renderRow(row);
    }

    this.renderer.renderBottomBorder();
    this.renderer.renderNewLine();
    this.renderer.renderInfo(formatScore(this.score, this.speed));
    this.renderer.renderInfo(formatControls());

    if (this.gameOver) {
      this.renderer.renderNewLine();
      this.renderer.renderInfo(formatGameOver());
    }

    this.renderer.flush();
  }
}

export class GameManager {
  public game: SnakeGame | null;
  private interval: NodeJS.Timeout | null;
  private cleanupTerminal: (() => void) | null;
  private inputManager: InputManager;
  private isPaused: boolean;

  constructor() {
    this.game = null;
    this.interval = null;
    this.cleanupTerminal = null;
    this.isPaused = false;
    this.inputManager = new InputManager({
      onInput: this.handleInput.bind(this)
    });
    this.setupInput();
  }

  setupInput(): void {
    this.cleanupTerminal = setupRawMode((str: string, key: KeyPressEvent) => {
      this.inputManager.handleKey(key);
    });

    // 程序退出时清理
    process.on('exit', () => this.cleanup());
    process.on('SIGINT', () => this.quit());
    process.on('SIGTERM', () => this.quit());
  }

  handleInput(event: InputEvent): void {
    switch (event.action) {
      case GameAction.QUIT:
        this.quit();
        break;
      case GameAction.RESTART:
        if (this.game?.gameOver || this.isPaused) {
          this.isPaused = false;
          this.start();
        }
        break;
      case GameAction.PAUSE:
        if (!this.game?.gameOver) {
          this.togglePause();
        }
        break;
      case GameAction.MOVE:
        if (event.direction && !this.isPaused && !this.game?.gameOver) {
          this.game?.changeDirection(event.direction);
        }
        break;
    }
  }

  togglePause(): void {
    if (!this.game || this.game.gameOver) return;

    this.isPaused = !this.isPaused;
    if (!this.isPaused) {
      this.runGameLoop();
    }
  }

  cleanup(): void {
    if (this.interval) {
      clearTimeout(this.interval);
      this.interval = null;
    }
    if (this.cleanupTerminal) {
      this.cleanupTerminal();
      this.cleanupTerminal = null;
    }
    this.inputManager.disable();
  }

  start(): void {
    if (this.interval) {
      clearTimeout(this.interval);
    }

    this.inputManager.resetDirection();
    this.game = new SnakeGame();
    this.isPaused = false;
    this.game.render();
    this.runGameLoop();
  }

  runGameLoop(): void {
    if (!this.game || this.game.gameOver || this.isPaused) return;

    const gameLoop = (): void => {
      if (!this.game || this.game.gameOver || this.isPaused) return;

      this.game.update();
      this.game.render();

      if (!this.game.gameOver && !this.isPaused) {
        this.interval = setTimeout(gameLoop, this.game.speed);
      }
    };

    this.interval = setTimeout(gameLoop, this.game.speed);
  }

  quit(): void {
    this.cleanup();
    safeExit('感谢游玩! 👋');
  }

  /**
   * 显示开始菜单并等待按键
   */
  async showStartMenu(): Promise<void> {
    const menu = formatStartMenu();
    menu.forEach(line => process.stdout.write(line));
    
    // 等待任意按键
    await new Promise<void>((resolve) => {
      const tempHandler = (str: string, key: KeyPressEvent) => {
        this.inputManager.handleKey(key);
        if (!this.game) {
          resolve();
        }
      };
      
      // 临时覆盖输入处理
      const originalCallback = this.inputManager['onInput'];
      this.inputManager.setCallback((event: InputEvent) => {
        if (event.action !== GameAction.NONE) {
          this.inputManager.setCallback(originalCallback);
          resolve();
          this.handleInput(event);
        }
      });
    });
  }
}
