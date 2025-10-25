module.exports = {
  extends: [
    'react-app',
    'react-app/jest',
  ],
  rules: {
    'react/react-in-jsx-scope': 'off',
  },
  ignorePatterns: ['build/', 'node_modules/'],
};