// Minimal ambient Jest globals for the TypeScript checker (build + lint) and nothing else —
// babel-jest strips types at test-run time, so these don't need to be precise.
//
// @types/jest is deliberately not used for this: its ambient declarations pull in
// `pretty-format` -> `@jest/schemas` -> `@sinclair/typebox`, and typebox's source uses syntax
// this project's TypeScript version (3.9.5, per tsconfig's "typescript": "^3.7.5") can't parse,
// which breaks `npm run build`'s type-checker (fork-ts-checker runs synchronously and fails
// the build on any error in production mode).
declare function describe(name: string, fn: () => void): void;
declare namespace describe {
  function each<T>(cases: readonly T[]): (name: string, fn: (arg: T) => void) => void;
}
declare function it(name: string, fn: () => void | Promise<void>): void;
declare function beforeEach(fn: () => void | Promise<void>): void;
declare function afterEach(fn: () => void | Promise<void>): void;
declare function expect(actual: any): any;
