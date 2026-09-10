import { BrowserWindow } from 'electron';
import * as path from 'path';
import { createHash, randomUUID } from 'crypto';

export interface PdfExportRequest {
  name: string;
  html: string;
}

export interface PdfExportResult {
  success: boolean;
  canceled?: boolean;
  filePath?: string;
  error?: string;
}

export const isPdfExportRequest = (value: unknown): value is PdfExportRequest => {
  if (!value || typeof value !== 'object') {
    return false;
  }
  const request = value as Partial<PdfExportRequest>;
  return (
    typeof request.name === 'string' &&
    request.name.length <= 255 &&
    typeof request.html === 'string' &&
    Buffer.byteLength(request.html, 'utf-8') <= 20 * 1024 * 1024
  );
};

export const getPdfFileName = (name: string): string => {
  const base = name
    .replace(/\.(md|markdown|mdown|mkd|txt|pdf)$/i, '')
    .replace(/[<>:"/\\|?*\u0000-\u001f]/g, '_')
    .replace(/^[. ]+|[. ]+$/g, '')
    .slice(0, 180);
  return `${base || '未命名'}.pdf`;
};

export const isPdfFilePath = (filePath: string): boolean => {
  return path.extname(filePath).toLowerCase() === '.pdf';
};

const escapeHtml = (text: string): string => text.replace(/[&<>"']/g, (character) => ({
  '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&#39;',
})[character]!);

const PDF_STYLES = `
  :root { color-scheme: light; }
  * { box-sizing: border-box; }
  body { margin: 0; color: #20252b; background: #fff; font: 11pt/1.7 -apple-system, BlinkMacSystemFont, 'Segoe UI', 'PingFang SC', 'Microsoft YaHei', sans-serif; overflow-wrap: anywhere; }
  h1, h2, h3, h4, h5, h6 { line-height: 1.35; margin: 1.3em 0 .6em; break-after: avoid; }
  h1 { font-size: 25pt; padding-bottom: .3em; border-bottom: 1px solid #d8dee4; }
  h2 { font-size: 19pt; } h3 { font-size: 15pt; }
  h4, h5, h6 { font-size: 12pt; }
  article > :first-child { margin-top: 0; }
  p, ul, ol, blockquote, pre, table { margin: 0 0 1em; }
  p, li { orphans: 3; widows: 3; }
  ul, ol { padding-left: 1.8em; }
  li > p { margin-bottom: .4em; }
  a { color: #0969da; text-decoration: underline; }
  blockquote { margin-left: 0; padding: .3em 1em; border-left: 3px solid #d0d7de; color: #57606a; }
  blockquote > :last-child { margin-bottom: 0; }
  code { font-family: 'SFMono-Regular', Consolas, 'Liberation Mono', monospace; font-size: 9pt; background: #f2f4f6; padding: .15em .3em; border-radius: 3px; }
  pre { padding: 12px; background: #f2f4f6; border: 1px solid #d8dee4; border-radius: 5px; white-space: pre-wrap; overflow-wrap: anywhere; }
  pre code { padding: 0; background: transparent; white-space: inherit; }
  table { width: 100%; border-collapse: collapse; table-layout: fixed; font-size: 10pt; }
  th, td { padding: 7px 9px; border: 1px solid #d0d7de; text-align: left; vertical-align: top; }
  th { background: #f2f4f6; font-weight: 600; }
  thead { display: table-header-group; } tr { break-inside: avoid; }
  img { max-width: 100%; max-height: 240mm; object-fit: contain; height: auto; break-inside: avoid; }
  input[type="checkbox"] { accent-color: #0969da; }
  hr { border: 0; border-top: 1px solid #d0d7de; margin: 1.5em 0; }
`;
const PDF_STYLE_HASH = createHash('sha256').update(PDF_STYLES).digest('base64');

// This document contains only sanitized preview HTML, never the editor or its UI.
export const createPdfDocument = ({ name, html }: PdfExportRequest): string => `<!doctype html>
<html lang="zh-CN">
<head>
<meta charset="utf-8">
<meta http-equiv="Content-Security-Policy" content="default-src 'none'; script-src 'none'; style-src 'sha256-${PDF_STYLE_HASH}'; img-src https: http: data:; base-uri 'none'; form-action 'none'">
<title>${escapeHtml(name)}</title>
<style>${PDF_STYLES}</style>
</head>
<body><article>${html}</article></body>
</html>`;

/** Render in an isolated, script-free window with a bounded lifetime. */
export const renderPdf = async (request: PdfExportRequest): Promise<Buffer> => {
  const printWindow = new BrowserWindow({
    show: false,
    webPreferences: {
      nodeIntegration: false,
      contextIsolation: true,
      sandbox: true,
      javascript: false,
      // Use a separate, nonpersistent session without the editor's cookies.
      partition: `pdf-${randomUUID()}`,
    },
  });
  printWindow.webContents.setWindowOpenHandler(() => ({ action: 'deny' }));
  printWindow.webContents.on('will-navigate', (event) => event.preventDefault());
  printWindow.webContents.on('will-redirect', (event) => event.preventDefault());
  printWindow.webContents.session.setPermissionRequestHandler((_contents, _permission, callback) => callback(false));

  let timeout: ReturnType<typeof setTimeout> | undefined;
  try {
    return await Promise.race([
      (async () => {
        await printWindow.loadURL(`data:text/html;charset=utf-8,${encodeURIComponent(createPdfDocument(request))}`);
        return printWindow.webContents.printToPDF({
          pageSize: 'A4',
          printBackground: true,
          margins: { top: 0.6, bottom: 0.6, left: 0.6, right: 0.6 },
          generateDocumentOutline: true,
          generateTaggedPDF: true,
        });
      })(),
      new Promise<never>((_resolve, reject) => {
        timeout = setTimeout(() => reject(new Error('导出超时，请检查文档中的图片后重试。')), 30_000);
      }),
    ]);
  } finally {
    clearTimeout(timeout);
    if (!printWindow.isDestroyed()) {
      printWindow.destroy();
    }
  }
};
