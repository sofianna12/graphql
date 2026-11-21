// Generic SVG charts, built from scratch (no chart library).
// They know nothing about XP or audits: they receive numbers and formatters.
import { h, svg } from "./dom.js";

// ---------- Pure helpers (tested in tests/charts.test.js) ----------

// Linear scale: maps a value from the data range (domain) to pixels (range).
//   scale(5, 0, 10, 0, 200) -> 100
export function scale(value, domainMin, domainMax, rangeMin, rangeMax) {
  if (domainMax === domainMin) return (rangeMin + rangeMax) / 2;
  return rangeMin + ((value - domainMin) / (domainMax - domainMin)) * (rangeMax - rangeMin);
}

// "Nice" round values for an axis from 0 to at least max: 0, 250000, 500000, ...
export function niceTicks(max, count = 4) {
  if (max <= 0) return [0, 1];
  const rawStep = max / count;
  const power = 10 ** Math.floor(Math.log10(rawStep));
  const fraction = rawStep / power;
  const niceFraction = fraction <= 1 ? 1 : fraction <= 2 ? 2 : fraction <= 2.5 ? 2.5 : fraction <= 5 ? 5 : 10;
  const step = niceFraction * power;

  const ticks = [0];
  while (ticks[ticks.length - 1] < max) {
    ticks.push(ticks[ticks.length - 1] + step);
  }
  return ticks;
}

// First day of some months between two dates, spread evenly (about `count` of them).
export function monthTicks(start, end, count = 5) {
  const months =
    (end.getFullYear() - start.getFullYear()) * 12 + (end.getMonth() - start.getMonth());
  const every = Math.max(1, Math.ceil(months / count));

  const ticks = [];
  const date = new Date(start.getFullYear(), start.getMonth() + 1, 1);
  while (date <= end) {
    ticks.push(new Date(date));
    date.setMonth(date.getMonth() + every);
  }
  return ticks;
}

// SVG path through the points: "M x0 y0 L x1 y1 L x2 y2 ..."
export function linePath(points) {
  return points
    .map(([x, y], i) => `${i === 0 ? "M" : "L"} ${x.toFixed(1)} ${y.toFixed(1)}`)
    .join(" ");
}

// ---------- Responsive wrapper ----------

// Draws the chart with the real width of its box, and draws it again when the
// box changes size. This way the text keeps its real size on small screens
// instead of being scaled down with the whole SVG.
export function responsiveChart(draw, height = 260) {
  const box = h("div", { class: "chart" });
  let lastWidth = 0;

  const observer = new ResizeObserver(([entry]) => {
    const width = Math.round(entry.contentRect.width);
    if (width === 0 || width === lastWidth) return;
    lastWidth = width;
    box.replaceChildren(draw(width, height));
  });
  observer.observe(box);

  return box;
}

// ---------- Line chart ----------

// points: [{ x: Date, y: number }] sorted by x
export function lineChart(points, { width, height, formatY, formatX, label }) {
  const margin = { top: 16, right: 16, bottom: 28, left: 64 };
  const innerLeft = margin.left;
  const innerRight = width - margin.right;
  const innerTop = margin.top;
  const innerBottom = height - margin.bottom;

  const xMin = points[0].x.getTime();
  const xMax = points[points.length - 1].x.getTime();
  const yTicks = niceTicks(Math.max(...points.map((p) => p.y)));
  const yMax = yTicks[yTicks.length - 1];

  const toX = (date) => scale(date.getTime(), xMin, xMax, innerLeft, innerRight);
  const toY = (value) => scale(value, 0, yMax, innerBottom, innerTop); // reversed: big values go up

  const coords = points.map((p) => [toX(p.x), toY(p.y)]);
  const line = linePath(coords);
  const [lastX, lastY] = coords[coords.length - 1];
  // close the shape along the x axis to fill the area under the line
  const area = `${line} L ${lastX.toFixed(1)} ${innerBottom} L ${coords[0][0].toFixed(1)} ${innerBottom} Z`;

  const xTicks = monthTicks(points[0].x, points[points.length - 1].x, width < 420 ? 3 : 5);

  return svg("svg", {
      class: "line-chart",
      width,
      height,
      viewBox: `0 0 ${width} ${height}`,
      role: "img",
      "aria-label": label,
    },
    svg("title", {}, label),

    // horizontal grid lines with the Y labels
    yTicks.map((tick) =>
      svg("g", { class: "tick" },
        svg("line", { class: "grid", x1: innerLeft, x2: innerRight, y1: toY(tick), y2: toY(tick) }),
        svg("text", { class: "axis-label", x: innerLeft - 8, y: toY(tick), "text-anchor": "end", "dominant-baseline": "middle" }, formatY(tick)),
      ),
    ),

    // month labels on the X axis
    xTicks.map((date) =>
      svg("text", { class: "axis-label", x: toX(date), y: height - 8, "text-anchor": "middle" }, formatX(date)),
    ),

    svg("path", { class: "chart-area", d: area }),
    svg("path", { class: "chart-line", d: line }),
    svg("circle", { class: "chart-dot", cx: lastX, cy: lastY, r: 4 }),
  );
}
