import { assertEquals, assertStrictEquals, assertThrows } from "@std/assert";
import { query, QueryChain, QueryInit } from "../src/builder.ts";

const users = [
  { name: "Alice", age: 30, role: "admin", address: { city: "NYC" } },
  { name: "Bob", age: 25, role: "user", address: { city: "LA" } },
  { name: "Carol", age: 35, role: "user", address: { city: "NYC" } },
  { name: "Dave", age: 22, role: "user", address: { city: "Chicago" } },
];

// --- query() factory ---

Deno.test("query() returns a QueryInit instance", () => {
  assertStrictEquals(query(users) instanceof QueryInit, true);
});

Deno.test("query().match() returns a QueryChain instance", () => {
  assertStrictEquals(query(users).match({}) instanceof QueryChain, true);
});

// --- .match({}) — all documents ---

Deno.test("match({}).exec() returns all documents", () => {
  assertEquals(query(users).match({}).exec().length, 4);
});

Deno.test("match({}).exec() returns a copy — not the original array reference", () => {
  const result = query(users).match({}).exec();
  assertEquals(result, users);
  assertStrictEquals(result === users, false);
});

// --- .match() with exact values ---

Deno.test("match() exact string field", () => {
  const result = query(users).match({ role: "admin" }).exec();
  assertEquals(result.length, 1);
  assertEquals(result[0].name, "Alice");
});

Deno.test("match() exact match on multiple fields (implicit AND)", () => {
  // object values use === (reference equality) — use dot-notation for nested fields
  const result = query(users).match({ role: "user", "address.city": "LA" }).exec();
  assertEquals(result.length, 1);
  assertEquals(result[0].name, "Bob");
});

Deno.test("match({}) returns all documents", () => {
  assertEquals(query(users).match({}).exec().length, 4);
});

// --- .match() with predicate functions ---

Deno.test("match() predicate: greater than", () => {
  const result = query(users).match({ age: (v) => (v as number) > 25 }).exec();
  assertEquals(result.length, 2);
  assertEquals(result.map((u) => u.name).sort(), ["Alice", "Carol"]);
});

Deno.test("match() predicate: string includes", () => {
  const result = query(users).match({ name: (v) => (v as string).includes("l") }).exec();
  assertEquals(result.map((u) => u.name).sort(), ["Alice", "Carol"]);
});

Deno.test("match() predicate: regex test", () => {
  const result = query(users).match({ name: (v) => /^[AC]/.test(v as string) }).exec();
  assertEquals(result.map((u) => u.name).sort(), ["Alice", "Carol"]);
});

// --- .match() mixed exact + predicate ---

Deno.test("match() mixed: exact role + age predicate", () => {
  const result = query(users).match({
    role: "user",
    age: (v) => (v as number) >= 25,
  }).exec();
  assertEquals(result.length, 2);
  assertEquals(result.map((u) => u.name).sort(), ["Bob", "Carol"]);
});

// --- .match() with dot-notation ---

Deno.test("match() dot-notation exact value", () => {
  const result = query(users).match({ "address.city": "NYC" }).exec();
  assertEquals(result.length, 2);
  assertEquals(result.map((u) => u.name).sort(), ["Alice", "Carol"]);
});

Deno.test("match() dot-notation predicate", () => {
  const result = query(users).match({ "address.city": (v) => v !== "LA" }).exec();
  assertEquals(result.length, 3);
});

// --- .sort() ---

Deno.test("sort() ascending by number", () => {
  const result = query(users).match({}).sort({ age: 1 }).exec();
  assertEquals(result.map((u) => u.name), ["Dave", "Bob", "Alice", "Carol"]);
});

Deno.test("sort() descending by number", () => {
  const result = query(users).match({}).sort({ age: -1 }).exec();
  assertEquals(result.map((u) => u.name), ["Carol", "Alice", "Bob", "Dave"]);
});

Deno.test("sort() by string ascending", () => {
  const result = query(users).match({}).sort({ name: 1 }).exec();
  assertEquals(result.map((u) => u.name), ["Alice", "Bob", "Carol", "Dave"]);
});

// --- .limit() ---

Deno.test("limit() restricts result count", () => {
  assertEquals(query(users).match({}).limit(2).exec().length, 2);
});

Deno.test("limit(0) returns empty array", () => {
  assertEquals(query(users).match({}).limit(0).exec().length, 0);
});

Deno.test("limit() throws on NaN", () => {
  assertThrows(() => query(users).match({}).limit(NaN), RangeError, "limit()");
});

Deno.test("limit() throws on negative value", () => {
  assertThrows(() => query(users).match({}).limit(-1), RangeError, "limit()");
});

Deno.test("limit() throws on non-integer", () => {
  assertThrows(() => query(users).match({}).limit(1.5), RangeError, "limit()");
});

Deno.test("limit() throws on Infinity", () => {
  assertThrows(() => query(users).match({}).limit(Infinity), RangeError, "limit()");
});

// --- .skip() ---

Deno.test("skip() skips leading documents", () => {
  assertEquals(query(users).match({}).skip(2).exec().length, 2);
});

Deno.test("skip() + limit() for pagination", () => {
  const result = query(users).match({}).sort({ age: 1 }).skip(1).limit(2).exec();
  assertEquals(result.map((u) => u.name), ["Bob", "Alice"]);
});

Deno.test("skip() throws on NaN", () => {
  assertThrows(() => query(users).match({}).skip(NaN), RangeError, "skip()");
});

Deno.test("skip() throws on negative value", () => {
  assertThrows(() => query(users).match({}).skip(-1), RangeError, "skip()");
});

Deno.test("skip() throws on non-integer", () => {
  assertThrows(() => query(users).match({}).skip(0.5), RangeError, "skip()");
});

// --- .project() ---

Deno.test("project() inclusion", () => {
  const result = query(users).match({ name: "Alice" }).project({ name: 1, age: 1 }).exec();
  assertEquals(result[0] as Record<string, unknown>, { name: "Alice", age: 30 });
});

Deno.test("project() exclusion", () => {
  const result = query(users).match({ name: "Bob" }).project({ address: 0 }).exec();
  assertEquals(result[0] as Record<string, unknown>, { name: "Bob", age: 25, role: "user" });
});

// --- .one() ---

Deno.test("one() returns first match after sort", () => {
  const result = query(users).match({ role: "user" }).sort({ age: -1 }).one();
  assertEquals(result?.name, "Carol");
});

Deno.test("one() with predicate filter", () => {
  const result = query(users).match({ age: (v) => (v as number) > 30 }).one();
  assertEquals(result?.name, "Carol");
});

Deno.test("one() returns undefined when no match", () => {
  assertEquals(query(users).match({ name: "Zara" }).one(), undefined);
});

// --- .count() ---

Deno.test("count() with exact filter", () => {
  assertEquals(query(users).match({ role: "user" }).count(), 3);
});

Deno.test("count() with predicate filter", () => {
  assertEquals(query(users).match({ age: (v) => (v as number) > 25 }).count(), 2);
});

Deno.test("count() with match({}) returns total", () => {
  assertEquals(query(users).match({}).count(), 4);
});

// --- Symbol.iterator ---

Deno.test("chain is iterable via spread", () => {
  const result = [...query(users).match({}).sort({ name: 1 }).limit(2)];
  assertEquals(result.map((u) => u.name), ["Alice", "Bob"]);
});

Deno.test("chain is iterable via for...of", () => {
  const names: string[] = [];
  for (const u of query(users).match({ role: "user" })) {
    names.push(u.name);
  }
  assertEquals(names, ["Bob", "Carol", "Dave"]);
});

// --- Immutability ---

Deno.test("refinement methods return new chain — original is unchanged", () => {
  const base = query(users).match({});
  const withLimit = base.limit(2);
  assertEquals(base.exec().length, 4);
  assertEquals(withLimit.exec().length, 2);
});

Deno.test("reusing same chain produces identical results", () => {
  const chain = query(users).match({ role: "user" }).sort({ age: -1 });
  assertEquals(chain.exec(), chain.exec());
});

Deno.test("chain does not mutate source array", () => {
  const source = [...users];
  query(users).match({}).sort({ age: -1 }).limit(2).exec();
  assertEquals(users, source);
});

// --- Method order independence ---

Deno.test("sort().limit() and limit().sort() produce the same result", () => {
  const a = query(users).match({}).sort({ age: 1 }).limit(2).exec();
  const b = query(users).match({}).limit(2).sort({ age: 1 }).exec();
  assertEquals(a, b);
});
