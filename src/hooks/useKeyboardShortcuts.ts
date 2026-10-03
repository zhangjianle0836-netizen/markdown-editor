import { useEffect } from 'react';

interface UseKeyboardShortcutsProps {
  onOpen?: () => void;
  onSave?: () => void;
  onNew?: () => void;
}

export function useKeyboardShortcuts({
  onOpen,
  onSave,
  onNew,
}: UseKeyboardShortcutsProps) {
  useEffect(() => {
    const handleKeyDown = (e: KeyboardEvent) => {
      const isMac = navigator.platform.toUpperCase().indexOf('MAC') >= 0;
      const modifierKey = isMac ? e.metaKey : e.ctrlKey;

      if (document.querySelector('dialog[open]')) {
        if (modifierKey && ['o', 's', 'n'].includes(e.key.toLowerCase())) e.preventDefault();
        return;
      }

      // Cmd/Ctrl + O: Open file
      if (modifierKey && e.key === 'o') {
        e.preventDefault();
        onOpen?.();
      }

      // Cmd/Ctrl + S: Save file
      if (modifierKey && e.key === 's') {
        e.preventDefault();
        onSave?.();
      }

      // Cmd/Ctrl + N: New file
      if (modifierKey && e.key === 'n') {
        e.preventDefault();
        onNew?.();
      }
    };

    window.addEventListener('keydown', handleKeyDown);

    return () => {
      window.removeEventListener('keydown', handleKeyDown);
    };
  }, [onOpen, onSave, onNew]);
}
