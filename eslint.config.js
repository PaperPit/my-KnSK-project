import js from '@eslint/js';
import globals from 'globals';

const browserGlobals = {
  ...globals.browser,
  CONFIG: 'readonly',
  Chart: 'readonly',
  ChartDataLabels: 'readonly',
  echarts: 'readonly',
  google: 'readonly',
  PLAN_YEAR: 'readonly',
  PLAN_WEEKLY: 'readonly',
  PLAN_THRESHOLD: 'readonly',
};

const gasGlobals = {
  ...globals.browser,
  CONFIG: 'readonly',
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
};

export default [
  js.configs.recommended,
  {
    files: ['src/**/*.js'],
    languageOptions: {
      ecmaVersion: 2022,
      sourceType: 'module',
      globals: browserGlobals,
    },
    rules: {
      'no-unused-vars': ['warn', { argsIgnorePattern: '^_', caughtErrorsIgnorePattern: '^_' }],
      'no-console': 'off',
      'no-empty': ['error', { allowEmptyCatch: true }],
    },
  },
  {
    files: ['Code.js', 'config.js'],
    languageOptions: {
      ecmaVersion: 2022,
      sourceType: 'script',
      globals: gasGlobals,
    },
    rules: {
      'no-unused-vars': ['warn', { argsIgnorePattern: '^_', caughtErrorsIgnorePattern: '^_' }],
      'no-console': 'off',
      'no-empty': ['error', { allowEmptyCatch: true }],
    },
  },
  {
    files: ['src/pages/*.js', 'src/dashboard/*.js'],
    languageOptions: {
      globals: {
        ...browserGlobals,
        DashboardPhase1: 'readonly',
        DashboardPhase2: 'readonly',
      },
    },
  },
  {
    files: ['src/core/GoogleAppsScriptAdapter.js'],
    languageOptions: {
      globals: {
        ...browserGlobals,
        Logger: 'readonly',
      },
    },
  },
  {
    files: ['src/server/*.js'],
    languageOptions: {
      globals: {
        ...gasGlobals,
        module: 'readonly',
      },
    },
    rules: {
      'no-unused-vars': 'off',
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
    files: ['src/dashboard/*.js', 'src/core/GoogleAppsScriptAdapter.js', 'src/lib/*.js'],
    rules: {
      'no-redeclare': 'off',
    },
  },
  {
    files: ['src/server/*.js'],
    rules: {
      'no-redeclare': 'off',
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
