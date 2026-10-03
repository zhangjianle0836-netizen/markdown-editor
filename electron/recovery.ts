import { MAX_MARKDOWN_FILE_SIZE } from './files';

export interface RecoveryDraft {
  name: string;
  content: string;
}

/** Recovery never grants access to a path supplied by a stored draft. */
export const isRecoveryDraft = (value: unknown): value is RecoveryDraft => {
  if (!value || typeof value !== 'object') return false;
  const draft = value as Partial<RecoveryDraft>;
  return typeof draft.name === 'string' && draft.name.length <= 255 &&
    typeof draft.content === 'string' &&
    Buffer.byteLength(draft.content, 'utf-8') <= MAX_MARKDOWN_FILE_SIZE;
};
