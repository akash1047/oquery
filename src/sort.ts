import type { SortSpec } from "./types.ts";
import { getNestedValue } from "./match.ts";

/**
 * Sorts an array of documents by a multi-field sort specification.
 *
 * @param docs - The array to sort (a shallow copy is sorted; the original is untouched).
 * @param sort - Sort specification mapping field names to `1` (asc) or `-1` (desc).
 * @returns A new sorted array.
 *
 * @example
 * ```ts
 * sortDocs(users, { age: -1, name: 1 }); // sort by age desc, then name asc
 * ```
 */
export function sortDocs(
  docs: Record<string, unknown>[],
  sort: SortSpec,
): Record<string, unknown>[] {
  const fields = Object.entries(sort);
  for (const [field, direction] of fields) {
    if (direction !== 1 && direction !== -1) {
      throw new RangeError(
        `sort() direction for field "${field}" must be 1 (asc) or -1 (desc), got: ${direction}`,
      );
    }
  }
  return [...docs].sort((a, b) => {
    for (const [field, direction] of fields) {
      const av = getNestedValue(a, field);
      const bv = getNestedValue(b, field);

      let cmp = 0;
      if (av === undefined && bv === undefined) {
        cmp = 0;
      } else if (av === undefined) {
        cmp = 1;
      } else if (bv === undefined) {
        cmp = -1;
      } else if (typeof av === "string" && typeof bv === "string") {
        cmp = av.localeCompare(bv);
      } else {
        cmp = (av as number) < (bv as number) ? -1 : (av as number) > (bv as number) ? 1 : 0;
      }

      if (cmp !== 0) return cmp * direction;
    }
    return 0;
  });
}
