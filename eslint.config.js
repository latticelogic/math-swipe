import js from '@eslint/js'
import globals from 'globals'
import reactHooks from 'eslint-plugin-react-hooks'
import reactRefresh from 'eslint-plugin-react-refresh'
import tseslint from 'typescript-eslint'
import { defineConfig, globalIgnores } from 'eslint/config'

export default defineConfig([
  // `.claude/worktrees/*` contains transient sub-agent worktree checkouts —
  // each has its own tsconfig.json which confuses typescript-eslint's
  // root-finding logic. Always ignore. `dist` is the build output.
  globalIgnores(['dist', '.claude']),
  {
    files: ['**/*.{ts,tsx}'],
    extends: [
      js.configs.recommended,
      tseslint.configs.recommended,
      reactHooks.configs.flat.recommended,
      reactRefresh.configs.vite,
    ],
    languageOptions: {
      ecmaVersion: 2020,
      globals: globals.browser,
    },
    rules: {
      // eslint-plugin-react-hooks 7.1 promoted the React-Compiler-powered
      // checks to ERRORS in `recommended`. They flag ~20 established effect
      // patterns — mostly in App.tsx, whose refactor is explicitly DEFERRED
      // (owner call 2026-07-24, docs/status.md "Tech health"). Parked at
      // 'warn' so dependencies stay current without a dependency PR forcing
      // that refactor; NEW code should satisfy them (they show in editor +
      // CI logs). Flip to 'error' when the App.tsx hook-extraction lands.
      'react-hooks/set-state-in-effect': 'warn',
      'react-hooks/purity': 'warn',
      'react-hooks/refs': 'warn',
      'react-hooks/preserve-manual-memoization': 'warn',
    },
  },
])
