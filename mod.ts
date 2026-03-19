/**
 * @module
 *
 * **oquery** — MongoDB/Mongoose-style queries for plain JavaScript/TypeScript arrays.
 *
 * Query any array of objects using a fluent chaining API, without a database.
 *
 * ## Chaining API (primary)
 *
 * ```ts
 * import { query } from "@akash1047/oquery";
 *
 * const users = [
 *   { name: "Alice", age: 30, role: "admin" },
 *   { name: "Bob",   age: 25, role: "user"  },
 *   { name: "Carol", age: 35, role: "user"  },
 * ];
 *
 * // Filter + sort + limit
 * query(users).match({ role: "user" }).sort({ age: -1 }).limit(1).exec();
 * // [{ name: "Carol", age: 35, role: "user" }]
 *
 * // All docs, sorted
 * query(users).all().sort({ name: 1 }).exec();
 *
 * // Count
 * query(users).match({ role: "user" }).count(); // 2
 *
 * // First match
 * query(users).match({ name: "Bob" }).one();
 *
 * // Spread (iterable)
 * [...query(users).all().sort({ name: 1 })];
 * ```
 *
 * ## Pipeline Order
 *
 * `filter → sort → skip → limit → project`
 *
 * ## Supported Operators
 *
 * - **Comparison**: `$eq`, `$ne`, `$gt`, `$gte`, `$lt`, `$lte`, `$in`, `$nin`, `$exists`, `$regex`
 * - **Logical**: `$and`, `$or`, `$not`, `$nor`
 * - **Dot-notation** for nested fields (`"address.city"`)
 */

// --- Primary chaining API ---
export { query, QueryChain, QueryInit } from "./src/builder.ts";

// --- Low-level utilities (for advanced / functional use) ---
export { count, findOne } from "./src/query.ts";
export { matchesFilter } from "./src/match.ts";
export { applyProjection } from "./src/project.ts";
export { sortDocs } from "./src/sort.ts";

// --- Types ---
export type {
  FieldMatch,
  FieldPredicate,
  MatchFilter,
  PlainObject,
  ProjectionSpec,
  SortDirection,
  SortSpec,
} from "./src/types.ts";
