export type UnsavedChangesAction = 'save' | 'discard' | 'cancel';

/**
 * 获取未保存更改的处理方式。
 */
export const getUnsavedChangesAction = async (
  tabName: string,
  isModified: boolean
): Promise<UnsavedChangesAction> => {
  if (!isModified) return 'discard';

  // 使用 Electron 的对话框
  if (window.electronAPI && window.electronAPI.showUnsavedChangesDialog) {
    try {
      const result = await window.electronAPI.showUnsavedChangesDialog(tabName);

      if (result.response === 0) return 'save';
      if (result.response === 1) return 'discard';
      return 'cancel';
    } catch (error) {
      console.error('Failed to show message box:', error);
      // 降级到浏览器确认框
      return confirm(`“${tabName}”有未保存的更改，确定不保存并继续吗？`)
        ? 'discard'
        : 'cancel';
    }
  }

  // 降级到浏览器确认框
  return confirm(`“${tabName}”有未保存的更改，确定不保存并继续吗？`)
    ? 'discard'
    : 'cancel';
};
