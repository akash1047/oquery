import type { MatchFilter, PlainObject } from "./types.ts";
import { matchesFilter } from "./match.ts";

/**
 * Returns the count of documents in `array` that match `filter`.
 *
 * @param array - The source array.
 * @param filter - Match filter. Pass `{}` to count all documents.
 * @returns The number of matching documents.
 *
 * @example
 * ```ts
 * count(users, { role: "admin" });             // 1
 * count(users, { age: (v) => v > 25 });        // 2
 * ```
 */
export function count<T extends PlainObject>(
  array: T[],
  filter: MatchFilter = {},
): number {
  return array.filter((doc) => matchesFilter(doc as Record<string, unknown>, filter)).length;
}

/**
 * Returns the first document that matches `filter`, or `undefined` if none.
 *
 * @param array - The source array.
 * @param filter - Match filter.
 * @returns The first matching document, or `undefined`.
 *
 * @example
 * ```ts
 * findOne(users, { name: "Alice" });
 * findOne(users, { age: (v) => v > 25 });
 * ```
 */
export function findOne<T extends PlainObject>(
  array: T[],
  filter: MatchFilter = {},
): T | undefined {
  return array.find((doc) => matchesFilter(doc as Record<string, unknown>, filter));
}
