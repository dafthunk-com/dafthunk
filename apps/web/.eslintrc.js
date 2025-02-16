module.exports = {
  extends: ["@repo/eslint-config/next.js"],
  rules: {
    "@typescript-eslint/no-unused-vars": "off",
    "@typescript-eslint/no-explicit-any": "off",
    "react-hooks/exhaustive-deps": "off",
    "@typescript-eslint/ban-types": "off",
    "@typescript-eslint/no-empty-interface": "off"
  },
  ignorePatterns: ["**/*.test.ts"]
}; 