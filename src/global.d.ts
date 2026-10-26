/// <reference types="vite/client" />
declare module 'exceljs/dist/exceljs.min.js' {
  import ExcelJS from 'exceljs';
  export default ExcelJS;
}

interface GpaApi {
  load(): Promise<string | null>;
  save(text: string): Promise<boolean>;
  dataPath(): Promise<string>;
  ocr(bytes: Uint8Array): Promise<{ ok: true; page: { width: number; height: number; words: { text: string; x0: number; y0: number; x1: number; y1: number; conf: number }[] } } | { ok: false; error: string }>;
  saveFile(opts: { defaultName: string; base64: string; filters?: { name: string; extensions: string[] }[] }): Promise<string | null>;
}
interface Window { gpaApi?: GpaApi }

declare module 'pdfjs-dist/build/pdf.worker.min.mjs' {
  export const WorkerMessageHandler: unknown;
}

declare module '*.jpg' { const src: string; export default src; }
declare module '*.png' { const src: string; export default src; }
