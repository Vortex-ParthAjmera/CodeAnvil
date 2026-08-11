/**
 * Local-first authentication (demo mode).
 *
 * Until the backend ships (see docs/35 — the mandatory Backend Pre-Deploy
 * Security Gate), accounts live ONLY in this browser's localStorage and the
 * "Google" button simulates OAuth. The real provider plan is documented in
 * the Auth screen: Google OAuth via Supabase with email+password fallback.
 *
 * Passwords are deterministically hashed here for the demo, NOT for real
 * security — never treat this as production authentication.
 */
import { useRef, useSyncExternalStore } from "react";

export interface Account {
  id: string;
  name: string;
  email: string;
  /** demo-only deterministic hash; NOT real security */
  passwordHash: string;
  provider: "password" | "google";
  createdAt: string;
}

interface Session {
  accountId: string;
  signedInAt: string;
}

const ACCOUNTS_KEY = "codeanvil.accounts.v1";
const SESSION_KEY = "codeanvil.session.v1";

function read<T>(key: string, fallback: T): T {
  try {
    const raw = localStorage.getItem(key);
    if (!raw) return fallback;
    return JSON.parse(raw) as T;
  } catch {
    return fallback;
  }
}

function write(key: string, value: unknown) {
  try {
    localStorage.setItem(key, JSON.stringify(value));
  } catch {
    /* ignore */
  }
}

/** Demo-only djb2 hash — obfuscation, not cryptography. */
export function hashPassword(pw: string): string {
  let h = 5381;
  for (let i = 0; i < pw.length; i++) h = (h * 33) ^ pw.charCodeAt(i);
  return `djb2:${(h >>> 0).toString(16)}`;
}

function loadAccounts(): Account[] {
  const list = read<Account[]>(ACCOUNTS_KEY, []);
  return Array.isArray(list) ? list : [];
}

function loadSession(): Session | null {
  return read<Session | null>(SESSION_KEY, null);
}

function saveSession(session: Session | null) {
  if (session) write(SESSION_KEY, session);
  else try { localStorage.removeItem(SESSION_KEY); } catch { /* ignore */ }
  emit();
}

const listeners = new Set<() => void>();
function emit() {
  listeners.forEach((fn) => fn());
}

export function signUp(name: string, email: string, password: string): { ok: boolean; error?: string } {
  const normalized = email.trim().toLowerCase();
  if (!name.trim()) return { ok: false, error: "Enter your name." };
  if (!/^[^@\s]+@[^@\s]+\.[^@\s]+$/.test(normalized)) return { ok: false, error: "Enter a valid email address." };
  if (password.length < 6) return { ok: false, error: "Password must be at least 6 characters." };
  const accounts = loadAccounts();
  if (accounts.some((a) => a.email === normalized)) {
    return { ok: false, error: "An account with that email already exists. Sign in instead." };
  }
  const account: Account = {
    id: `acc-${Date.now().toString(36)}${Math.random().toString(36).slice(2, 7)}`,
    name: name.trim(),
    email: normalized,
    passwordHash: hashPassword(password),
    provider: "password",
    createdAt: new Date().toISOString(),
  };
  write(ACCOUNTS_KEY, [...accounts, account]);
  saveSession({ accountId: account.id, signedInAt: new Date().toISOString() });
  return { ok: true };
}

export function signIn(email: string, password: string): { ok: boolean; error?: string } {
  const normalized = email.trim().toLowerCase();
  const account = loadAccounts().find((a) => a.email === normalized);
  if (!account || account.passwordHash !== hashPassword(password)) {
    return { ok: false, error: "Invalid email or password." };
  }
  saveSession({ accountId: account.id, signedInAt: new Date().toISOString() });
  return { ok: true };
}

/** Demo Google OAuth — creates or resumes a synthetic Google account. */
export function signInWithGoogle(): { ok: boolean; error?: string } {
  const accounts = loadAccounts();
  let account = accounts.find((a) => a.provider === "google");
  if (!account) {
    const base = "forge.traveler";
    account = {
      id: `acc-${Date.now().toString(36)}${Math.random().toString(36).slice(2, 7)}`,
      name: "Google Forge User",
      email: `${base}@gmail.com`,
      passwordHash: "",
      provider: "google",
      createdAt: new Date().toISOString(),
    };
    write(ACCOUNTS_KEY, [...accounts, account]);
  }
  saveSession({ accountId: account.id, signedInAt: new Date().toISOString() });
  return { ok: true };
}

export function signOut() {
  saveSession(null);
}

export function getSession(): Session | null {
  return loadSession();
}

export function getCurrentAccount(): Account | null {
  const session = loadSession();
  if (!session) return null;
  return loadAccounts().find((a) => a.id === session.accountId) ?? null;
}

function subscribe(fn: () => void) {
  listeners.add(fn);
  return () => {
    listeners.delete(fn);
  };
}

/**
 * React hook — re-renders whenever the session changes.
 * getCurrentAccount re-parses localStorage each call, so the snapshot is
 * memoized by account id to keep useSyncExternalStore referentially stable.
 */
export function useSession(): Account | null {
  const cached = useRef<Account | null>(null);
  const getSnapshot = () => {
    const current = getCurrentAccount();
    if (current && cached.current && current.id === cached.current.id) {
      return cached.current;
    }
    cached.current = current;
    return current;
  };
  useSyncExternalStore(subscribe, getSnapshot, getSnapshot);
  return getSnapshot();
}

export function initialsOf(name: string): string {
  return name
    .split(/\s+/)
    .filter(Boolean)
    .slice(0, 2)
    .map((w) => w[0]!.toUpperCase())
    .join("");
}
