import { defineConfig } from 'vitest/config';
import path from 'path';
import { fileURLToPath } from 'url';

const __dirname = path.dirname(fileURLToPath(import.meta.url));
const repoRoot = path.resolve(__dirname, '..');

export default defineConfig({
  test: {
    root: repoRoot,
    include: [
      'tests/**/*.test.ts',
      'tests/**/*.spec.ts',
    ],
    exclude: ['**/node_modules/**', '**/dist/**'],
    globals: true,
    testTimeout: 30000,
    pool: 'forks',
    reporters: ['verbose'],
  },
  resolve: {
    extensions: ['.ts', '.tsx', '.js', '.jsx', '.json'],
    alias: {
      '@exchange-lab/shared': path.resolve(__dirname, 'shared/src/index.ts'),
      '@exchange-lab/engine': path.resolve(__dirname, 'engine/src/trade/Snowflake.ts'),
    },
  },
});
