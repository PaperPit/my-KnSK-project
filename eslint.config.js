import js from '@eslint/js';
import globals from 'globals';

export default [
  js.configs.recommended,
  {
    files: ['src/**/*.js', 'Code.js', 'config.js'],
    languageOptions: {
      ecmaVersion: 2022,
      sourceType: 'script',
      globals: {
        ...globals.browser,
        ...globals.node,
        CONFIG: 'readonly',
        Chart: 'readonly',
        ChartDataLabels: 'readonly',
        echarts: 'readonly',
        google: 'readonly',
        HtmlService: 'readonly',
        SpreadsheetApp: 'readonly',
        CacheService: 'readonly',
        ScriptApp: 'readonly',
        Utilities: 'readonly',
        Session: 'readonly',
        Logger: 'readonly',
        PLAN_YEAR: 'readonly',
        PLAN_WEEKLY: 'readonly',
        PLAN_THRESHOLD: 'readonly',
        KnSKLib: 'readonly',
        DashboardPhase1: 'readonly',
        DashboardPhase2: 'readonly',
        GoogleAppsScriptAdapter: 'readonly',
      },
    },
    rules: {
      'no-unused-vars': ['warn', { argsIgnorePattern: '^_', caughtErrorsIgnorePattern: '^_' }],
      'no-console': 'off',
      'no-empty': ['error', { allowEmptyCatch: true }],
    },
  },
  {
    files: ['src/lib/kpiCalculator.js'],
    languageOptions: {
      globals: {
        toNum: 'readonly',
        extractNumber: 'readonly',
        extractFact: 'readonly',
      },
    },
  },
  {
    files: ['src/server/migrations.js'],
    languageOptions: {
      globals: {
        getPlanMapping2026: 'readonly',
        getArchiveSheet_: 'readonly',
        invalidateArchiveListCache_: 'readonly',
      },
    },
  },
  {
    files: ['src/dashboard/*.js', 'src/core/GoogleAppsScriptAdapter.js', 'src/lib/*.js', 'src/server/*.js'],
    rules: {
      'no-redeclare': 'off',
    },
  },
  {
    files: ['src/server/*.js'],
    rules: {
      'no-unused-vars': 'off',
    },
  },
  {
    files: ['src/pages/editor.js'],
    rules: {
      'no-useless-escape': 'off',
    },
  },
  {
    files: ['scripts/**/*.mjs'],
    languageOptions: {
      ecmaVersion: 2022,
      sourceType: 'module',
      globals: globals.node,
    },
  },
  {
    ignores: [
      'node_modules/',
      'DashboardPhase*.html',
      'Ui*.html',
      '*Page.html',
      'LibBundle.html',
      'GASAdapter.html',
      '*Styles.html',
    ],
  },
];
