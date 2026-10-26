import type { AppData } from './engine';
import { changePassword, createAccount, emptyVault, nameTaken, normName, parseStored, sealAccount, serialize, unlockAccount } from './accounts';
import type { Parsed, Vault, VaultAccount } from './accounts';
import { readStored, writeStored } from './storage';
import { emptyData, sanitize } from './store';

export interface Session { id: string; name: string; data: AppData; save: (d: AppData) => Promise<void> }

let state: Parsed = { vault: emptyVault(), legacy: null };
let chain: Promise<void> = Promise.resolve();
const flush = () => { const text = serialize(state.vault); chain = chain.then(() => writeStored(text)).catch(() => undefined); return chain; };

export async function initVault(): Promise<Parsed> { state = parseStored(await readStored()); return state; }
export const getVault = (): Vault => state.vault;
export const hasLegacy = () => state.legacy !== null;

const MIN_PW = 4;
export const validPassword = (p: string) => p.length >= MIN_PW;
export const MIN_PASSWORD = MIN_PW;

function open(acc: VaultAccount, key: CryptoKey, data: AppData): Session {
  return {
    id: acc.id, name: acc.name, data,
    save: async (d) => {
      const i = state.vault.accounts.findIndex((a) => a.id === acc.id);
      if (i < 0) return;
      const sealed = await sealAccount(state.vault.accounts[i], key, JSON.stringify(d));
      state.vault = { ...state.vault, accounts: state.vault.accounts.map((a, k) => (k === i ? sealed : a)) };
      await flush();
    },
  };
}

/** Tạo tài khoản mới; có thể chuyển dữ liệu cũ (chưa có tài khoản) vào tài khoản này. */
export async function register(name: string, password: string, adoptLegacy: boolean): Promise<Session> {
  const n = normName(name);
  if (!n) throw new Error('no-name');
  if (nameTaken(state.vault, n)) throw new Error('name-taken');
  if (!validPassword(password)) throw new Error('short-password');
  let data = emptyData();
  if (adoptLegacy && state.legacy) { try { data = sanitize(JSON.parse(state.legacy)); } catch { /* bỏ qua */ } }
  const { account, key } = await createAccount(n, password, JSON.stringify(data));
  state = { vault: { ...state.vault, accounts: [...state.vault.accounts, account], last: account.id }, legacy: adoptLegacy ? null : state.legacy };
  await flush();
  return open(account, key, data);
}

export async function login(id: string, password: string): Promise<Session> {
  const acc = state.vault.accounts.find((a) => a.id === id);
  if (!acc) throw new Error('no-account');
  const { json, key } = await unlockAccount(acc, password);
  let data = emptyData();
  try { data = sanitize(JSON.parse(json)); } catch { /* dữ liệu hỏng → trống */ }
  if (state.vault.last !== id) { state.vault = { ...state.vault, last: id }; void flush(); }
  return open(acc, key, data);
}

export async function removeAccount(id: string): Promise<void> {
  state = { ...state, vault: { ...state.vault, accounts: state.vault.accounts.filter((a) => a.id !== id), ...(state.vault.last === id ? { last: undefined } : {}) } };
  await flush();
}

export async function changeAccountPassword(session: Session, oldPw: string, newPw: string): Promise<Session> {
  if (!validPassword(newPw)) throw new Error('short-password');
  const acc = state.vault.accounts.find((a) => a.id === session.id);
  if (!acc) throw new Error('no-account');
  const { account, key } = await changePassword(acc, oldPw, newPw);
  state = { ...state, vault: { ...state.vault, accounts: state.vault.accounts.map((a) => (a.id === acc.id ? account : a)) } };
  await flush();
  return open(account, key, session.data);
}
