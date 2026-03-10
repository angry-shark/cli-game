/**
 * 文件操作工具
 * 提供本地文件的读取、写入、创建、删除等基础能力
 */

import * as fs from 'fs';
import * as path from 'path';

/**
 * 文件编码
 */
export type FileEncoding = 'utf8' | 'utf-8' | 'ascii' | 'base64' | 'binary' | 'hex' | 'latin1';

/**
 * 写入文件选项
 */
export interface WriteFileOptions {
  encoding?: FileEncoding;
  mode?: number;
  flag?: string;
}

/**
 * 读取文件选项
 */
export interface ReadFileOptions {
  encoding?: FileEncoding;
  flag?: string;
}

/**
 * 文件/目录信息
 */
export interface FileStats {
  isFile: boolean;
  isDirectory: boolean;
  size: number;
  createdAt: Date;
  modifiedAt: Date;
  accessedAt: Date;
}

/**
 * 文件操作错误
 */
export class FileOperationError extends Error {
  public code: string;
  public path: string;

  constructor(message: string, code: string, filePath: string) {
    super(message);
    this.name = 'FileOperationError';
    this.code = code;
    this.path = filePath;
  }
}

/**
 * 同步写入文件
 * @param filePath 文件路径
 * @param data 数据
 * @param options 选项
 */
export function writeFile(
  filePath: string,
  data: string | Buffer,
  options: WriteFileOptions = {}
): void {
  try {
    const dir = path.dirname(filePath);
    if (!fs.existsSync(dir)) {
      fs.mkdirSync(dir, { recursive: true });
    }
    fs.writeFileSync(filePath, data, {
      encoding: options.encoding || 'utf8',
      mode: options.mode,
      flag: options.flag
    });
  } catch (error) {
    const err = error as NodeJS.ErrnoException;
    throw new FileOperationError(
      `写入文件失败: ${err.message}`,
      err.code || 'WRITE_ERROR',
      filePath
    );
  }
}

/**
 * 异步写入文件
 * @param filePath 文件路径
 * @param data 数据
 * @param options 选项
 */
export async function writeFileAsync(
  filePath: string,
  data: string | Buffer,
  options: WriteFileOptions = {}
): Promise<void> {
  try {
    const dir = path.dirname(filePath);
    await fs.promises.mkdir(dir, { recursive: true });
    await fs.promises.writeFile(filePath, data, {
      encoding: options.encoding || 'utf8',
      mode: options.mode,
      flag: options.flag
    });
  } catch (error) {
    const err = error as NodeJS.ErrnoException;
    throw new FileOperationError(
      `写入文件失败: ${err.message}`,
      err.code || 'WRITE_ERROR',
      filePath
    );
  }
}

/**
 * 同步读取文件
 * @param filePath 文件路径
 * @param options 选项
 * @returns 文件内容
 */
export function readFile(
  filePath: string,
  options: ReadFileOptions = {}
): string {
  try {
    return fs.readFileSync(filePath, {
      encoding: options.encoding || 'utf8',
      flag: options.flag
    }) as string;
  } catch (error) {
    const err = error as NodeJS.ErrnoException;
    throw new FileOperationError(
      `读取文件失败: ${err.message}`,
      err.code || 'READ_ERROR',
      filePath
    );
  }
}

/**
 * 异步读取文件
 * @param filePath 文件路径
 * @param options 选项
 * @returns 文件内容
 */
export async function readFileAsync(
  filePath: string,
  options: ReadFileOptions = {}
): Promise<string> {
  try {
    const content = await fs.promises.readFile(filePath, {
      encoding: options.encoding || 'utf8',
      flag: options.flag
    });
    return content as string;
  } catch (error) {
    const err = error as NodeJS.ErrnoException;
    throw new FileOperationError(
      `读取文件失败: ${err.message}`,
      err.code || 'READ_ERROR',
      filePath
    );
  }
}

/**
 * 同步删除文件
 * @param filePath 文件路径
 * @param throwIfNotExists 不存在时是否抛出错误，默认 false
 */
export function deleteFile(filePath: string, throwIfNotExists: boolean = false): void {
  try {
    fs.unlinkSync(filePath);
  } catch (error) {
    const err = error as NodeJS.ErrnoException;
    if (err.code === 'ENOENT' && !throwIfNotExists) {
      return; // 文件不存在，不报错
    }
    throw new FileOperationError(
      `删除文件失败: ${err.message}`,
      err.code || 'DELETE_ERROR',
      filePath
    );
  }
}

/**
 * 异步删除文件
 * @param filePath 文件路径
 * @param throwIfNotExists 不存在时是否抛出错误，默认 false
 */
export async function deleteFileAsync(
  filePath: string,
  throwIfNotExists: boolean = false
): Promise<void> {
  try {
    await fs.promises.unlink(filePath);
  } catch (error) {
    const err = error as NodeJS.ErrnoException;
    if (err.code === 'ENOENT' && !throwIfNotExists) {
      return;
    }
    throw new FileOperationError(
      `删除文件失败: ${err.message}`,
      err.code || 'DELETE_ERROR',
      filePath
    );
  }
}

/**
 * 检查文件是否存在
 * @param filePath 文件路径
 */
export function fileExists(filePath: string): boolean {
  return fs.existsSync(filePath);
}

/**
 * 异步检查文件是否存在
 * @param filePath 文件路径
 */
export async function fileExistsAsync(filePath: string): Promise<boolean> {
  try {
    await fs.promises.access(filePath, fs.constants.F_OK);
    return true;
  } catch {
    return false;
  }
}

/**
 * 创建目录
 * @param dirPath 目录路径
 * @param recursive 是否递归创建，默认 true
 */
export function createDirectory(dirPath: string, recursive: boolean = true): void {
  try {
    fs.mkdirSync(dirPath, { recursive });
  } catch (error) {
    const err = error as NodeJS.ErrnoException;
    throw new FileOperationError(
      `创建目录失败: ${err.message}`,
      err.code || 'MKDIR_ERROR',
      dirPath
    );
  }
}

/**
 * 异步创建目录
 * @param dirPath 目录路径
 * @param recursive 是否递归创建，默认 true
 */
export async function createDirectoryAsync(
  dirPath: string,
  recursive: boolean = true
): Promise<void> {
  try {
    await fs.promises.mkdir(dirPath, { recursive });
  } catch (error) {
    const err = error as NodeJS.ErrnoException;
    throw new FileOperationError(
      `创建目录失败: ${err.message}`,
      err.code || 'MKDIR_ERROR',
      dirPath
    );
  }
}

/**
 * 删除目录
 * @param dirPath 目录路径
 * @param recursive 是否递归删除，默认 false
 */
export function deleteDirectory(dirPath: string, recursive: boolean = false): void {
  try {
    if (recursive) {
      fs.rmSync(dirPath, { recursive: true, force: true });
    } else {
      fs.rmdirSync(dirPath);
    }
  } catch (error) {
    const err = error as NodeJS.ErrnoException;
    throw new FileOperationError(
      `删除目录失败: ${err.message}`,
      err.code || 'RMDIR_ERROR',
      dirPath
    );
  }
}

/**
 * 异步删除目录
 * @param dirPath 目录路径
 * @param recursive 是否递归删除，默认 false
 */
export async function deleteDirectoryAsync(
  dirPath: string,
  recursive: boolean = false
): Promise<void> {
  try {
    if (recursive) {
      await fs.promises.rm(dirPath, { recursive: true, force: true });
    } else {
      await fs.promises.rmdir(dirPath);
    }
  } catch (error) {
    const err = error as NodeJS.ErrnoException;
    throw new FileOperationError(
      `删除目录失败: ${err.message}`,
      err.code || 'RMDIR_ERROR',
      dirPath
    );
  }
}

/**
 * 获取文件/目录信息
 * @param filePath 路径
 */
export function getFileStats(filePath: string): FileStats {
  try {
    const stats = fs.statSync(filePath);
    return {
      isFile: stats.isFile(),
      isDirectory: stats.isDirectory(),
      size: stats.size,
      createdAt: stats.birthtime,
      modifiedAt: stats.mtime,
      accessedAt: stats.atime
    };
  } catch (error) {
    const err = error as NodeJS.ErrnoException;
    throw new FileOperationError(
      `获取文件信息失败: ${err.message}`,
      err.code || 'STAT_ERROR',
      filePath
    );
  }
}

/**
 * 异步获取文件/目录信息
 * @param filePath 路径
 */
export async function getFileStatsAsync(filePath: string): Promise<FileStats> {
  try {
    const stats = await fs.promises.stat(filePath);
    return {
      isFile: stats.isFile(),
      isDirectory: stats.isDirectory(),
      size: stats.size,
      createdAt: stats.birthtime,
      modifiedAt: stats.mtime,
      accessedAt: stats.atime
    };
  } catch (error) {
    const err = error as NodeJS.ErrnoException;
    throw new FileOperationError(
      `获取文件信息失败: ${err.message}`,
      err.code || 'STAT_ERROR',
      filePath
    );
  }
}

/**
 * 列出目录内容
 * @param dirPath 目录路径
 * @returns 文件/目录名列表
 */
export function listDirectory(dirPath: string): string[] {
  try {
    return fs.readdirSync(dirPath);
  } catch (error) {
    const err = error as NodeJS.ErrnoException;
    throw new FileOperationError(
      `读取目录失败: ${err.message}`,
      err.code || 'READDIR_ERROR',
      dirPath
    );
  }
}

/**
 * 异步列出目录内容
 * @param dirPath 目录路径
 * @returns 文件/目录名列表
 */
export async function listDirectoryAsync(dirPath: string): Promise<string[]> {
  try {
    return await fs.promises.readdir(dirPath);
  } catch (error) {
    const err = error as NodeJS.ErrnoException;
    throw new FileOperationError(
      `读取目录失败: ${err.message}`,
      err.code || 'READDIR_ERROR',
      dirPath
    );
  }
}

/**
 * 追加内容到文件
 * @param filePath 文件路径
 * @param data 要追加的数据
 */
export function appendFile(filePath: string, data: string): void {
  try {
    const dir = path.dirname(filePath);
    if (!fs.existsSync(dir)) {
      fs.mkdirSync(dir, { recursive: true });
    }
    fs.appendFileSync(filePath, data, 'utf8');
  } catch (error) {
    const err = error as NodeJS.ErrnoException;
    throw new FileOperationError(
      `追加文件失败: ${err.message}`,
      err.code || 'APPEND_ERROR',
      filePath
    );
  }
}

/**
 * 异步追加内容到文件
 * @param filePath 文件路径
 * @param data 要追加的数据
 */
export async function appendFileAsync(filePath: string, data: string): Promise<void> {
  try {
    const dir = path.dirname(filePath);
    await fs.promises.mkdir(dir, { recursive: true });
    await fs.promises.appendFile(filePath, data, 'utf8');
  } catch (error) {
    const err = error as NodeJS.ErrnoException;
    throw new FileOperationError(
      `追加文件失败: ${err.message}`,
      err.code || 'APPEND_ERROR',
      filePath
    );
  }
}

/**
 * 复制文件
 * @param sourcePath 源文件路径
 * @param destPath 目标文件路径
 */
export function copyFile(sourcePath: string, destPath: string): void {
  try {
    const dir = path.dirname(destPath);
    if (!fs.existsSync(dir)) {
      fs.mkdirSync(dir, { recursive: true });
    }
    fs.copyFileSync(sourcePath, destPath);
  } catch (error) {
    const err = error as NodeJS.ErrnoException;
    throw new FileOperationError(
      `复制文件失败: ${err.message}`,
      err.code || 'COPY_ERROR',
      destPath
    );
  }
}

/**
 * 异步复制文件
 * @param sourcePath 源文件路径
 * @param destPath 目标文件路径
 */
export async function copyFileAsync(sourcePath: string, destPath: string): Promise<void> {
  try {
    const dir = path.dirname(destPath);
    await fs.promises.mkdir(dir, { recursive: true });
    await fs.promises.copyFile(sourcePath, destPath);
  } catch (error) {
    const err = error as NodeJS.ErrnoException;
    throw new FileOperationError(
      `复制文件失败: ${err.message}`,
      err.code || 'COPY_ERROR',
      destPath
    );
  }
}

/**
 * 移动/重命名文件
 * @param oldPath 原路径
 * @param newPath 新路径
 */
export function moveFile(oldPath: string, newPath: string): void {
  try {
    const dir = path.dirname(newPath);
    if (!fs.existsSync(dir)) {
      fs.mkdirSync(dir, { recursive: true });
    }
    fs.renameSync(oldPath, newPath);
  } catch (error) {
    const err = error as NodeJS.ErrnoException;
    throw new FileOperationError(
      `移动文件失败: ${err.message}`,
      err.code || 'RENAME_ERROR',
      oldPath
    );
  }
}

/**
 * 异步移动/重命名文件
 * @param oldPath 原路径
 * @param newPath 新路径
 */
export async function moveFileAsync(oldPath: string, newPath: string): Promise<void> {
  try {
    const dir = path.dirname(newPath);
    await fs.promises.mkdir(dir, { recursive: true });
    await fs.promises.rename(oldPath, newPath);
  } catch (error) {
    const err = error as NodeJS.ErrnoException;
    throw new FileOperationError(
      `移动文件失败: ${err.message}`,
      err.code || 'RENAME_ERROR',
      oldPath
    );
  }
}

/**
 * 清空目录内容（保留目录本身）
 * @param dirPath 目录路径
 */
export function clearDirectory(dirPath: string): void {
  try {
    const items = fs.readdirSync(dirPath);
    for (const item of items) {
      const itemPath = path.join(dirPath, item);
      const stats = fs.statSync(itemPath);
      if (stats.isDirectory()) {
        fs.rmSync(itemPath, { recursive: true, force: true });
      } else {
        fs.unlinkSync(itemPath);
      }
    }
  } catch (error) {
    const err = error as NodeJS.ErrnoException;
    throw new FileOperationError(
      `清空目录失败: ${err.message}`,
      err.code || 'CLEAR_ERROR',
      dirPath
    );
  }
}

/**
 * 异步清空目录内容
 * @param dirPath 目录路径
 */
export async function clearDirectoryAsync(dirPath: string): Promise<void> {
  try {
    const items = await fs.promises.readdir(dirPath);
    await Promise.all(
      items.map(async item => {
        const itemPath = path.join(dirPath, item);
        const stats = await fs.promises.stat(itemPath);
        if (stats.isDirectory()) {
          await fs.promises.rm(itemPath, { recursive: true, force: true });
        } else {
          await fs.promises.unlink(itemPath);
        }
      })
    );
  } catch (error) {
    const err = error as NodeJS.ErrnoException;
    throw new FileOperationError(
      `清空目录失败: ${err.message}`,
      err.code || 'CLEAR_ERROR',
      dirPath
    );
  }
}

/**
 * 确保目录存在（不存在则创建）
 * @param dirPath 目录路径
 */
export function ensureDirectory(dirPath: string): void {
  if (!fs.existsSync(dirPath)) {
    createDirectory(dirPath, true);
  }
}

/**
 * 异步确保目录存在
 * @param dirPath 目录路径
 */
export async function ensureDirectoryAsync(dirPath: string): Promise<void> {
  const exists = await fileExistsAsync(dirPath);
  if (!exists) {
    await createDirectoryAsync(dirPath, true);
  }
}

/**
 * 获取文件扩展名
 * @param filePath 文件路径
 */
export function getFileExtension(filePath: string): string {
  return path.extname(filePath).toLowerCase();
}

/**
 * 获取文件名（不含扩展名）
 * @param filePath 文件路径
 */
export function getFileName(filePath: string): string {
  return path.basename(filePath, path.extname(filePath));
}

/**
 * 获取完整文件名
 * @param filePath 文件路径
 */
export function getBaseName(filePath: string): string {
  return path.basename(filePath);
}

/**
 * 获取目录名
 * @param filePath 文件路径
 */
export function getDirectoryName(filePath: string): string {
  return path.dirname(filePath);
}

/**
 * 拼接路径
 * @param paths 路径片段
 */
export function joinPath(...paths: string[]): string {
  return path.join(...paths);
}

/**
 * 解析绝对路径
 * @param filePath 文件路径
 */
export function resolvePath(filePath: string): string {
  return path.resolve(filePath);
}

/**
 * 检查路径是否为绝对路径
 * @param filePath 文件路径
 */
export function isAbsolutePath(filePath: string): boolean {
  return path.isAbsolute(filePath);
}
