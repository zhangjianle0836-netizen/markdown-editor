let counter = 0;

/**
 * 生成唯一 ID
 * 格式: timestamp-counter
 */
export const generateId = (): string => {
  return `${Date.now()}-${++counter}`;
};
