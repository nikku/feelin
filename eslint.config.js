import bpmnIoPlugin from 'eslint-plugin-bpmn-io';

import typescriptPlugin from 'typescript-eslint';

const files = {
  build: [
    '*.js',
    'tasks/*.js'
  ],
  test: [
    'test/**/*.js',
    'test/**/*.ts',
    'test/**/*.cjs'
  ],
  ignored: [
    'dist',
    'tmp'
  ]
};

export default [
  {
    'ignores': files.ignored
  },

  // lib
  ...bpmnIoPlugin.configs.recommended.map(config => {

    return {
      ...config,
      ignores: [
        ...files.build,
        ...files.test
      ]
    };
  }),

  // build + test
  ...bpmnIoPlugin.configs.node.map(config => {

    return {
      ...config,
      files: [
        ...files.build,
        ...files.test
      ]
    };
  }),

  // test
  ...bpmnIoPlugin.configs.mocha.map(config => {

    return {
      ...config,
      files: files.test
    };
  }),

  ...typescriptPlugin.configs.recommended,
  {
    rules: {
      '@typescript-eslint/no-unused-vars': [
        'error', {
          'varsIgnorePattern': '^_',
          'argsIgnorePattern': '^_',
          'caughtErrorsIgnorePattern': '^_'
        }
      ],
      '@typescript-eslint/no-explicit-any': [
        'error', {
          'ignoreRestArgs': true
        }
      ]
    },
    languageOptions: {
      parserOptions: {
        tsconfigRootDir: import.meta.dirname
      }
    }
  },
  {
    rules: {
      '@typescript-eslint/no-unused-expressions': 'off'
    },
    files: files.test
  },
  {
    rules: {
      '@typescript-eslint/no-require-imports': 'off'
    },
    files: [
      '**/*.cjs'
    ]
  }
];