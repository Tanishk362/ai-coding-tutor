// Local ambient types to satisfy TS for @playwright/test when not installed.
// If you intend to run e2e tests, install dev dependency: npm i -D @playwright/test
// This stub prevents tsc from failing in environments where playwright is absent.
declare module '@playwright/test' {
  export interface Page {}
  export interface TestArgs { page: Page }
  export interface TestAPI { (name: string, fn: (args: TestArgs) => any): void; skip: TestAPI }
  export const test: TestAPI;
  export function expect(actual: any): { toBe(v: any): void };
}
