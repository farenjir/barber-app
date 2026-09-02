'use server';

import { sql } from '@/db/client';

export interface LogErrorParams {
  source: string;
  path: string;
  message: string;
  stack?: string;
  userId?: number;
}

export async function logError({ source, path, message, stack, userId }: LogErrorParams): Promise<void> {
  try {
    await sql`
      INSERT INTO error_logs (source, path, message, stack, user_id)
      VALUES (${source}, ${path}, ${message}, ${stack || null}, ${userId || null})
    `;
  } catch (err) {
    console.error('Failed to log error to database:', err);
  }
}

export async function getErrorLogs(limit: number = 100) {
  try {
    const logs = await sql`
      SELECT 
        id, 
        created_at, 
        source, 
        path, 
        message, 
        stack, 
        user_id,
        (SELECT name FROM users WHERE id = error_logs.user_id) as user_name
      FROM error_logs
      ORDER BY created_at DESC
      LIMIT ${limit}
    `;
    return logs;
  } catch (err) {
    console.error('Failed to fetch error logs:', err);
    return [];
  }
}
