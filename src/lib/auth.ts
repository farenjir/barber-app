import { sql } from '@/db/client';
import type { User } from '@/db/client';

/**
 * Generate a random token
 */
function generateToken(): string {
  const array = new Uint8Array(32);
  crypto.getRandomValues(array);
  return Array.from(array, (byte) => byte.toString(16).padStart(2, '0')).join('');
}

/**
 * Hash a token for storage
 */
async function hashToken(token: string): Promise<string> {
  const encoder = new TextEncoder();
  const data = encoder.encode(token);
  const hashBuffer = await crypto.subtle.digest('SHA-256', data);
  const hashArray = Array.from(new Uint8Array(hashBuffer));
  return hashArray.map((b) => b.toString(16).padStart(2, '0')).join('');
}

/**
 * Create a magic link for a user
 * @returns The plain token (to be sent in the URL)
 */
export async function createMagicLink(userId: number): Promise<string> {
  const token = generateToken();
  const tokenHash = await hashToken(token);
  const expiresAt = new Date(Date.now() + 10 * 60 * 1000); // 10 minutes

  await sql`
    INSERT INTO magic_links (token_hash, user_id, expires_at)
    VALUES (${tokenHash}, ${userId}, ${expiresAt.toISOString()})
  `;

  return token;
}

/**
 * Verify and consume a magic link token
 * @returns The user if valid, null otherwise
 */
export async function verifyMagicLink(token: string): Promise<User | null> {
  const tokenHash = await hashToken(token);
  const now = new Date();

  const links = await sql`
    SELECT ml.*, u.id as user_id, u.telegram_id, u.role, u.name, u.phone, u.is_active, u.created_at
    FROM magic_links ml
    JOIN users u ON ml.user_id = u.id
    WHERE ml.token_hash = ${tokenHash}
      AND ml.expires_at > ${now.toISOString()}
      AND ml.used_at IS NULL
      AND u.is_active = true
  ` as any[];

  if (links.length === 0) {
    return null;
  }

  const link = links[0];

  // Mark the link as used
  await sql`
    UPDATE magic_links
    SET used_at = NOW()
    WHERE token_hash = ${tokenHash}
  `;

  return {
    id: link.user_id,
    telegram_id: link.telegram_id,
    role: link.role,
    name: link.name,
    phone: link.phone,
    is_active: link.is_active,
    created_at: link.created_at,
  };
}

/**
 * Create a session for a user
 * @returns The plain session token (to be set in cookie)
 */
export async function createSession(userId: number): Promise<string> {
  const token = generateToken();
  const tokenHash = await hashToken(token);
  const expiresAt = new Date(Date.now() + 7 * 24 * 60 * 60 * 1000); // 7 days

  await sql`
    INSERT INTO sessions (token_hash, user_id, expires_at)
    VALUES (${tokenHash}, ${userId}, ${expiresAt.toISOString()})
  `;

  return token;
}

/**
 * Verify a session token
 * @returns The user if valid, null otherwise
 */
export async function verifySession(token: string): Promise<User | null> {
  const tokenHash = await hashToken(token);
  const now = new Date();

  const sessions = await sql`
    SELECT s.*, u.id as user_id, u.telegram_id, u.role, u.name, u.phone, u.is_active, u.created_at
    FROM sessions s
    JOIN users u ON s.user_id = u.id
    WHERE s.token_hash = ${tokenHash}
      AND s.expires_at > ${now.toISOString()}
      AND u.is_active = true
  ` as any[];

  if (sessions.length === 0) {
    return null;
  }

  const session = sessions[0];

  return {
    id: session.user_id,
    telegram_id: session.telegram_id,
    role: session.role,
    name: session.name,
    phone: session.phone,
    is_active: session.is_active,
    created_at: session.created_at,
  };
}

/**
 * Delete a session (logout)
 */
export async function deleteSession(token: string): Promise<void> {
  const tokenHash = await hashToken(token);
  await sql`
    DELETE FROM sessions WHERE token_hash = ${tokenHash}
  `;
}

/**
 * Clean up expired magic links and sessions
 */
export async function cleanupExpired(): Promise<void> {
  const now = new Date();
  
  await sql`
    DELETE FROM magic_links WHERE expires_at < ${now.toISOString()}
  `;
  
  await sql`
    DELETE FROM sessions WHERE expires_at < ${now.toISOString()}
  `;
}

/**
 * Get or create a user by telegram ID
 */
export async function getOrCreateUser(
  telegramId: number,
  name: string,
  phone?: string
): Promise<User> {
  // Try to get existing user
  const existing = await sql`
    SELECT * FROM users WHERE telegram_id = ${telegramId}
  ` as User[];

  if (existing.length > 0) {
    return existing[0];
  }

  // Create new customer user
  const [user] = await sql`
    INSERT INTO users (telegram_id, role, name, phone, is_active)
    VALUES (${telegramId}, 'customer', ${name}, ${phone || null}, true)
    RETURNING *
  ` as User[];

  return user;
}

/**
 * Get user by telegram ID
 */
export async function getUserByTelegramId(telegramId: number): Promise<User | null> {
  const users = await sql`
    SELECT * FROM users WHERE telegram_id = ${telegramId}
  ` as User[];

  return users.length > 0 ? users[0] : null;
}

/**
 * Get barber for a user
 */
export async function getBarberByUserId(userId: number) {
  const barbers = await sql`
    SELECT * FROM barbers WHERE user_id = ${userId} AND is_active = true
  ` as any[];

  return barbers.length > 0 ? barbers[0] : null;
}

/**
 * Get all active barbers
 */
export async function getActiveBarbers() {
  return await sql`
    SELECT b.*, u.name as user_name, u.telegram_id
    FROM barbers b
    JOIN users u ON b.user_id = u.id
    WHERE b.is_active = true AND u.is_active = true
    ORDER BY b.display_name
  ` as any[];
}
