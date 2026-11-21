// Pure functions that turn the raw API data into the values the UI needs.
// No fetch, no DOM, no localStorage: same input -> same output.
// This makes them easy to test with fake data: see tests/data.test.js (run: node --test).

const UNITS = ["B", "kB", "MB", "GB"];

// Formats bytes like the platform does: base 1000 and 3 significant digits.
// 906900 -> "907 kB", 12047 -> "12.0 kB", 1066950 -> "1.07 MB"
export function formatBytes(bytes) {
  let value = bytes;
  let unit = 0;

  while (value >= 1000 && unit < UNITS.length - 1) {
    value /= 1000;
    unit++;
  }

  if (unit === 0) return `${Math.round(value)} B`;

  // 999.96 kB rounds to "1.00e+3" -> show it as the next unit instead
  if (Number(value.toPrecision(3)) >= 1000 && unit < UNITS.length - 1) {
    value /= 1000;
    unit++;
  }

  return `${value.toPrecision(3)} ${UNITS[unit]}`;
}

// Sum of all XP amounts.
export function totalXp(xp) {
  return xp.reduce((sum, t) => sum + t.amount, 0);
}

// Current level: the highest level transaction (the query already sorts it first).
export function currentLevel(level) {
  return level[0]?.amount ?? 0;
}

// The last n XP transactions, newest first.
export function recentXp(xp, n = 5) {
  return xp.slice(-n).reverse().map((t) => ({
    name: t.object?.name ?? lastPathPart(t.path),
    amount: t.amount,
    date: new Date(t.createdAt),
  }));
}

// Audit numbers shown like the dashboard: "Done" without the bonus, and the bonus apart.
export function auditStats(user) {
  const bonus = user.totalUpBonus ?? 0;
  return {
    ratio: user.auditRatio ?? 0,
    done: user.totalUp - bonus,
    bonus,
    received: user.totalDown,
  };
}

// Audit ratio with one decimal, like the dashboard: 1.396 -> "1.4"
export function formatRatio(ratio) {
  return ratio.toFixed(1);
}

// Counts project attempts: grade >= 1 is PASS, grade < 1 is FAIL, null is not graded yet.
export function projectStats(projects) {
  const graded = projects.filter((p) => p.grade !== null);
  return {
    passed: graded.filter((p) => p.grade >= 1).length,
    failed: graded.filter((p) => p.grade < 1).length,
    inProgress: projects.length - graded.length,
  };
}

// Cumulative XP for the "XP over time" graph. Expects transactions sorted oldest first.
// [{amount: 100}, {amount: 50}] -> [{date, total: 100}, {date, total: 150}]
export function xpOverTime(xp) {
  let total = 0;
  return xp.map((t) => {
    total += t.amount;
    return { date: new Date(t.createdAt), total };
  });
}

// XP per project for the "XP by project" graph, highest first.
// Only projects are counted (not exercises like checkpoints).
export function xpByProject(xp) {
  const totals = new Map();

  for (const t of xp) {
    if (t.object?.type !== "project") continue;
    const name = t.object.name;
    totals.set(name, (totals.get(name) ?? 0) + t.amount);
  }

  return [...totals]
    .map(([name, amount]) => ({ name, amount }))
    .sort((a, b) => b.amount - a.amount);
}

// "/athens/div-01/forum" -> "forum"
function lastPathPart(path) {
  return path.split("/").pop();
}

// A short message about the audit ratio, with a level used for the color.
export function auditMessage(ratio) {
  if (ratio < 0.8) return { text: "Careful, buddy!", level: "bad" };
  if (ratio < 1) return { text: "Make more audits!", level: "warning" };
  if (ratio < 1.5) return { text: "Almost perfect!", level: "good" };
  return { text: "Perfect!", level: "good" };
}

// Width of each bar as a percentage of the biggest value (0-100).
export function barPercent(value, max) {
  if (max <= 0) return 0;
  return Math.max(0, Math.min(100, (value / max) * 100));
}
