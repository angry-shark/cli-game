/**
 * 游戏存档系统
 * 基于 core/file 封装的高级存档功能
 */

import {
  writeFileAsync,
  readFileAsync,
  deleteFileAsync,
  fileExistsAsync,
  createDirectoryAsync,
  listDirectoryAsync,
  getFileStatsAsync,
  ensureDirectoryAsync,
  joinPath,
  deleteDirectoryAsync,
  FileOperationError
} from '../core/file';
import { Logger } from './logger';

/**
 * 存档元数据
 */
export interface SaveMetadata {
  id: string;
  name: string;
  createdAt: string;
  updatedAt: string;
  version: string;
  playTime: number; // 游戏时长（秒）
  checksum?: string;
}

/**
 * 存档数据
 */
export interface SaveData<T = unknown> {
  metadata: SaveMetadata;
  gameData: T;
}

/**
 * 存档信息
 */
export interface SaveInfo {
  id: string;
  name: string;
  createdAt: Date;
  updatedAt: Date;
  size: number;
  version: string;
  playTime: number;
}

/**
 * 存档管理器配置
 */
export interface SaveManagerConfig {
  saveDir: string;
  maxSlots?: number;
  autoSave?: boolean;
  autoSaveInterval?: number; // 自动存档间隔（分钟）
  backupCount?: number; // 备份数量
  encrypt?: boolean;
  version?: string;
}

/**
 * 存档槽位
 */
export interface SaveSlot {
  slotId: number;
  isEmpty: boolean;
  info?: SaveInfo;
}

/**
 * 存档管理器
 * 提供完整的游戏存档管理功能
 */
export class SaveManager<T = unknown> {
  private config: Required<SaveManagerConfig>;
  private logger: Logger;
  private autoSaveTimer: NodeJS.Timeout | null;
  private currentPlayTime: number;
  private playTimeStart: number;

  constructor(config: SaveManagerConfig) {
    this.config = {
      maxSlots: 10,
      autoSave: false,
      autoSaveInterval: 5,
      backupCount: 3,
      encrypt: false,
      version: '1.0.0',
      ...config
    };
    this.logger = new Logger({ prefix: 'SaveManager' });
    this.autoSaveTimer = null;
    this.currentPlayTime = 0;
    this.playTimeStart = Date.now();
  }

  /**
   * 初始化存档系统
   */
  async initialize(): Promise<void> {
    try {
      await ensureDirectoryAsync(this.config.saveDir);
      this.logger.info(`存档目录初始化完成: ${this.config.saveDir}`);
    } catch (error) {
      this.logger.error('存档目录初始化失败', error);
      throw error;
    }
  }

  /**
   * 创建存档
   * @param slotId 存档槽位（1-based）
   * @param name 存档名称
   * @param gameData 游戏数据
   */
  async save(slotId: number, name: string, gameData: T): Promise<SaveMetadata> {
    if (slotId < 1 || slotId > this.config.maxSlots) {
      throw new Error(`存档槽位必须在 1-${this.config.maxSlots} 之间`);
    }

    const now = new Date().toISOString();
    const id = `save_${slotId.toString().padStart(3, '0')}`;
    
    // 计算游戏时长
    const playTime = this.currentPlayTime + Math.floor((Date.now() - this.playTimeStart) / 1000);

    const metadata: SaveMetadata = {
      id,
      name: name || `存档 ${slotId}`,
      createdAt: now,
      updatedAt: now,
      version: this.config.version,
      playTime
    };

    const saveData: SaveData<T> = {
      metadata,
      gameData
    };

    try {
      // 如果有备份，先备份旧存档
      await this.backupIfExists(slotId);

      const filePath = this.getSavePath(slotId);
      const content = this.serialize(saveData);
      await writeFileAsync(filePath, content);

      this.logger.info(`存档已保存: ${metadata.name} (槽位 ${slotId})`);
      return metadata;
    } catch (error) {
      this.logger.error(`存档失败 (槽位 ${slotId})`, error);
      throw error;
    }
  }

  /**
   * 读取存档
   * @param slotId 存档槽位
   * @returns 存档数据
   */
  async load(slotId: number): Promise<SaveData<T>> {
    const filePath = this.getSavePath(slotId);

    try {
      const content = await readFileAsync(filePath);
      const saveData = this.deserialize(content) as SaveData<T>;

      // 验证版本
      if (saveData.metadata.version !== this.config.version) {
        this.logger.warn(`存档版本不匹配: ${saveData.metadata.version} vs ${this.config.version}`);
      }

      // 恢复游戏时长计时
      this.currentPlayTime = saveData.metadata.playTime;
      this.playTimeStart = Date.now();

      this.logger.info(`存档已加载: ${saveData.metadata.name}`);
      return saveData;
    } catch (error) {
      if (error instanceof FileOperationError && error.code === 'ENOENT') {
        throw new Error(`存档槽位 ${slotId} 不存在`);
      }
      this.logger.error(`读取存档失败 (槽位 ${slotId})`, error);
      throw error;
    }
  }

  /**
   * 删除存档
   * @param slotId 存档槽位
   */
  async delete(slotId: number): Promise<void> {
    const filePath = this.getSavePath(slotId);

    try {
      await deleteFileAsync(filePath, false);
      this.logger.info(`存档已删除 (槽位 ${slotId})`);
    } catch (error) {
      this.logger.error(`删除存档失败 (槽位 ${slotId})`, error);
      throw error;
    }
  }

  /**
   * 获取存档信息
   * @param slotId 存档槽位
   */
  async getSaveInfo(slotId: number): Promise<SaveInfo | null> {
    const filePath = this.getSavePath(slotId);

    try {
      const exists = await fileExistsAsync(filePath);
      if (!exists) return null;

      const content = await readFileAsync(filePath);
      const saveData = this.deserialize(content) as SaveData<T>;
      const stats = await getFileStatsAsync(filePath);

      return {
        id: saveData.metadata.id,
        name: saveData.metadata.name,
        createdAt: new Date(saveData.metadata.createdAt),
        updatedAt: new Date(saveData.metadata.updatedAt),
        size: stats.size,
        version: saveData.metadata.version,
        playTime: saveData.metadata.playTime
      };
    } catch (error) {
      this.logger.error(`获取存档信息失败 (槽位 ${slotId})`, error);
      return null;
    }
  }

  /**
   * 获取所有存档槽位信息
   */
  async getAllSaveSlots(): Promise<SaveSlot[]> {
    const slots: SaveSlot[] = [];

    for (let i = 1; i <= this.config.maxSlots; i++) {
      const info = await this.getSaveInfo(i);
      slots.push({
        slotId: i,
        isEmpty: info === null,
        info: info || undefined
      });
    }

    return slots;
  }

  /**
   * 检查存档是否存在
   * @param slotId 存档槽位
   */
  async exists(slotId: number): Promise<boolean> {
    const filePath = this.getSavePath(slotId);
    return fileExistsAsync(filePath);
  }

  /**
   * 快速保存（自动选择槽位）
   * @param gameData 游戏数据
   */
  async quickSave(gameData: T): Promise<SaveMetadata> {
    // 寻找第一个空槽位或最早的存档
    const slots = await this.getAllSaveSlots();
    const emptySlot = slots.find(s => s.isEmpty);
    
    if (emptySlot) {
      return this.save(emptySlot.slotId, '快速存档', gameData);
    }

    // 如果没有空槽位，覆盖最早的存档
    const oldestSlot = slots
      .filter(s => s.info)
      .sort((a, b) => (a.info!.updatedAt.getTime() - b.info!.updatedAt.getTime()))[0];
    
    return this.save(oldestSlot.slotId, '快速存档', gameData);
  }

  /**
   * 自动存档
   * @param gameData 游戏数据
   */
  async autoSave(gameData: T): Promise<SaveMetadata> {
    return this.save(0, '自动存档', gameData);
  }

  /**
   * 启动自动存档
   * @param gameDataProvider 游戏数据提供函数
   */
  startAutoSave(gameDataProvider: () => T): void {
    if (!this.config.autoSave) return;

    this.stopAutoSave();

    this.autoSaveTimer = setInterval(async () => {
      try {
        const data = gameDataProvider();
        await this.autoSave(data);
        this.logger.info('自动存档完成');
      } catch (error) {
        this.logger.error('自动存档失败', error);
      }
    }, this.config.autoSaveInterval * 60 * 1000);

    this.logger.info(`自动存档已启动，间隔 ${this.config.autoSaveInterval} 分钟`);
  }

  /**
   * 停止自动存档
   */
  stopAutoSave(): void {
    if (this.autoSaveTimer) {
      clearInterval(this.autoSaveTimer);
      this.autoSaveTimer = null;
      this.logger.info('自动存档已停止');
    }
  }

  /**
   * 导出存档
   * @param slotId 存档槽位
   * @param exportPath 导出路径
   */
  async exportSave(slotId: number, exportPath: string): Promise<void> {
    const saveData = await this.load(slotId);
    const content = this.serialize(saveData);
    await writeFileAsync(exportPath, content);
    this.logger.info(`存档已导出: ${exportPath}`);
  }

  /**
   * 导入存档
   * @param importPath 导入文件路径
   * @param slotId 目标槽位
   */
  async importSave(importPath: string, slotId: number): Promise<void> {
    const content = await readFileAsync(importPath);
    const saveData = this.deserialize(content) as SaveData<T>;

    // 更新元数据
    saveData.metadata.updatedAt = new Date().toISOString();
    saveData.metadata.id = `save_${slotId.toString().padStart(3, '0')}`;

    const filePath = this.getSavePath(slotId);
    await writeFileAsync(filePath, this.serialize(saveData));
    this.logger.info(`存档已导入到槽位 ${slotId}`);
  }

  /**
   * 删除所有存档
   */
  async deleteAll(): Promise<void> {
    try {
      await deleteDirectoryAsync(this.config.saveDir, true);
      await createDirectoryAsync(this.config.saveDir);
      this.logger.info('所有存档已删除');
    } catch (error) {
      this.logger.error('删除所有存档失败', error);
      throw error;
    }
  }

  /**
   * 获取存档文件路径
   */
  private getSavePath(slotId: number): string {
    const fileName = slotId === 0 ? 'autosave.json' : `save_${slotId.toString().padStart(3, '0')}.json`;
    return joinPath(this.config.saveDir, fileName);
  }

  /**
   * 备份已存在的存档
   */
  private async backupIfExists(slotId: number): Promise<void> {
    if (this.config.backupCount <= 0) return;

    const filePath = this.getSavePath(slotId);
    const exists = await fileExistsAsync(filePath);
    if (!exists) return;

    const backupDir = joinPath(this.config.saveDir, 'backups');
    await ensureDirectoryAsync(backupDir);

    // 移动已有备份
    for (let i = this.config.backupCount - 1; i >= 1; i--) {
      const oldBackup = joinPath(backupDir, `save_${slotId.toString().padStart(3, '0')}_backup_${i}.json`);
      const newBackup = joinPath(backupDir, `save_${slotId.toString().padStart(3, '0')}_backup_${i + 1}.json`);
      
      const oldExists = await fileExistsAsync(oldBackup);
      if (oldExists) {
        if (i === this.config.backupCount - 1) {
          await deleteFileAsync(oldBackup);
        } else {
          const content = await readFileAsync(oldBackup);
          await writeFileAsync(newBackup, content);
        }
      }
    }

    // 备份当前存档
    const content = await readFileAsync(filePath);
    const backupPath = joinPath(backupDir, `save_${slotId.toString().padStart(3, '0')}_backup_1.json`);
    await writeFileAsync(backupPath, content);
  }

  /**
   * 序列化存档数据
   */
  private serialize(data: SaveData<T>): string {
    const json = JSON.stringify(data, null, 2);
    if (this.config.encrypt) {
      // 简单加密：Base64
      return Buffer.from(json).toString('base64');
    }
    return json;
  }

  /**
   * 反序列化存档数据
   */
  private deserialize(content: string): SaveData<T> {
    let json = content;
    if (this.config.encrypt) {
      // 解密
      json = Buffer.from(content, 'base64').toString('utf8');
    }
    return JSON.parse(json);
  }

  /**
   * 获取当前游戏时长
   */
  getCurrentPlayTime(): number {
    return this.currentPlayTime + Math.floor((Date.now() - this.playTimeStart) / 1000);
  }

  /**
   * 重置游戏时长计时
   */
  resetPlayTime(): void {
    this.currentPlayTime = 0;
    this.playTimeStart = Date.now();
  }
}

/**
 * 存档选择对话框
 * @param saveManager 存档管理器
 * @returns 选择的槽位，取消返回 null
 */
export async function showSaveSelector(
  saveManager: SaveManager
): Promise<number | null> {
  const slots = await saveManager.getAllSaveSlots();
  
  console.log('\n╔══════════════════════════════════════╗');
  console.log('║           选择存档槽位               ║');
  console.log('╠══════════════════════════════════════╣');
  
  slots.forEach(slot => {
    if (slot.isEmpty) {
      console.log(`║  [${slot.slotId.toString().padStart(2)}]  空槽位                        ║`);
    } else {
      const info = slot.info!;
      const time = formatPlayTime(info.playTime);
      const date = info.updatedAt.toLocaleDateString('zh-CN');
      const name = info.name.slice(0, 12).padEnd(12);
      console.log(`║  [${slot.slotId.toString().padStart(2)}]  ${name} ${time} ${date}  ║`);
    }
  });
  
  console.log('║                                      ║');
  console.log('║  [0] 取消                            ║');
  console.log('╚══════════════════════════════════════╝');
  
  return new Promise((resolve) => {
    process.stdin.once('keypress', (str, key) => {
      const num = parseInt(key.sequence || '0');
      if (isNaN(num) || num < 0 || num > slots.length) {
        resolve(null);
      } else if (num === 0) {
        resolve(null);
      } else {
        resolve(num);
      }
    });
  });
}

/**
 * 格式化游戏时长
 * @param seconds 秒数
 */
function formatPlayTime(seconds: number): string {
  const hours = Math.floor(seconds / 3600);
  const mins = Math.floor((seconds % 3600) / 60);
  
  if (hours > 0) {
    return `${hours}h${mins.toString().padStart(2, '0')}m`;
  }
  return `${mins}m`;
}

/**
 * 简单的存档验证器
 * @param saveData 存档数据
 * @param validator 验证函数
 */
export function validateSave<T>(
  saveData: SaveData<T>,
  validator: (data: T) => boolean
): boolean {
  if (!saveData.metadata || !saveData.gameData) {
    return false;
  }
  
  if (!saveData.metadata.id || !saveData.metadata.createdAt) {
    return false;
  }
  
  return validator(saveData.gameData);
}
