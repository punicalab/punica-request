import js from '@eslint/js';
import globals from 'globals';
import tseslint from 'typescript-eslint';

export default tseslint.config(
  {
    ignores: [
      '**/dist',
      '**/bundled',
      '**/node_modules',
      'coverage',
      'examples/**/public/app.js'
    ]
  },
  js.configs.recommended,
  ...tseslint.configs.recommended,
  {
    languageOptions: {
      globals: { ...globals.browser, ...globals.node }
    },
    rules: {
      // Requests and responses carry what the application sends: the public
      // types say `any` where the library cannot know more
      '@typescript-eslint/no-explicit-any': 'off'
    }
  }
);
