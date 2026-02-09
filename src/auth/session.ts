/**
 * Session Management
 *
 * Handles local storage of authentication tokens in ~/.agekey/session.json.
 * Uses in-memory cache so we don't re-read disk or re-verify on every request.
 *
 * @values TEEN - Secure token storage with proper file permissions
 */

import { existsSync, mkdirSync, readFileSync, writeFileSync, chmodSync, unlinkSync } from "node:fs";
import { homedir } from "node:os";
import { join } from "node:path";
import type { Session } from "../types.js";

// =============================================================================
// Constants
// =============================================================================

const AGEKEY_DIR = join(homedir(), ".agekey");
const SESSION_FILE = join(AGEKEY_DIR, "session.json");

// In-memory cache so MCP doesn't hit disk or re-init auth on every request
let sessionCache: Session | null = null;

// =============================================================================
// Session Management
// =============================================================================

/**
 * Ensure the ~/.agekey directory exists with proper permissions
 */
function ensureAgekeyDir(): void {
  if (!existsSync(AGEKEY_DIR)) {
    mkdirSync(AGEKEY_DIR, { mode: 0o700, recursive: true });
  }
}

/**
 * Load session from disk (and populate cache).
 * Returns null if no session exists or session is invalid/expired.
 */
export function loadSession(): Session | null {
  if (sessionCache !== null) {
    if (new Date(sessionCache.expiresAt) >= new Date()) {
      return sessionCache;
    }
    sessionCache = null;
  }

  try {
    if (!existsSync(SESSION_FILE)) {
      return null;
    }

    const content = readFileSync(SESSION_FILE, "utf-8");
    const session = JSON.parse(content) as Session;

    if (new Date(session.expiresAt) < new Date()) {
      clearSession();
      return null;
    }

    sessionCache = session;
    return session;
  } catch {
    clearSession();
    return null;
  }
}

/**
 * Save session to disk with secure permissions and update in-memory cache
 */
export function saveSession(session: Session): void {
  ensureAgekeyDir();

  const content = JSON.stringify(session, null, 2);
  writeFileSync(SESSION_FILE, content, { mode: 0o600 });

  try {
    chmodSync(SESSION_FILE, 0o600);
  } catch {
    // chmod may fail on some systems, ignore
  }

  sessionCache = session;
}

/**
 * Clear session from disk and in-memory cache
 */
export function clearSession(): void {
  sessionCache = null;
  try {
    if (existsSync(SESSION_FILE)) {
      writeFileSync(SESSION_FILE, "", { mode: 0o600 });
      unlinkSync(SESSION_FILE);
    }
  } catch {
    // Ignore errors during cleanup
  }
}

/**
 * Check if user is authenticated
 */
export function isAuthenticated(): boolean {
  const session = loadSession();
  return session !== null;
}

/**
 * Get the current user from session
 */
export function getCurrentUser(): Session["user"] | null {
  const session = loadSession();
  return session?.user ?? null;
}

/**
 * Get the access token for API calls
 */
export function getAccessToken(): string | null {
  const session = loadSession();
  return session?.accessToken ?? null;
}
