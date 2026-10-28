import { defineProject } from 'vitest/config';

export default defineProject({
  test: {
    name: 'desk',
    environment: 'jsdom',
    include: ['test/**/*.test.ts', 'test/**/*.test.tsx'],
  },
  esbuild: { jsx: 'automatic' },
});
