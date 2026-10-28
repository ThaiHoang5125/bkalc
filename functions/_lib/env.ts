/** Kiểu tối thiểu cho Cloudflare D1 và ngữ cảnh Pages Functions (tránh phụ thuộc @cloudflare/workers-types). */
export interface D1Stmt {
  bind(...values: unknown[]): D1Stmt;
  first<T = Record<string, unknown>>(): Promise<T | null>;
  all<T = Record<string, unknown>>(): Promise<{ results: T[] }>;
  run(): Promise<unknown>;
}
export interface D1 { prepare(sql: string): D1Stmt; batch(stmts: D1Stmt[]): Promise<unknown[]> }
export interface Env { DB: D1; ADMIN_TOKEN?: string }
export interface Ctx { request: Request; env: Env }
