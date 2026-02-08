import { sqliteTable, integer, text } from 'drizzle-orm/sqlite-core';
import { sql } from 'drizzle-orm';

export const memoItems = sqliteTable('memo_item', {
    id: integer('id').primaryKey({ autoIncrement: true }),
    body: text('body').notNull(),
    createdAt: integer('created_at', { mode: 'timestamp' })
        .notNull()
        .default(sql`(unixepoch())`)
});

export type MemoItems = typeof memoItems.$inferSelect;
