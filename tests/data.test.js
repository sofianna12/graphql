// Tests for the pure functions in js/data.js.
// Run from the project root with:  node --test
import { test } from "node:test";
import assert from "node:assert/strict";
import * as data from "../js/data.js";

const xp = [
  { amount: 100, createdAt: "2026-01-01", path: "/athens/div-01/checkpoint/onlya", object: { name: "onlya", type: "exercise" } },
  { amount: 300, createdAt: "2026-02-01", path: "/athens/div-01/forum", object: { name: "forum", type: "project" } },
  { amount: 50, createdAt: "2026-03-01", path: "/athens/div-01/forum", object: { name: "forum", type: "project" } },
  { amount: 500, createdAt: "2026-04-01", path: "/athens/div-01/lem-in", object: { name: "lem-in", type: "project" } },
];

test("formatBytes matches the platform dashboard", () => {
  assert.equal(data.formatBytes(906900), "907 kB");
  assert.equal(data.formatBytes(772909), "773 kB");
  assert.equal(data.formatBytes(12047), "12.0 kB");
  assert.equal(data.formatBytes(51800), "51.8 kB");
  assert.equal(data.formatBytes(1066950), "1.07 MB");
});

test("formatBytes edge cases", () => {
  assert.equal(data.formatBytes(0), "0 B");
  assert.equal(data.formatBytes(500), "500 B");
  assert.equal(data.formatBytes(999960), "1.00 MB");
});

test("formatRatio uses one decimal", () => {
  assert.equal(data.formatRatio(1.396020747591243), "1.4");
});

test("auditStats separates the bonus from done", () => {
  const user = { auditRatio: 1.396, totalUp: 1078997, totalUpBonus: 12047, totalDown: 772909 };
  assert.deepEqual(data.auditStats(user), { ratio: 1.396, done: 1066950, bonus: 12047, received: 772909 });
});

test("projectStats counts pass, fail and not graded", () => {
  const projects = [{ grade: 1.2 }, { grade: 1.2 }, { grade: 0.45 }, { grade: null }];
  assert.deepEqual(data.projectStats(projects), { passed: 2, failed: 1, inProgress: 1 });
  assert.deepEqual(data.projectStats([]), { passed: 0, failed: 0, inProgress: 0 });
});

test("totalXp sums all amounts", () => {
  assert.equal(data.totalXp(xp), 950);
  assert.equal(data.totalXp([]), 0);
});

test("xpOverTime is cumulative", () => {
  assert.deepEqual(data.xpOverTime(xp).map((p) => p.total), [100, 400, 450, 950]);
});

test("xpByProject groups by project, ignores exercises, sorts highest first", () => {
  assert.deepEqual(data.xpByProject(xp), [
    { name: "lem-in", amount: 500 },
    { name: "forum", amount: 350 },
  ]);
});

test("recentXp returns the newest first", () => {
  assert.deepEqual(data.recentXp(xp, 2).map((r) => r.name), ["lem-in", "forum"]);
});

test("currentLevel handles an empty list", () => {
  assert.equal(data.currentLevel([{ amount: 28 }]), 28);
  assert.equal(data.currentLevel([]), 0);
});
