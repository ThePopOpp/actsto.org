/**
 * Tests for the select label lookup.
 *
 * Run with: npm run test:select
 *
 * This is the logic that stops a student or school picker from displaying a raw
 * UUID, so it is worth pinning down rather than eyeballing in a browser. It runs
 * against real React elements shaped exactly like the call sites.
 */

import assert from "node:assert/strict";

import * as React from "react";

const { collectSelectItems, textOf } = await import("@/lib/select-items");

let passed = 0;
let failed = 0;

function test(name: string, fn: () => void) {
  try {
    fn();
    passed += 1;
  } catch (error) {
    failed += 1;
    console.error(`  ✗ ${name}`);
    console.error(`    ${error instanceof Error ? error.message : String(error)}`);
  }
}

// Stand-ins shaped like the real components. Identity is all that matters.
function SelectItem(_props: { value: string; children?: React.ReactNode }) {
  return null;
}
function SelectContent(_props: { children?: React.ReactNode }) {
  return null;
}
function SelectTrigger(_props: { children?: React.ReactNode }) {
  return null;
}
function SelectGroup(_props: { children?: React.ReactNode }) {
  return null;
}

const h = React.createElement;

console.log("textOf");

test("plain string", () => {
  assert.equal(textOf("Valley Christian Schools"), "Valley Christian Schools");
});

test("number", () => {
  assert.equal(textOf(2026), "2026");
});

test("array of strings joins", () => {
  assert.equal(textOf(["Valley Christian", " — ", "Chandler"]), "Valley Christian — Chandler");
});

test("markup returns null rather than a guess", () => {
  assert.equal(textOf(h("span", null, "Nope")), null);
});

test("fragment unwraps", () => {
  assert.equal(textOf(h(React.Fragment, null, "Wrapped")), "Wrapped");
});

console.log("collectSelectItems");

test("finds items nested inside SelectContent", () => {
  const tree = [
    h(SelectTrigger, { key: "t" }),
    h(
      SelectContent,
      { key: "c" },
      h(SelectItem, { key: "a", value: "uuid-a" }, "Valley Christian Schools"),
      h(SelectItem, { key: "b", value: "uuid-b" }, "Northwest Christian School"),
    ),
  ];

  assert.deepEqual(collectSelectItems(tree, SelectItem), {
    "uuid-a": "Valley Christian Schools",
    "uuid-b": "Northwest Christian School",
  });
});

test("handles items produced by .map(), which is how every call site builds them", () => {
  const schools = [
    { id: "c46d2b5f", name: "Valley Christian Schools", city: "Chandler" },
    { id: "ed3b92bf", name: "Grace Preparatory", city: null as string | null },
  ];

  const tree = h(
    SelectContent,
    null,
    schools.map((school) =>
      h(
        SelectItem,
        { key: school.id, value: school.id },
        school.city ? `${school.name} — ${school.city}` : school.name,
      ),
    ),
  );

  assert.deepEqual(collectSelectItems(tree, SelectItem), {
    c46d2b5f: "Valley Christian Schools — Chandler",
    ed3b92bf: "Grace Preparatory",
  });
});

test("descends through groups", () => {
  const tree = h(
    SelectContent,
    null,
    h(SelectGroup, null, h(SelectItem, { value: "x" }, "Grouped")),
  );
  assert.deepEqual(collectSelectItems(tree, SelectItem), { x: "Grouped" });
});

test("an item with markup is skipped, the rest still resolve", () => {
  const tree = h(
    SelectContent,
    null,
    h(SelectItem, { key: "1", value: "plain" }, "Plain label"),
    h(SelectItem, { key: "2", value: "rich" }, h("span", null, "Rich label")),
  );
  assert.deepEqual(collectSelectItems(tree, SelectItem), { plain: "Plain label" });
});

test("no items yields an empty map, so the wrapper can fall back", () => {
  assert.deepEqual(collectSelectItems(h(SelectContent, null), SelectItem), {});
  assert.deepEqual(collectSelectItems(null, SelectItem), {});
});

test("ignores conditional false/null children without throwing", () => {
  const showExtra = false;
  const tree = h(
    SelectContent,
    null,
    h(SelectItem, { key: "1", value: "a" }, "A"),
    showExtra ? h(SelectItem, { key: "2", value: "b" }, "B") : null,
  );
  assert.deepEqual(collectSelectItems(tree, SelectItem), { a: "A" });
});

console.log("");
console.log(`${passed} passed, ${failed} failed`);
if (failed > 0) process.exit(1);
