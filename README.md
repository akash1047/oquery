# oquery

In-memory queries for plain JavaScript and TypeScript arrays — no database required.

## Features

- Fluent chaining API with type-enforced stage separation
- **Two-mode field matching**: exact value (strict equality) or predicate function
- **Dot-notation** for nested fields (`"address.city"`)
- Projection, multi-field sort, skip/limit pagination
- Immutable builder — each refinement step returns a new chain
- Iterable chains (`for...of`, spread)
- Zero dependencies, fully typed

## Installation

**Deno**
```ts
import { query } from "jsr:@akash1047/oquery";
```

**Node.js / Bun**
```sh
npx jsr add @akash1047/oquery
# or
bunx jsr add @akash1047/oquery
```

## Usage

```ts
import { query } from "@akash1047/oquery";

const users = [
  { name: "Alice", age: 30, role: "admin", address: { city: "NYC" } },
  { name: "Bob",   age: 25, role: "user",  address: { city: "LA"  } },
  { name: "Carol", age: 35, role: "user",  address: { city: "NYC" } },
  { name: "Dave",  age: 22, role: "user",  address: { city: "Chicago" } },
];
```

### Two-stage API

`query(data)` returns a `QueryInit` that **only** exposes `.match()`.
Calling it enters `QueryChain` where refinement and terminal methods become available.
This is enforced at the TypeScript type level — `.sort()`, `.limit()`, etc. are not
accessible until after `.match()`.

```
query(data)
  .match(filter)    → QueryChain  (pass {} to match all documents)
    .sort(spec)     → QueryChain
    .limit(n)       → QueryChain
    .skip(n)        → QueryChain
    .project(spec)  → QueryChain
    .exec()         → T[]              ← terminal
    .one()          → T | undefined    ← terminal
    .count()        → number           ← terminal
```

### Matching

Each field in the filter can be an **exact value** (strict `===`) or a **predicate function**:

```ts
// Exact value — strict equality
query(users).match({ role: "admin" }).exec();
query(users).match({ age: 30 }).exec();
query(users).match({ active: true }).exec();

// Predicate function — full JavaScript power
query(users).match({ age: (v) => (v as number) > 18 }).exec();
query(users).match({ name: (v) => (v as string).startsWith("A") }).exec();
query(users).match({ age: (v) => (v as number) >= 25 && (v as number) <= 35 }).exec();
query(users).match({ email: (v) => /^[^@]+@[^@]+$/.test(v as string) }).exec();
query(users).match({ tags: (v) => (v as string[]).includes("admin") }).exec();

// Mixed — both modes in the same filter (implicit AND across fields)
query(users).match({ role: "user", age: (v) => (v as number) >= 25 }).exec();

// Dot-notation for nested fields
query(users).match({ "address.city": "NYC" }).exec();
query(users).match({ "address.city": (v) => v !== "LA" }).exec();

// Empty filter — matches everything
query(users).match({}).exec();
```

### Sort, Skip, Limit

```ts
query(users).match({}).sort({ age: -1 }).exec();
query(users).match({}).sort({ role: 1, age: -1 }).exec();

// Pagination (page 2, 10 per page)
query(users).match({}).sort({ name: 1 }).skip(10).limit(10).exec();
```

### Projection

```ts
// Include only specific fields
query(users).match({}).project({ name: 1, age: 1 }).exec();

// Exclude a field
query(users).match({}).project({ address: 0 }).exec();
```

### Terminal methods

```ts
// Execute pipeline, return array
query(users).match({ role: "user" }).sort({ age: -1 }).exec();

// Return first result (or undefined)
query(users).match({ age: (v) => (v as number) > 30 }).one();

// Count matching documents (ignores sort / skip / limit)
query(users).match({ role: "user" }).count(); // 3
```

### Iterable chains

`QueryChain` implements `Symbol.iterator` so you can spread or loop without `.exec()`:

```ts
const admins = [...query(users).match({ role: "admin" })];

for (const user of query(users).match({}).sort({ name: 1 })) {
  console.log(user.name);
}
```

### Immutable builder

Each refinement method returns a **new** chain — reusing intermediate chains is safe:

```ts
const base = query(users).match({ role: "user" });
const page1 = base.sort({ name: 1 }).skip(0).limit(5);
const page2 = base.sort({ name: 1 }).skip(5).limit(5);

page1.exec(); // first 5 users
page2.exec(); // next 5 users — base chain unchanged
```

## Pipeline order

```
filter → sort → skip → limit → project
```

## API Reference

### `query(data)`

Creates a `QueryInit` builder. `data` is never mutated.

### `QueryInit<T>`

| Method | Returns | Description |
|--------|---------|-------------|
| `.match(filter)` | `QueryChain<T>` | Filter with exact values and/or predicates. Pass `{}` to match all. |

### `QueryChain<T>`

| Method | Returns | Description |
|--------|---------|-------------|
| `.sort(spec)` | `QueryChain<T>` | Set sort order (`1` asc, `-1` desc) |
| `.limit(n)` | `QueryChain<T>` | Set max results |
| `.skip(n)` | `QueryChain<T>` | Set offset |
| `.project(spec)` | `QueryChain<T>` | Include (`1`) or exclude (`0`) fields |
| `.exec()` | `T[]` | **Terminal** — run pipeline, return results |
| `.one()` | `T \| undefined` | **Terminal** — run pipeline, return first |
| `.count()` | `number` | **Terminal** — count matches |

### `FieldMatch` type

```ts
type FieldMatch =
  | ((value: unknown) => boolean)   // predicate function
  | string | number | boolean        // primitives (exact ===)
  | null | undefined                 // null / missing field
  | Record<string, unknown>          // object (exact === reference)
  | unknown[];                       // array (exact === reference)
```

> For nested object or array matching, prefer predicates or dot-notation over direct object equality.

## Development

```sh
deno task test          # run tests
deno task check         # type check
deno task lint          # lint
deno task fmt           # format
deno task publish:dry   # validate JSR package structure
```

## License

MIT © akash1047
