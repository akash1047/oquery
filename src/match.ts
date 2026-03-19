import type { FieldPredicate, MatchFilter } from "./types.ts";

/**
 * Retrieves a nested field value from an object using dot-notation path.
 *
 * @param obj - The object to traverse.
 * @param path - Dot-separated field path (e.g. `"address.city"`).
 * @returns The value at the path, or `undefined` if any segment is missing.
 *
 * @example
 * ```ts
 * getNestedValue({ address: { city: "NYC" } }, "address.city"); // "NYC"
 * ```
 */
export function getNestedValue(obj: Record<string, unknown>, path: string): unknown {
  return path.split(".").reduce<unknown>((curr, key) => {
    if (curr !== null && typeof curr === "object") {
      return (curr as Record<string, unknown>)[key];
    }
    return undefined;
  }, obj);
}

/**
 * Tests a single field value against a {@linkcode FieldMatch}.
 *
 * - If the matcher is a function, calls it with the field value.
 * - Otherwise, uses strict equality (`===`).
 */
function matchField(docValue: unknown, matcher: unknown): boolean {
  if (typeof matcher === "function") {
    return (matcher as FieldPredicate)(docValue);
  }
  return docValue === matcher;
}

/**
 * Tests whether a document matches a {@linkcode MatchFilter}.
 *
 * All field entries must pass (implicit AND). An empty filter `{}` matches everything.
 *
 * @param doc - The document to test.
 * @param filter - The match filter.
 * @returns `true` if the document satisfies every field condition in the filter.
 *
 * @example
 * ```ts
 * matchesFilter({ name: "Alice", age: 30 }, { name: "Alice" });           // true
 * matchesFilter({ name: "Alice", age: 30 }, { age: (v) => v > 18 });      // true
 * matchesFilter({ name: "Bob",   age: 15 }, { age: (v) => v > 18 });      // false
 * matchesFilter({ name: "Alice", age: 30 }, {});                           // true
 * ```
 */
export function matchesFilter(doc: Record<string, unknown>, filter: MatchFilter): boolean {
  for (const [key, matcher] of Object.entries(filter)) {
    const docValue = getNestedValue(doc, key);
    if (!matchField(docValue, matcher)) return false;
  }
  return true;
}
