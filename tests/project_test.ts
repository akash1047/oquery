import { assertEquals, assertThrows } from "@std/assert";
import { applyProjection } from "../src/project.ts";

const doc = { name: "Alice", age: 30, role: "admin", password: "secret" };

Deno.test("applyProjection - empty projection returns full doc copy", () => {
  assertEquals(applyProjection(doc, {}), doc);
});

Deno.test("applyProjection - inclusion", () => {
  assertEquals(applyProjection(doc, { name: 1, age: 1 }), { name: "Alice", age: 30 });
});

Deno.test("applyProjection - exclusion", () => {
  const result = applyProjection(doc, { password: 0 });
  assertEquals(result, { name: "Alice", age: 30, role: "admin" });
});

Deno.test("applyProjection - mixed inclusion/exclusion throws", () => {
  assertThrows(
    () => applyProjection(doc, { name: 1, password: 0 }),
    Error,
    "Projection cannot mix",
  );
});

Deno.test("applyProjection - does not mutate original doc", () => {
  const original = { ...doc };
  applyProjection(doc, { password: 0 });
  assertEquals(doc, original);
});

Deno.test("applyProjection - exclusion returns new object (no delete mutation)", () => {
  const result = applyProjection(doc, { password: 0 });
  // result must be a different reference
  assertEquals(result === (doc as unknown), false);
  // original must still have the excluded field
  assertEquals("password" in doc, true);
  // result must not have the excluded field
  assertEquals("password" in result, false);
});
