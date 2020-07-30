module.exports = {
  root: true,
  parserOptions: {
    sourceType: 'module',
  },
  env: {
    node: true,
  },
  extends: [
    'valantic'
  ],
  // add your custom rules here
  rules: {
    'require-jsdoc': [2, {
      require: {
        FunctionDeclaration: true,
        MethodDefinition: true,
        ClassDeclaration: true,
        ArrowFunctionExpression: true,
        FunctionExpression: false
      }
    }],
  },
  globals: {}
};
