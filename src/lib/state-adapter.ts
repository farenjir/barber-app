import type { StateAdapter, Lock, QueueEntry } from 'chat';
import { sql } from '../db/client';

/**
 * PostgreSQL state adapter for Chat SDK.
 * Stores conversation state and handles deduplication.
 */
export function createPostgresState(): StateAdapter {
  return {
    async connect(): Promise<void> {
      // No-op: Neon client doesn't need explicit connection
    },

    async disconnect(): Promise<void> {
      // No-op: Neon client doesn't need explicit disconnection
    },

    async get<T = unknown>(key: string): Promise<T | null> {
      try {
        const now = new Date();
        const rows = await sql`
          SELECT value FROM chat_state
          WHERE key = ${key}
          AND (expires_at IS NULL OR expires_at > ${now.toISOString()})
        ` as unknown as Array<{ value: string }>;
        if (rows.length === 0) return null;
        const value = rows[0].value;
        return (typeof value === 'string' ? JSON.parse(value) : value) as T;
      } catch (error) {
        console.error('State get error:', error);
        return null;
      }
    },

    async set<T = unknown>(key: string, value: T, ttlMs?: number): Promise<void> {
      try {
        const now = new Date();
        const expiresAt = ttlMs ? new Date(Date.now() + ttlMs) : null;
        const valueStr = typeof value === 'string' ? value : JSON.stringify(value);
        
        await sql`
          INSERT INTO chat_state (key, value, expires_at, updated_at)
          VALUES (${key}, ${valueStr}, ${expiresAt ? expiresAt.toISOString() : null}, ${now.toISOString()})
          ON CONFLICT (key)
          DO UPDATE SET
            value = ${valueStr},
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

    async setIfNotExists(key: string, value: unknown, ttlMs?: number): Promise<boolean> {
      try {
        const expiresAt = ttlMs ? new Date(Date.now() + ttlMs) : null;
        const valueStr = typeof value === 'string' ? value : JSON.stringify(value);
        const now = new Date();
        
        const result = await sql`
          INSERT INTO chat_state (key, value, expires_at, created_at, updated_at)
          VALUES (${key}, ${valueStr}, ${expiresAt ? expiresAt.toISOString() : null}, ${now.toISOString()}, ${now.toISOString()})
          ON CONFLICT (key) DO NOTHING
          RETURNING key
        ` as unknown as Array<{ key: string }>;
        
        return result.length > 0;
      } catch (error) {
        console.error('State setIfNotExists error:', error);
        return false;
      }
    },

    async acquireLock(threadId: string, ttlMs: number): Promise<Lock | null> {
      try {
        const lockKey = `lock:${threadId}`;
        const token = `${Date.now()}-${Math.random()}`;
        const expiresAt = Date.now() + ttlMs;
        const expiresAtDate = new Date(expiresAt);
        
        const result = await sql`
          INSERT INTO chat_state (key, value, expires_at)
          VALUES (${lockKey}, ${token}, ${expiresAtDate.toISOString()})
          ON CONFLICT (key) DO NOTHING
          RETURNING key
        ` as unknown as Array<{ key: string }>;
        
        if (result.length > 0) {
          return { threadId, token, expiresAt };
        }
        
        return null;
      } catch (error) {
        console.error('Lock acquire error:', error);
        return null;
      }
    },

    async releaseLock(lock: Lock): Promise<void> {
      try {
        const lockKey = `lock:${lock.threadId}`;
        await sql`
          DELETE FROM chat_state
          WHERE key = ${lockKey}
          AND value = ${lock.token}
        `;
      } catch (error) {
        console.error('Lock release error:', error);
      }
    },

    async extendLock(lock: Lock, ttlMs: number): Promise<boolean> {
      try {
        const lockKey = `lock:${lock.threadId}`;
        const newExpiresAt = new Date(Date.now() + ttlMs);
        
        const result = await sql`
          UPDATE chat_state
          SET expires_at = ${newExpiresAt.toISOString()}
          WHERE key = ${lockKey}
          AND value = ${lock.token}
          RETURNING key
        ` as unknown as Array<{ key: string }>;
        
        return result.length > 0;
      } catch (error) {
        console.error('Lock extend error:', error);
        return false;
      }
    },

    async forceReleaseLock(threadId: string): Promise<void> {
      try {
        const lockKey = `lock:${threadId}`;
        await sql`DELETE FROM chat_state WHERE key = ${lockKey}`;
      } catch (error) {
        console.error('Force lock release error:', error);
      }
    },

    async subscribe(threadId: string): Promise<void> {
      const key = `subscription:${threadId}`;
      await this.set(key, true);
    },

    async unsubscribe(threadId: string): Promise<void> {
      const key = `subscription:${threadId}`;
      await this.delete(key);
    },

    async isSubscribed(threadId: string): Promise<boolean> {
      const key = `subscription:${threadId}`;
      const value = await this.get(key);
      return value === true;
    },

    async enqueue(threadId: string, entry: QueueEntry, maxSize: number): Promise<number> {
      const key = `queue:${threadId}`;
      await this.appendToList(key, entry, { maxLength: maxSize });
      const list = await this.getList(key);
      return list.length;
    },

    async dequeue(threadId: string): Promise<QueueEntry | null> {
      const key = `queue:${threadId}`;
      const list = await this.getList<QueueEntry>(key);
      if (list.length === 0) return null;
      
      const entry = list[0];
      const remaining = list.slice(1);
      await this.set(key, remaining);
      return entry;
    },

    async queueDepth(threadId: string): Promise<number> {
      const key = `queue:${threadId}`;
      const list = await this.getList(key);
      return list.length;
    },

    async appendToList(
      key: string,
      value: unknown,
      options?: { maxLength?: number; ttlMs?: number }
    ): Promise<void> {
      const list = await this.getList(key);
      list.push(value);
      
      const maxLength = options?.maxLength ?? Infinity;
      const trimmed = list.slice(-maxLength);
      
      await this.set(key, trimmed, options?.ttlMs);
    },

    async getList<T = unknown>(key: string): Promise<T[]> {
      const value = await this.get<T[]>(key);
      return value ?? [];
    },
  };
}
