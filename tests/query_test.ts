import { assertEquals } from "@std/assert";
import { count, findOne } from "../src/query.ts";

const users = [
  { name: "Alice", age: 30, role: "admin", address: { city: "NYC" } },
  { name: "Bob", age: 25, role: "user", address: { city: "LA" } },
  { name: "Carol", age: 35, role: "user", address: { city: "NYC" } },
  { name: "Dave", age: 22, role: "user", address: { city: "Chicago" } },
];

// --- count ---

Deno.test("count - empty filter counts all", () => {
  assertEquals(count(users, {}), 4);
});

Deno.test("count - exact match", () => {
  assertEquals(count(users, { role: "user" }), 3);
});

Deno.test("count - predicate match", () => {
  assertEquals(count(users, { age: (v) => (v as number) > 25 }), 2);
});

Deno.test("count - mixed exact and predicate", () => {
  assertEquals(count(users, { role: "user", age: (v) => (v as number) >= 25 }), 2);
});

Deno.test("count - no matches returns 0", () => {
  assertEquals(count(users, { name: "Zara" }), 0);
});

// --- findOne ---

Deno.test("findOne - returns first exact match", () => {
  const result = findOne(users, { name: "Carol" });
  assertEquals(result?.age, 35);
});

Deno.test("findOne - returns first predicate match", () => {
  const result = findOne(users, { age: (v) => (v as number) > 25 });
  assertEquals(result?.name, "Alice");
});

Deno.test("findOne - returns undefined when no match", () => {
  assertEquals(findOne(users, { name: "Zara" }), undefined);
});

Deno.test("findOne - empty filter returns first document", () => {
  assertEquals(findOne(users, {})?.name, "Alice");
});
