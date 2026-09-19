import { defineConfig } from 'vite'
import { configDefaults } from 'vitest/config'
import react from '@vitejs/plugin-react'

export default defineConfig({
  plugins: [react()],
  test: {
    environment: 'jsdom',
    setupFiles: ['./vitest.setup.js'],
    // .claude/ holds agent files and git worktrees of other branches; without
    // this, `npm test` also runs the worktree's copy of the whole suite.
    exclude: [...configDefaults.exclude, '.claude/**'],
  },
})
