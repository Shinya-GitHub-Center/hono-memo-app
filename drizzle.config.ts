import { defineConfig } from 'drizzle-kit';

export default defineConfig({
    schema: './src/middleware/db/schema.ts',
    out: './src/middleware/db/migrations',
    verbose: true,
    strict: true,
    dialect: 'sqlite',
});
