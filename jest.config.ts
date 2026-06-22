import type { Config } from "jest";
import nextJest from "next/jest.js";

const createJestConfig = nextJest({ dir: "./" });

const config: Config = {
  coverageProvider: "v8",
  testEnvironment: "node",
  setupFilesAfterEnv: ["<rootDir>/jest.setup.ts"],
  moduleNameMapper: {
    "^@/(.*)$": "<rootDir>/src/$1",
  },
  testMatch: [
    "<rootDir>/__tests__/unit/**/*.test.ts",
    "<rootDir>/__tests__/unit/**/*.test.tsx",
    "<rootDir>/__tests__/unit/**/*.test.tsx",
    "<rootDir>/__tests__/unit/components/**/*.test.tsx",
    "<rootDir>/__tests__/unit/hooks/**/*.test.ts",
    "<rootDir>/__tests__/integration/**/*.test.ts",
  ],
  testPathIgnorePatterns: [
    "<rootDir>/node_modules/",
    "<rootDir>/.next/",
    "<rootDir>/__tests__/e2e/",
  ],
  // Exclude .next and .kilo worktrees from Haste module map
  modulePathIgnorePatterns: ["<rootDir>/.next/", "<rootDir>/.kilo/"],
  collectCoverageFrom: [
    "src/**/*.{ts,tsx}",
    "!src/**/*.d.ts",
    "!src/app/layout.tsx",
    "!src/app/globals.css",
  ],
};

export default createJestConfig(config);
