import { defineProject } from 'vitest/config';

export default defineProject({
  test: {
    name: 'ui',
    environment: 'jsdom',
    include: ['test/**/*.test.tsx'],
  },
  esbuild: { jsx: 'automatic' },
});
