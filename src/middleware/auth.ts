import { Context, Next } from 'hono';
import { basicAuth } from 'hono/basic-auth';
import { Env, Variables } from '../types';

/**
 * 認証ミドルウェア
 * 本番環境（IS_PRODが設定されている場合）のみ実行される
 */
export async function authMiddleware(c: Context<{ Bindings: Env; Variables: Variables }>, next: Next) {
    // IS_PRODが設定されていない場合は認証をスキップ（開発環境）
    if (!c.env.IS_PROD) {
        await next();
        return;
    }

    // 本番環境の場合はBasic認証を実行
    const username = c.env.AUTH_USERNAME;
    const password = c.env.AUTH_PASSWORD;

    if (!username || !password) {
        return c.text('認証情報が設定されていません', 500);
    }

    const auth = basicAuth({
        username,
        password,
    });

    return auth(c, next);
}
