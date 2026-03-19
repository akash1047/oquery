import type { ProjectionSpec } from "./types.ts";

/**
 * Applies a MongoDB-style projection to a document.
 *
 * Supports inclusion projections (`{ field: 1 }`) and exclusion projections
 * (`{ field: 0 }`). Mixing inclusions and exclusions is not permitted.
 *
 * @param doc - The source document.
 * @param projection - The projection specification.
 * @returns A new object with only the projected fields.
 *   **Shallow copy**: nested objects and arrays are shared references with the original
 *   document. Mutating a nested value in the result will also mutate the source document.
 * @throws {Error} If inclusion and exclusion fields are mixed.
 *
 * @example
 * ```ts
 * applyProjection({ name: "Alice", age: 30, password: "x" }, { name: 1, age: 1 });
 * // { name: "Alice", age: 30 }
 * ```
 */
export function applyProjection(
  doc: Record<string, unknown>,
  projection: ProjectionSpec,
): Record<string, unknown> {
  const entries = Object.entries(projection);
  if (entries.length === 0) return { ...doc };

  const inclusions = entries.filter(([, v]) => v === 1).map(([k]) => k);
  const exclusions = entries.filter(([, v]) => v === 0).map(([k]) => k);

  if (inclusions.length > 0 && exclusions.length > 0) {
    throw new Error(
      "Projection cannot mix inclusion and exclusion fields.",
    );
  }

  if (inclusions.length > 0) {
    const result: Record<string, unknown> = {};
    for (const key of inclusions) {
      if (Object.prototype.hasOwnProperty.call(doc, key)) {
        result[key] = doc[key];
      }
    }
    return result;
  }

  // Exclusion mode — build new object from entries, never mutate
  const excludeSet = new Set(exclusions);
  return Object.fromEntries(Object.entries(doc).filter(([k]) => !excludeSet.has(k)));
}
