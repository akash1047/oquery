# CLAUDE.md

This file provides guidance to Claude Code (claude.ai/code) when working with code in this repository.

## Commands

```sh
deno task test            # run all tests
deno task test:coverage   # run tests with coverage output
deno task check           # type-check mod.ts (entry point)
deno task lint            # lint src/, tests/, mod.ts
deno task fmt             # format in place
deno task fmt:check       # format check (used in CI)
deno task publish:dry     # validate JSR package structure
```

Run a single test file:
```sh
deno test tests/builder_test.ts
```

Run a single test by name:
```sh
deno test --filter "test name" tests/builder_test.ts
```

## Architecture

This is a zero-dependency Deno library (`@oquery/oquery`) published to JSR. The public API is re-exported from `mod.ts`.

### Two-stage fluent builder (`src/builder.ts`)

The API enforces a type-level stage separation:

```
query(data) → QueryInit<T>
  .match(filter) → QueryChain<T>
    .sort() / .limit() / .skip() / .project() → QueryChain<T>  (new instance each time)
    .exec() / .one() / .count()                                 (terminals)
```

- `QueryInit<T>` — entry point; only `.match()` is available (prevents calling refinements before filtering)
- `QueryChain<T>` — immutable; every refinement returns a **new** instance via spread of `ChainState`
- `QueryChain` implements `Symbol.iterator` (delegates to `.exec()`)
- Pipeline execution order: **filter → sort → skip → limit → project**

### Field matching (`src/match.ts`)

`matchesFilter` iterates filter entries with implicit AND. Per-field:
- If matcher is `typeof === "function"` → call as `FieldPredicate(value)`
- Otherwise → strict `===`

`getNestedValue` traverses dot-notation paths (e.g. `"address.city"`).

### `FieldMatch` type (`src/types.ts`)

`FieldMatch` is an **explicit union** of concrete types — not `unknown | fn`. This is intentional: using `unknown` would collapse the union and break `noImplicitAny` inference for predicate lambdas. Object/array entries in the union use reference equality (`===`); for structural matching use dot-notation or predicates.

### Low-level utilities

`src/query.ts`, `src/sort.ts`, `src/project.ts` are standalone functions also exported from `mod.ts` for advanced/functional use. They are used internally by `QueryChain`.

- `sortDocs` — validates direction values at runtime (throws `RangeError` for anything other than `1`/`-1`)
- `applyProjection` — exclusion is implemented via `Object.fromEntries` filter (no `delete`/mutation)
- `limit(0)` returns empty array (differs from MongoDB where `0` means "no limit")
- `count()` on `QueryChain` ignores sort/skip/limit/project

## Key Constraints

- **Strict TypeScript**: `noImplicitAny`, `noImplicitReturns`, `noUnusedLocals`, `noUnusedParameters` — all enabled
- **No mutation**: source arrays and chain state are never mutated
- **`limit`/`skip` validation**: both throw `RangeError` for `NaN`, negative, non-integer, or `Infinity`
- **Test imports**: use bare `"@std/assert"` specifier (pinned via `deno add` in `deno.json` imports map); never `jsr:@std/assert` directly in test files
