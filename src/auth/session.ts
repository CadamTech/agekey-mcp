/**
 * Session Management
 *
 * Handles local storage of authentication tokens in ~/.agekey/session.json
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
 * Load session from disk
 * Returns null if no session exists or session is invalid
 */
export function loadSession(): Session | null {
  try {
    if (!existsSync(SESSION_FILE)) {
      return null;
    }

    const content = readFileSync(SESSION_FILE, "utf-8");
    const session = JSON.parse(content) as Session;

    // Check if session is expired
    if (new Date(session.expiresAt) < new Date()) {
      // Session expired, delete it
      clearSession();
      return null;
    }

    return session;
  } catch {
    // Invalid session file, clear it
    clearSession();
    return null;
  }
}

/**
 * Save session to disk with secure permissions
 */
export function saveSession(session: Session): void {
  ensureAgekeyDir();

  const content = JSON.stringify(session, null, 2);
  writeFileSync(SESSION_FILE, content, { mode: 0o600 });

  // Ensure file permissions are correct (600 = owner read/write only)
  try {
    chmodSync(SESSION_FILE, 0o600);
  } catch {
    // chmod may fail on some systems, ignore
  }
}

/**
 * Clear session from disk
 */
export function clearSession(): void {
  try {
    if (existsSync(SESSION_FILE)) {
      writeFileSync(SESSION_FILE, "", { mode: 0o600 });
      // Delete the file
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
