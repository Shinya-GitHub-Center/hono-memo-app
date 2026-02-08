import { D1Database } from '@cloudflare/workers-types';
import { DrizzleD1Database } from 'drizzle-orm/d1';

export type Env = {
    DB: D1Database;
    IS_PROD?: string;
    AUTH_USERNAME?: string;
    AUTH_PASSWORD?: string;
};

export type Variables = {
    db: DrizzleD1Database;
};
