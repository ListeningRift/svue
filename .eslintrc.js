module.exports = {
  parser: '@typescript-eslint/parser',
  parserOptions: {
    sourceType: 'module'
  },
  extends: [
    'plugin:@typescript-eslint/recommended'
  ],
  env: {
    browser: true
  },
  plugins: ['@typescript-eslint'],
  rules: {
    'no-var': 1,
    'no-with': 2,
    'no-caller': 1,
    'no-debugger': 2,
    'no-const-assign': 2,
    'no-constant-condition': 2,
    'no-redeclare': 2,
    'no-dupe-keys': 2,
    'no-dupe-args': 2,
    'no-duplicate-case': 2,
    'no-unused-vars': [
      'error',
      { varsIgnorePattern: '.*', args: 'none' }
    ],
    'no-empty': 1,
    'no-extra-semi': 2,
    'no-func-assign': 2,
    'no-multi-spaces': 1,
    'no-multiple-empty-lines': [1, { 'max': 3 }],
    'no-unneeded-ternary': 1,
    'camelcase': 2,
    'comma-dangle': [2, 'never'],
    'quotes': [1, 'single'],
    'prefer-const': 0,
    'indent': [2, 2],
    'semi': [1, 'never'],
    'no-unexpected-multiline': 2,
    'key-spacing': [
      1,
      { 'beforeColon': false, 'afterColon': true }
    ],
    '@typescript-eslint/no-explicit-any': 0,
    "@typescript-eslint/no-non-null-assertion": 0,
    '@typescript-eslint/no-this-alias': 0,
    '@typescript-eslint/no-empty-function': 0,
    '@typescript-eslint/ban-types': 0
  }
}
