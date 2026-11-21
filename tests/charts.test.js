// Tests for the pure helpers in js/charts.js.  Run: node --test
import { test } from "node:test";
import assert from "node:assert/strict";
import { scale, niceTicks, monthTicks, linePath } from "../js/charts.js";

test("scale maps a value proportionally", () => {
  assert.equal(scale(5, 0, 10, 0, 200), 100);
  assert.equal(scale(0, 0, 10, 0, 200), 0);
  assert.equal(scale(10, 0, 10, 0, 200), 200);
});

test("scale can be reversed (SVG y grows downwards)", () => {
  assert.equal(scale(0, 0, 100, 250, 50), 250);
  assert.equal(scale(100, 0, 100, 250, 50), 50);
});

test("scale with an empty domain returns the middle", () => {
  assert.equal(scale(3, 3, 3, 0, 100), 50);
});

test("niceTicks gives round values up to at least the max", () => {
  assert.deepEqual(niceTicks(906900), [0, 250000, 500000, 750000, 1000000]);
  assert.deepEqual(niceTicks(100), [0, 25, 50, 75, 100]);
  assert.deepEqual(niceTicks(0), [0, 1]);
});

test("monthTicks returns first days of months inside the range", () => {
  const ticks = monthTicks(new Date(2025, 9, 17), new Date(2026, 10, 19), 5);
  assert.ok(ticks.length >= 3 && ticks.length <= 7);
  for (const t of ticks) assert.equal(t.getDate(), 1);
  assert.deepEqual(ticks[0], new Date(2025, 10, 1));
});

test("linePath builds an SVG path", () => {
  assert.equal(linePath([[0, 10], [5, 20]]), "M 0.0 10.0 L 5.0 20.0");
});
