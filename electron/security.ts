import * as fs from 'fs';
import * as path from 'path';

export const SUPPORTED_FILE_EXTENSIONS = new Set([
  '.md',
  '.markdown',
  '.mdown',
  '.mkd',
  '.txt',
]);

export const matchesTrustedRendererUrl = (
  rawUrl: string,
  trustedUrl: string
): boolean => {
  try {
    const candidate = new URL(rawUrl);
    const trusted = new URL(trustedUrl);
    return (
      candidate.protocol === trusted.protocol &&
      candidate.host === trusted.host &&
      candidate.pathname === trusted.pathname
    );
  } catch {
    return false;
  }
};

export const isSafeExternalUrl = (rawUrl: string): boolean => {
  try {
    const protocol = new URL(rawUrl).protocol;
    return protocol === 'https:' || protocol === 'http:' || protocol === 'mailto:';
  } catch {
    return false;
  }
};

export const normalizePathKey = (
  filePath: string,
  platform: NodeJS.Platform = process.platform
): string | null => {
  if (typeof filePath !== 'string' || !filePath || filePath.includes('\0')) {
    return null;
  }

  const resolved = path.resolve(filePath);
  return platform === 'win32' ? resolved.toLowerCase() : resolved;
};

export const findSupportedFileArgument = (
  args: string[],
  fileExists: (filePath: string) => boolean = fs.existsSync
): string | null => {
  for (const argument of args) {
    if (!argument || argument.startsWith('-')) {
      continue;
    }

    const resolvedPath = path.resolve(argument);
    if (
      SUPPORTED_FILE_EXTENSIONS.has(path.extname(resolvedPath).toLowerCase()) &&
      fileExists(resolvedPath)
    ) {
      return resolvedPath;
    }
  }

  return null;
};
