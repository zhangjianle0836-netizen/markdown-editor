import * as crypto from 'crypto';
import * as fs from 'fs';
import * as path from 'path';

export const MAX_MARKDOWN_FILE_SIZE = 10 * 1024 * 1024;

/** Identify a disk version without reading a potentially large file. */
export const getFileVersion = async (filePath: string): Promise<string | null> => {
  try {
    const stats = await fs.promises.stat(filePath, { bigint: true });
    return `${stats.ino}:${stats.size}:${stats.mtimeNs}:${stats.ctimeNs}`;
  } catch (error) {
    if ((error as NodeJS.ErrnoException).code === 'ENOENT') return null;
    throw error;
  }
};

/** Preserve symbolic links and replace only a completely flushed file. */
export const atomicWriteFile = async (
  filePath: string,
  content: string | Buffer,
  options: { preserveSymbolicLink?: boolean } = {}
): Promise<void> => {
  let targetPath = filePath;
  let mode = 0o600;
  try {
    const resolvedPath = await fs.promises.realpath(filePath);
    if (options.preserveSymbolicLink !== false) targetPath = resolvedPath;
    mode = (await fs.promises.stat(targetPath)).mode & 0o777;
  } catch (error) {
    if ((error as NodeJS.ErrnoException).code !== 'ENOENT') throw error;
    // A dangling symlink must not silently become a regular file.
    const stats = await fs.promises.lstat(filePath).catch((error: NodeJS.ErrnoException) => {
      if (error.code === 'ENOENT') return null;
      throw error;
    });
    if (stats?.isSymbolicLink() && options.preserveSymbolicLink !== false) {
      throw new Error('文件链接的目标不存在，请另存为。');
    }
  }
  const temporaryPath = path.join(path.dirname(targetPath),
    `.${path.basename(targetPath)}.${process.pid}.${crypto.randomUUID()}.tmp`);
  let temporaryFile: fs.promises.FileHandle | null = null;
  try {
    temporaryFile = await fs.promises.open(temporaryPath, 'wx', mode);
    await temporaryFile.chmod(mode);
    await temporaryFile.writeFile(content, { encoding: 'utf-8' });
    await temporaryFile.sync();
    await temporaryFile.close();
    temporaryFile = null;
    await fs.promises.rename(temporaryPath, targetPath);
  } catch (error) {
    if (temporaryFile) await temporaryFile.close().catch(() => undefined);
    await fs.promises.unlink(temporaryPath).catch(() => undefined);
    throw error;
  }
};
