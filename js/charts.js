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

// Index of the value in a sorted list that is closest to `value` (binary search).
//   nearestIndex([10, 20, 30], 24) -> 1
export function nearestIndex(sorted, value) {
  if (sorted.length === 0) return -1;
  let low = 0;
  let high = sorted.length - 1;
  while (low < high) {
    const middle = Math.floor((low + high) / 2);
    if (sorted[middle] < value) low = middle + 1;
    else high = middle;
  }
  // `low` is the first value >= value; the one before it may be closer
  if (low > 0 && value - sorted[low - 1] <= sorted[low] - value) return low - 1;
  return low;
}

// ---------- Tooltip ----------

// A small HTML box placed over the chart. Lines: first one is bold.
function createTooltip(chartWidth) {
  const element = h("div", { class: "chart-tooltip", role: "status", "aria-live": "polite", hidden: true });
  return {
    element,
    show(lines, x, y) {
      element.replaceChildren(...lines.map((line, i) => h(i === 0 ? "strong" : "span", {}, line)));
      element.style.left = `${x}px`;
      element.style.top = `${y}px`;
      // near the edges, align the box so it stays inside the chart
      element.dataset.align = x < 90 ? "left" : x > chartWidth - 90 ? "right" : "center";
      element.hidden = false;
    },
    hide() {
      element.hidden = true;
    },
  };
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

// points: [{ x: Date, y: number, ... }] sorted by x
// tooltip(point) returns the lines shown for a point
export function lineChart(points, { width, height, formatY, formatX, label, tooltip }) {
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

  // ----- interaction: a vertical line, a dot and a tooltip on the nearest point -----
  const tip = createTooltip(width);
  const focusLine = svg("line", { class: "focus-line", y1: innerTop, y2: innerBottom, visibility: "hidden" });
  const focusDot = svg("circle", { class: "chart-dot", r: 5, visibility: "hidden" });
  const xs = coords.map(([x]) => x);
  let active = -1;

  function showPoint(index) {
    active = index;
    const [x, y] = coords[index];
    focusLine.setAttribute("x1", x);
    focusLine.setAttribute("x2", x);
    focusDot.setAttribute("cx", x);
    focusDot.setAttribute("cy", y);
    focusLine.setAttribute("visibility", "visible");
    focusDot.setAttribute("visibility", "visible");
    tip.show(tooltip(points[index]), x, y - 12);
  }

  function hidePoint() {
    focusLine.setAttribute("visibility", "hidden");
    focusDot.setAttribute("visibility", "hidden");
    tip.hide();
  }

  // pointer events work with mouse, pen and touch
  const onPointer = (event) => {
    const box = chart.getBoundingClientRect();
    showPoint(nearestIndex(xs, event.clientX - box.left));
  };
  const overlay = svg("rect", {
    class: "chart-overlay",
    x: innerLeft,
    y: innerTop,
    width: innerRight - innerLeft,
    height: innerBottom - innerTop,
  });
  overlay.addEventListener("pointermove", onPointer);
  overlay.addEventListener("pointerdown", onPointer);
  overlay.addEventListener("pointerleave", hidePoint);

  const chart = svg("svg", {
      class: "line-chart",
      width,
      height,
      viewBox: `0 0 ${width} ${height}`,
      role: "img",
      "aria-label": `${label}. Use the left and right arrow keys to read each point.`,
      tabindex: 0, // keyboard users can focus the chart and use the arrow keys
    },

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
    focusLine,
    focusDot,
    overlay,
  );

  // keyboard: arrows move between points, Home/End jump to the first/last one
  chart.addEventListener("keydown", (event) => {
    const last = points.length - 1;
    const moves = {
      ArrowLeft: Math.max(0, active - 1),
      ArrowRight: Math.min(last, active + 1),
      Home: 0,
      End: last,
    };
    if (!(event.key in moves)) return;
    event.preventDefault(); // don't scroll the page
    showPoint(moves[event.key]);
  });
  chart.addEventListener("focus", () => showPoint(active >= 0 ? active : points.length - 1));
  chart.addEventListener("blur", hidePoint);

  return h("div", { class: "chart-inner" }, chart, tip.element);
}

// ---------- Bar chart ----------

// Shortens a text to maxChars, ending with "…" (SVG text has no CSS ellipsis).
export function truncate(text, maxChars) {
  if (text.length <= maxChars) return text;
  return `${text.slice(0, Math.max(1, maxChars - 1))}…`;
}

export const BAR_ROW_HEIGHT = 28;

// Horizontal bars, one row per item: name | bar | value
// items: [{ name: string, value: number }] already sorted
export function barChart(items, { width, formatValue, label }) {
  const tip = createTooltip(width);
  const labelWidth = Math.min(170, Math.round(width * 0.4));
  const valueWidth = 64;
  const barStart = labelWidth + 8;
  const barEnd = width - valueWidth;
  const maxChars = Math.floor(labelWidth / 7); // about 7px per character at 12px
  const max = Math.max(...items.map((item) => item.value));
  const height = items.length * BAR_ROW_HEIGHT;

  const chart = svg("svg", {
      class: "bar-chart",
      width,
      height,
      viewBox: `0 0 ${width} ${height}`,
      role: "list",
      "aria-label": label,
    },
    items.map((item, i) => {
      const y = i * BAR_ROW_HEIGHT;
      const middle = y + BAR_ROW_HEIGHT / 2;
      const barWidth = Math.max(2, scale(item.value, 0, max, 0, barEnd - barStart));

      const row = svg("g", {
          class: "bar-row",
          role: "listitem",
          tabindex: 0, // each bar can be reached with Tab
          "aria-label": `${item.name}: ${formatValue(item.value)}`,
        },
        // invisible full-width rectangle, so the whole row reacts to the pointer
        svg("rect", { class: "bar-hit", x: 0, y, width, height: BAR_ROW_HEIGHT }),
        svg("text", { class: "axis-label bar-name", x: 0, y: middle, "dominant-baseline": "middle" },
          truncate(item.name, maxChars)),
        svg("rect", { class: "bar-rect", x: barStart, y: y + 6, width: barWidth, height: BAR_ROW_HEIGHT - 12, rx: 3 }),
        svg("text", { class: "axis-label bar-value", x: barStart + barWidth + 6, y: middle, "dominant-baseline": "middle" },
          formatValue(item.value)),
      );

      // the full name (it may be cut with "…") and the value
      const show = () => tip.show([item.name, formatValue(item.value)], barStart + barWidth / 2, y + 4);
      row.addEventListener("pointerenter", show);
      row.addEventListener("focus", show);
      row.addEventListener("pointerleave", tip.hide);
      row.addEventListener("blur", tip.hide);
      return row;
    }),
  );

  return h("div", { class: "chart-inner" }, chart, tip.element);
}

// ---------- Donut chart ----------

// The circumference of a circle with this radius is 100,
// so in stroke-dasharray 1 unit = 1% of the circle.
const DONUT_RADIUS = 100 / (2 * Math.PI); // ≈ 15.915

// Turns values into donut segments: percent of the total and where each one starts.
//   donutSegments([3, 1]) -> [{ percent: 75, start: 0 }, { percent: 25, start: 75 }]
export function donutSegments(values) {
  const total = values.reduce((sum, v) => sum + v, 0);
  let start = 0;
  return values.map((value) => {
    const percent = total === 0 ? 0 : (value / total) * 100;
    const segment = { value, percent, start };
    start += percent;
    return segment;
  });
}

// items: [{ name, value, className }]; center: { value, label }
export function donutChart(items, { center, label, formatValue }) {
  const size = 42; // viewBox units; the CSS gives the real size
  const middle = size / 2;
  const segments = donutSegments(items.map((item) => item.value));
  const tip = createTooltip(180);

  const chart = svg("svg", {
      class: "donut-chart",
      viewBox: `0 0 ${size} ${size}`,
      role: "list",
      "aria-label": label,
    },
    // grey ring behind the segments
    svg("circle", { class: "donut-track", cx: middle, cy: middle, r: DONUT_RADIUS }),

    segments.map((segment, i) => {
      const item = items[i];
      if (segment.percent === 0) return null;

      const ring = svg("circle", {
        class: `donut-segment ${item.className}`,
        cx: middle,
        cy: middle,
        r: DONUT_RADIUS,
        // draw `percent`, then leave the rest of the circle empty
        "stroke-dasharray": `${segment.percent} ${100 - segment.percent}`,
        // circles start at 3 o'clock: +25 moves the start to 12 o'clock
        "stroke-dashoffset": 25 - segment.start,
        role: "listitem",
        tabindex: 0,
        "aria-label": `${item.name}: ${formatValue(item.value)} (${Math.round(segment.percent)}%)`,
      });

      const show = () =>
        tip.show([item.name, `${formatValue(item.value)} · ${Math.round(segment.percent)}%`], 90, 20);
      ring.addEventListener("pointerenter", show);
      ring.addEventListener("focus", show);
      ring.addEventListener("pointerleave", tip.hide);
      ring.addEventListener("blur", tip.hide);
      return ring;
    }),

    svg("text", { class: "donut-value", x: middle, y: middle - 1, "text-anchor": "middle" }, center.value),
    svg("text", { class: "donut-label", x: middle, y: middle + 5, "text-anchor": "middle" }, center.label),
  );

  return h("div", { class: "chart-inner donut-inner" }, chart, tip.element);
}
