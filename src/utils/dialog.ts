/**
 * 检查是否可以关闭标签
 * 如果有未保存的更改，提示用户
 */
export const checkCanCloseTab = async (
  tabName: string,
  isModified: boolean
): Promise<boolean> => {
  if (!isModified) return true;

  // 使用 Electron 的对话框
  if (window.electronAPI && window.electronAPI.showMessageBox) {
    try {
      const result = await window.electronAPI.showMessageBox({
        type: 'warning',
        buttons: ['Save', "Don't Save", 'Cancel'],
        defaultId: 0,
        cancelId: 2,
        title: 'Unsaved Changes',
        message: `Do you want to save changes to "${tabName}"?`,
        detail: 'Your changes will be lost if you don\'t save them.',
      });

      // 0: Save, 1: Don't Save, 2: Cancel
      if (result.response === 2) return false; // Cancel
      return true; // Allow close (Save or Don't Save)
    } catch (error) {
      console.error('Failed to show message box:', error);
      // 降级到浏览器确认框
      return confirm(
        `"${tabName}" has unsaved changes. Are you sure you want to close it?`
      );
    }
  }

  // 降级到浏览器确认框
  return confirm(
    `"${tabName}" has unsaved changes. Are you sure you want to close it?`
  );
};
