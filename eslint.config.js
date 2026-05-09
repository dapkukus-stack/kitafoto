// eslint.config.js — ESLint v10 Flat Config (CommonJS format)
// Kompatibel dengan: ESLint v10+, tanpa plugin external
// Tidak butuh @eslint/js — menggunakan rules built-in langsung

"use strict";

/** Globals untuk React Native environment */
const rnGlobals = {
  require:         "readonly",
  module:          "readonly",
  exports:         "readonly",
  __DEV__:         "readonly",
  __dirname:       "readonly",
  __filename:      "readonly",
  process:         "readonly",
  Buffer:          "readonly",
  setTimeout:      "readonly",
  clearTimeout:    "readonly",
  setInterval:     "readonly",
  clearInterval:   "readonly",
  fetch:           "readonly",
  console:         "readonly",
  FormData:        "readonly",
  AbortController: "readonly",
  AbortSignal:     "readonly",
  URLSearchParams:  "readonly",
  TextEncoder:     "readonly",
  atob:            "readonly",
  btoa:            "readonly",
  crypto:          "readonly",
  Promise:         "readonly",
  Map:             "readonly",
  Set:             "readonly",
  Uint8Array:      "readonly",
  ArrayBuffer:     "readonly",
  Response:        "readonly",
  URL:             "readonly",
  StyleSheet:      "readonly",
  React:           "readonly",
  globalThis:      "readonly",
};

/** @type {import("eslint").Linter.Config[]} */
module.exports = [
  /* ─── Global ignores ─────────────────────────────────────── */
  {
    ignores: [
      "node_modules/**",
      "android/**",
      "ios/**",
      "dist/**",
      "build/**",
      ".expo/**",
      ".tooling-test/**",
      "**/*.generated.*",
    ],
  },

  /* ─── Source files (.ts/.tsx/.js) ────────────────────────── */
  {
    files: ["src/**/*.{ts,tsx,js,jsx}"],
    rules: {
      /* Dimatikan karena TypeScript menangani sendiri */
      "no-undef":            "off",
      "no-unused-vars":      "off",

      /* Style rules ringan */
      "no-var":              "error",
      "prefer-const":        "warn",
      "no-duplicate-imports":"error",
      "eqeqeq":             ["warn", "always", { "null": "ignore" }],
      "no-empty":           "warn",
      "no-constant-condition":"warn",
      "no-console":          "off",

      /* Error-prone patterns */
      "no-self-assign":      "error",
      "no-unreachable":      "error",
      "no-fallthrough":      "error",
    },
    languageOptions: {
      ecmaVersion: 2022,
      sourceType:  "module",
      globals:     rnGlobals,
    },
  },

  /* ─── Config / build files ────────────────────────────────── */
  {
    files: ["babel.config.js"],
    rules: {
      "no-undef": "off",
      "no-var":   "off",
    },
    languageOptions: {
      sourceType: "commonjs",
      globals: {
        module:    "readonly",
        require:   "readonly",
        __dirname: "readonly",
        exports:   "readonly",
      },
    },
  },
];
