import { assertEquals, assertThrows } from "@std/assert";
import { sortDocs } from "../src/sort.ts";

const docs = [
  { name: "Carol", age: 35 },
  { name: "Alice", age: 30 },
  { name: "Bob", age: 30 },
  { name: "Dave", age: 22 },
];

Deno.test("sortDocs - ascending by number", () => {
  const result = sortDocs(docs, { age: 1 });
  assertEquals(result.map((d) => d.name), ["Dave", "Alice", "Bob", "Carol"]);
});

Deno.test("sortDocs - descending by number", () => {
  const result = sortDocs(docs, { age: -1 });
  assertEquals(result.map((d) => d.name), ["Carol", "Alice", "Bob", "Dave"]);
});

Deno.test("sortDocs - multi-field sort", () => {
  const result = sortDocs(docs, { age: 1, name: 1 });
  assertEquals(result.map((d) => d.name), ["Dave", "Alice", "Bob", "Carol"]);
});

Deno.test("sortDocs - sort by string ascending", () => {
  const result = sortDocs(docs, { name: 1 });
  assertEquals(result.map((d) => d.name), ["Alice", "Bob", "Carol", "Dave"]);
});

Deno.test("sortDocs - does not mutate original array", () => {
  const original = [...docs];
  sortDocs(docs, { age: -1 });
  assertEquals(docs, original);
});

Deno.test("sortDocs - sort by string descending", () => {
  const result = sortDocs(docs, { name: -1 });
  assertEquals(result.map((d) => d.name), ["Dave", "Carol", "Bob", "Alice"]);
});

Deno.test("sortDocs - invalid direction throws", () => {
  assertThrows(
    () => sortDocs(docs, { age: 2 as never }),
    RangeError,
    'sort() direction for field "age"',
  );
});
