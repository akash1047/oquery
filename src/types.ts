/**
 * A plain JavaScript/TypeScript object with string keys.
 */
export type PlainObject = Record<string, unknown>;

/**
 * Sort direction: 1 for ascending, -1 for descending.
 */
export type SortDirection = 1 | -1;

/**
 * Sort specification: maps field names to sort direction.
 *
 * @example
 * ```ts
 * { age: -1, name: 1 }
 * ```
 */
export type SortSpec = Record<string, SortDirection>;

/**
 * Projection specification: maps field names to 1 (include) or 0 (exclude).
 * Mixing inclusions and exclusions is not supported.
 *
 * @example
 * ```ts
 * { name: 1, age: 1 }   // include only name and age
 * { password: 0 }        // exclude password
 * ```
 */
export type ProjectionSpec = Record<string, 0 | 1>;

/**
 * A predicate function that tests a field value.
 * Return `true` to include the document, `false` to exclude it.
 *
 * @example
 * ```ts
 * (v) => (v as number) > 18
 * (v) => typeof v === "string" && v.startsWith("A")
 * ```
 */
export type FieldPredicate = (value: unknown) => boolean;

/**
 * A field matcher: either a plain value (strict equality check)
 * or a {@linkcode FieldPredicate} function.
 *
 * Covers all common value types. For exotic values (e.g. Symbol),
 * use a predicate: `(v) => v === mySymbol`.
 *
 * @example
 * ```ts
 * "admin"                        // exact match: field === "admin"
 * 42                             // exact match: field === 42
 * null                           // exact match: field === null
 * (v) => (v as number) > 18     // predicate
 * ```
 */
export type FieldMatch =
  | FieldPredicate
  | string
  | number
  | boolean
  | null
  | undefined
  | Record<string, unknown>
  | unknown[];

/**
 * A match filter: maps field paths (dot-notation supported) to a {@linkcode FieldMatch}.
 *
 * All entries must pass for a document to be included (implicit AND across fields).
 * Pass `{}` to match every document.
 *
 * @example
 * ```ts
 * { role: "admin" }
 * { age: (v) => (v as number) > 18 }
 * { role: "user", age: (v) => (v as number) >= 25 }
 * { "address.city": "NYC" }
 * { "address.city": (v) => v !== "LA" }
 * ```
 */
export type MatchFilter = Record<string, FieldMatch>;
