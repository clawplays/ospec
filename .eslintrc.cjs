module.exports = {
  root: true,
  ignorePatterns: ["dist/**", "node_modules/**"],
  overrides: [
    {
      files: ["*.cjs", "scripts/**/*.js"],
      env: {
        es2022: true,
        node: true,
      },
      parserOptions: {
        ecmaVersion: "latest",
        sourceType: "script",
      },
      extends: ["eslint:recommended"],
    },
    {
      files: ["tests/**/*.mjs"],
      env: {
        es2022: true,
        node: true,
      },
      parserOptions: {
        ecmaVersion: "latest",
        sourceType: "module",
      },
      extends: ["eslint:recommended"],
    },
  ],
};
