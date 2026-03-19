import type { MatchFilter, PlainObject, ProjectionSpec, SortSpec } from "./types.ts";
import { matchesFilter } from "./match.ts";
import { applyProjection } from "./project.ts";
import { sortDocs } from "./sort.ts";

/** Internal accumulated state for a {@linkcode QueryChain}. */
interface ChainState {
  readonly sortSpec?: SortSpec;
  readonly skipN: number;
  readonly limitN?: number;
  readonly projectionSpec?: ProjectionSpec;
}

const DEFAULT_STATE: ChainState = { skipN: 0 };

/**
 * A lazy query chain returned by {@linkcode QueryInit.all} or {@linkcode QueryInit.match}.
 *
 * Refinement methods (`.sort`, `.limit`, `.skip`, `.project`) return a **new** `QueryChain`
 * with the updated configuration — the original chain is never mutated.
 *
 * Execute the chain with a terminal method:
 * - `.exec()` → `T[]`
 * - `.one()` → `T | undefined`
 * - `.count()` → `number`
 *
 * The chain is also iterable via `Symbol.iterator`, so it can be spread or used in `for...of`.
 *
 * @example
 * ```ts
 * query(users).match({ role: "admin" }).sort({ name: 1 }).limit(5).exec();
 * ```
 */
export class QueryChain<T extends PlainObject> {
  readonly #data: T[];
  readonly #filter: MatchFilter;
  readonly #state: ChainState;

  /** @internal */
  constructor(data: T[], filter: MatchFilter, state: ChainState = DEFAULT_STATE) {
    this.#data = data;
    this.#filter = filter;
    this.#state = state;
  }

  /**
   * Sets the sort order. Returns a new chain — does not mutate this one.
   *
   * @param spec - Map of field names to `1` (asc) or `-1` (desc).
   *
   * @example
   * ```ts
   * query(users).all().sort({ age: -1, name: 1 }).exec();
   * ```
   */
  sort(spec: SortSpec): QueryChain<T> {
    return new QueryChain<T>(this.#data, this.#filter, { ...this.#state, sortSpec: spec });
  }

  /**
   * Sets the maximum number of results to return. Returns a new chain.
   *
   * Note: `limit(0)` returns an empty array (differs from MongoDB where `0` means "no limit").
   *
   * @param n - Maximum number of documents.
   *
   * @example
   * ```ts
   * query(users).all().limit(10).exec();
   * ```
   */
  limit(n: number): QueryChain<T> {
    if (!Number.isFinite(n) || n < 0 || !Number.isInteger(n)) {
      throw new RangeError(`limit() requires a non-negative integer, got: ${n}`);
    }
    return new QueryChain<T>(this.#data, this.#filter, { ...this.#state, limitN: n });
  }

  /**
   * Sets the number of documents to skip. Returns a new chain.
   *
   * @param n - Number of documents to skip.
   *
   * @example
   * ```ts
   * query(users).all().sort({ name: 1 }).skip(20).limit(10).exec(); // page 3
   * ```
   */
  skip(n: number): QueryChain<T> {
    if (!Number.isFinite(n) || n < 0 || !Number.isInteger(n)) {
      throw new RangeError(`skip() requires a non-negative integer, got: ${n}`);
    }
    return new QueryChain<T>(this.#data, this.#filter, { ...this.#state, skipN: n });
  }

  /**
   * Sets the field projection. Returns a new chain.
   *
   * Supports inclusion (`{ field: 1 }`) or exclusion (`{ field: 0 }`) — not both.
   * The returned documents are shallow copies; nested objects are shared references.
   *
   * @param spec - Projection specification.
   *
   * @example
   * ```ts
   * query(users).all().project({ name: 1, age: 1 }).exec();
   * ```
   */
  project(spec: ProjectionSpec): QueryChain<T> {
    return new QueryChain<T>(this.#data, this.#filter, {
      ...this.#state,
      projectionSpec: spec,
    });
  }

  /**
   * Executes the pipeline and returns all matching documents.
   *
   * Pipeline order: **filter → sort → skip → limit → project**
   *
   * @returns A new array of matching documents. Never mutates the source array.
   *
   * @example
   * ```ts
   * query(users).match({ active: true }).sort({ name: 1 }).exec();
   * ```
   */
  exec(): T[] {
    const { sortSpec, skipN, limitN, projectionSpec } = this.#state;

    let results = this.#data.filter((doc) =>
      matchesFilter(doc as Record<string, unknown>, this.#filter)
    );

    if (sortSpec && Object.keys(sortSpec).length > 0) {
      results = sortDocs(results as Record<string, unknown>[], sortSpec) as T[];
    }

    if (skipN > 0) results = results.slice(skipN);
    if (limitN !== undefined && limitN >= 0) results = results.slice(0, limitN);

    if (projectionSpec && Object.keys(projectionSpec).length > 0) {
      return results.map(
        (doc) => applyProjection(doc as Record<string, unknown>, projectionSpec) as T,
      );
    }

    return results;
  }

  /**
   * Executes the full pipeline (filter, sort, skip, limit, project) and returns the
   * first document, or `undefined` if no documents match.
   *
   * @example
   * ```ts
   * query(users).match({ name: "Alice" }).one();
   * ```
   */
  one(): T | undefined {
    return this.exec()[0];
  }

  /**
   * Returns the number of documents that match the filter.
   * Sort, skip, limit, and projection are ignored.
   *
   * @example
   * ```ts
   * query(users).match({ role: "admin" }).count(); // 3
   * ```
   */
  count(): number {
    return this.#data.filter((doc) => matchesFilter(doc as Record<string, unknown>, this.#filter))
      .length;
  }

  /**
   * Makes the chain iterable. Executes the full pipeline on first iteration.
   *
   * @example
   * ```ts
   * const results = [...query(users).all().sort({ name: 1 }).limit(5)];
   * ```
   */
  [Symbol.iterator](): Iterator<T> {
    return this.exec()[Symbol.iterator]();
  }
}

/**
 * The entry point of the oquery chaining API.
 *
 * Calling `query(data)` returns a {@linkcode QueryInit} that exposes **only** `.all()` and
 * `.match()`. This type-level separation prevents calling `.sort()`, `.limit()`, etc.
 * before a filter has been established.
 *
 * Pass `{}` to match all documents.
 *
 * @example
 * ```ts
 * // query(data).sort(...) — TypeScript error: sort does not exist on QueryInit
 * query(data).match({}).sort({ name: 1 }).exec();           // all docs, sorted
 * query(data).match({ active: true }).exec();               // filtered
 * query(data).match({ age: (v) => (v as number) > 18 }).exec(); // predicate
 * ```
 */
export class QueryInit<T extends PlainObject> {
  readonly #data: T[];

  /** @internal */
  constructor(data: T[]) {
    this.#data = data;
  }

  /**
   * Filters documents and enters the {@linkcode QueryChain} refinement stage.
   *
   * Each field in the filter can be an **exact value** (strict `===`) or a
   * **predicate function** `(value) => boolean`. Pass `{}` to match all documents.
   *
   * @param filter - A {@linkcode MatchFilter}: field paths mapped to exact values or predicates.
   *
   * @example
   * ```ts
   * query(users).match({}).exec();                                    // all docs
   * query(users).match({ role: "admin" }).exec();                     // exact value
   * query(users).match({ age: (v) => (v as number) >= 18 }).exec();   // predicate
   * query(users).match({ role: "user", age: (v) => (v as number) >= 25 }).exec(); // mixed
   * ```
   */
  match(filter: MatchFilter): QueryChain<T> {
    return new QueryChain<T>(this.#data, filter);
  }
}

/**
 * Creates a new oquery builder for the given array.
 *
 * Returns a {@linkcode QueryInit} that exposes only `.all()` and `.match()`.
 * Chain refinement methods (`.sort`, `.limit`, `.skip`, `.project`) and
 * terminal methods (`.exec`, `.one`, `.count`) are available after calling
 * `.all()` or `.match()`.
 *
 * @param data - The source array to query. Never mutated.
 * @returns A {@linkcode QueryInit} builder.
 *
 * @example
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
 * // All docs, paginated
 * query(users).match({}).skip(1).limit(2).exec();
 *
 * // Count
 * query(users).match({ role: "user" }).count(); // 2
 *
 * // First match
 * query(users).match({ name: "Bob" }).one();
 *
 * // Spread (iterable)
 * [...query(users).match({}).sort({ name: 1 })];
 * ```
 */
export function query<T extends PlainObject>(data: T[]): QueryInit<T> {
  return new QueryInit<T>(data);
}
