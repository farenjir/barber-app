import type { StateAdapter } from 'chat';
import { sql } from '../db/client';

/**
 * PostgreSQL state adapter for Chat SDK.
 * Stores conversation state and handles deduplication.
 */
export function createPostgresState(): StateAdapter {
  return {
    async get(key: string): Promise<string | null> {
      try {
        const now = new Date();
        const rows = await sql`
          SELECT value FROM chat_state
          WHERE key = ${key}
          AND (expires_at IS NULL OR expires_at > ${now.toISOString()})
        `;
        return rows.length > 0 ? rows[0].value : null;
      } catch (error) {
        console.error('State get error:', error);
        return null;
      }
    },

    async set(key: string, value: string, ttlMs?: number): Promise<void> {
      try {
        const now = new Date();
        const expiresAt = ttlMs ? new Date(Date.now() + ttlMs) : null;
        
        await sql`
          INSERT INTO chat_state (key, value, expires_at, updated_at)
          VALUES (${key}, ${value}, ${expiresAt ? expiresAt.toISOString() : null}, ${now.toISOString()})
          ON CONFLICT (key)
          DO UPDATE SET
            value = ${value},
            expires_at = ${expiresAt ? expiresAt.toISOString() : null},
            updated_at = ${now.toISOString()}
        `;
      } catch (error) {
        console.error('State set error:', error);
        throw error;
      }
    },

    async delete(key: string): Promise<void> {
      try {
        await sql`DELETE FROM chat_state WHERE key = ${key}`;
      } catch (error) {
        console.error('State delete error:', error);
      }
    },

    async lock(key: string, ttlMs: number): Promise<boolean> {
      try {
        const lockKey = `lock:${key}`;
        const expiresAt = new Date(Date.now() + ttlMs);
        const now = new Date();
        
        // Try to acquire lock
        const result = await sql`
          INSERT INTO chat_state (key, value, expires_at)
          VALUES (${lockKey}, ${'1'}, ${expiresAt.toISOString()})
          ON CONFLICT (key) DO NOTHING
          RETURNING key
        `;
        
        if (result.length > 0) {
          return true;
        }
        
        // Check if existing lock is expired
        const existing = await sql`
          SELECT expires_at FROM chat_state
          WHERE key = ${lockKey}
          AND expires_at <= ${now.toISOString()}
        `;
        
        if (existing.length > 0) {
          await sql`DELETE FROM chat_state WHERE key = ${lockKey}`;
          return this.lock(key, ttlMs);
        }
        
        return false;
      } catch (error) {
        console.error('Lock error:', error);
        return false;
      }
    },

    async unlock(key: string): Promise<void> {
      try {
        const lockKey = `lock:${key}`;
        await sql`DELETE FROM chat_state WHERE key = ${lockKey}`;
      } catch (error) {
        console.error('Unlock error:', error);
      }
    },
  };
}
