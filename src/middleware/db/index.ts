import { Context, Next } from 'hono';
import { drizzle } from 'drizzle-orm/d1';
import { Env, Variables } from '../../types';

/**
 * データベース接続ミドルウェア
 */
export async function dbMiddleware(c: Context<{ Bindings: Env; Variables: Variables }>, next: Next) {
    try {
        const db = drizzle(c.env.DB);
        c.set('db', db);
        await next();
    } catch (error) {
        console.error('Initializing database failed:', error);
        return c.text('Database not found', 503);
    }
}
