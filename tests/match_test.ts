import { assertEquals } from "@std/assert";
import { getNestedValue, matchesFilter } from "../src/match.ts";

// --- getNestedValue ---

Deno.test("getNestedValue - shallow key", () => {
  assertEquals(getNestedValue({ name: "Alice" }, "name"), "Alice");
});

Deno.test("getNestedValue - dot notation", () => {
  assertEquals(getNestedValue({ address: { city: "NYC" } }, "address.city"), "NYC");
});

Deno.test("getNestedValue - missing path returns undefined", () => {
  assertEquals(getNestedValue({ a: 1 }, "b.c"), undefined);
});

Deno.test("getNestedValue - partially missing path returns undefined", () => {
  assertEquals(getNestedValue({ a: { b: 1 } }, "a.c.d"), undefined);
});

// --- matchesFilter - empty filter ---

Deno.test("matchesFilter - empty filter matches everything", () => {
  assertEquals(matchesFilter({ a: 1 }, {}), true);
});

// --- matchesFilter - exact value matching ---

Deno.test("matchesFilter - exact string match", () => {
  assertEquals(matchesFilter({ role: "admin" }, { role: "admin" }), true);
  assertEquals(matchesFilter({ role: "user" }, { role: "admin" }), false);
});

Deno.test("matchesFilter - exact number match", () => {
  assertEquals(matchesFilter({ age: 30 }, { age: 30 }), true);
  assertEquals(matchesFilter({ age: 25 }, { age: 30 }), false);
});

Deno.test("matchesFilter - exact boolean match", () => {
  assertEquals(matchesFilter({ active: true }, { active: true }), true);
  assertEquals(matchesFilter({ active: false }, { active: true }), false);
});

Deno.test("matchesFilter - exact null match", () => {
  assertEquals(matchesFilter({ name: null }, { name: null }), true);
  assertEquals(matchesFilter({ name: "Alice" }, { name: null }), false);
});

Deno.test("matchesFilter - undefined matches missing field", () => {
  assertEquals(matchesFilter({ age: 30 }, { name: undefined }), true);
  assertEquals(matchesFilter({ name: "Alice" }, { name: undefined }), false);
});

// --- matchesFilter - predicate function matching ---

Deno.test("matchesFilter - predicate: greater than", () => {
  assertEquals(matchesFilter({ age: 30 }, { age: (v) => (v as number) > 18 }), true);
  assertEquals(matchesFilter({ age: 15 }, { age: (v) => (v as number) > 18 }), false);
});

Deno.test("matchesFilter - predicate: range check", () => {
  const inRange = (v: unknown) => (v as number) >= 20 && (v as number) <= 35;
  assertEquals(matchesFilter({ age: 30 }, { age: inRange }), true);
  assertEquals(matchesFilter({ age: 10 }, { age: inRange }), false);
  assertEquals(matchesFilter({ age: 40 }, { age: inRange }), false);
});

Deno.test("matchesFilter - predicate: string starts with", () => {
  assertEquals(
    matchesFilter({ name: "Alice" }, { name: (v) => (v as string).startsWith("Al") }),
    true,
  );
  assertEquals(
    matchesFilter({ name: "Bob" }, { name: (v) => (v as string).startsWith("Al") }),
    false,
  );
});

Deno.test("matchesFilter - predicate: regex test", () => {
  assertEquals(
    matchesFilter({ email: "alice@example.com" }, {
      email: (v) => /^[^@]+@[^@]+$/.test(v as string),
    }),
    true,
  );
  assertEquals(
    matchesFilter({ email: "not-an-email" }, { email: (v) => /^[^@]+@[^@]+$/.test(v as string) }),
    false,
  );
});

Deno.test("matchesFilter - predicate: array includes", () => {
  assertEquals(
    matchesFilter({ tags: ["a", "b"] }, { tags: (v) => (v as string[]).includes("a") }),
    true,
  );
  assertEquals(
    matchesFilter({ tags: ["c", "d"] }, { tags: (v) => (v as string[]).includes("a") }),
    false,
  );
});

// --- matchesFilter - mixed exact + predicate ---

Deno.test("matchesFilter - mixed: exact and predicate in same filter", () => {
  const filter = { role: "user", age: (v: unknown) => (v as number) >= 25 };
  assertEquals(matchesFilter({ role: "user", age: 30 }, filter), true);
  assertEquals(matchesFilter({ role: "user", age: 20 }, filter), false);
  assertEquals(matchesFilter({ role: "admin", age: 30 }, filter), false);
});

// --- matchesFilter - dot notation ---

Deno.test("matchesFilter - dot notation exact match", () => {
  assertEquals(
    matchesFilter({ address: { city: "NYC" } }, { "address.city": "NYC" }),
    true,
  );
  assertEquals(
    matchesFilter({ address: { city: "LA" } }, { "address.city": "NYC" }),
    false,
  );
});

Deno.test("matchesFilter - dot notation predicate", () => {
  assertEquals(
    matchesFilter({ address: { city: "NYC" } }, {
      "address.city": (v) => v !== "LA",
    }),
    true,
  );
  assertEquals(
    matchesFilter({ address: { city: "LA" } }, {
      "address.city": (v) => v !== "LA",
    }),
    false,
  );
});

// --- matchesFilter - multiple fields (implicit AND) ---

Deno.test("matchesFilter - multiple fields all must match", () => {
  const doc = { name: "Alice", age: 30, role: "admin" };
  assertEquals(matchesFilter(doc, { name: "Alice", age: 30 }), true);
  assertEquals(matchesFilter(doc, { name: "Alice", age: 99 }), false);
  assertEquals(matchesFilter(doc, { name: "Bob", age: 30 }), false);
});
