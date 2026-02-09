import { Context, Next } from 'hono';
import { drizzle } from 'drizzle-orm/d1';
import { Env, Variables } from '../../types';

/**
 * データベース接続ミドルウェア
 */
export async function dbMiddleware(c: Context<{ Bindings: Env; Variables: Variables }>, next: Next) {
    const db = drizzle(c.env.DB);
    c.set('db', db);
    await next();
}
