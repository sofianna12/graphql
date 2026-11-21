// Builds the sections of the profile page from the processed data.
import { h, svg } from "./dom.js";
import { responsiveChart, lineChart, barChart, donutChart, BAR_ROW_HEIGHT } from "./charts.js";
import { formatBytes, formatRatio, auditMessage, barPercent } from "./data.js";

export function fullName(user) {
  const name = [user.firstName, user.lastName]
    .map((part) => (part ?? "").trim())
    .filter(Boolean)
    .join(" ");
  return name || user.login; // fall back to the login if there is no name
}

function formatDate(isoDate) {
  return new Date(isoDate).toLocaleDateString("en-GB", {
    day: "numeric",
    month: "short",
    year: "numeric",
  });
}

function capitalize(text) {
  return text ? text[0].toUpperCase() + text.slice(1) : "";
}

// Section 1: basic user identification
export function renderUserSection(user) {
  return h("section", { class: "card", "aria-labelledby": "user-title" },
    h("h2", { id: "user-title" }, fullName(user)),
    h("p", { class: "muted" }, `@${user.login}`),
    h("dl", { class: "details" },
      h("dt", {}, "User ID"), h("dd", {}, user.id),
      h("dt", {}, "Email"), h("dd", {}, user.email ?? "–"),
      h("dt", {}, "Campus"), h("dd", {}, capitalize(user.campus) || "–"),
      h("dt", {}, "Joined"), h("dd", {}, formatDate(user.createdAt)),
    ),
  );
}

// A big number with a small label under it
function stat(label, value) {
  return h("div", { class: "stat" },
    h("span", { class: "stat-value" }, value),
    h("span", { class: "stat-label" }, label),
  );
}

// Section 2: XP and level
export function renderXpSection({ level, totalXp, recent }) {
  return h("section", { class: "card", "aria-labelledby": "xp-title" },
    h("h2", { id: "xp-title" }, "Progress"),
    h("div", { class: "stats" },
      stat("Level", level),
      stat("Total XP", formatBytes(totalXp)),
    ),
    h("h3", {}, "Recent XP"),
    recent.length === 0
      ? h("p", { class: "muted" }, "No XP yet.")
      : h("ul", { class: "activity" },
          recent.map((item) =>
            h("li", {},
              // title shows the full name on hover when it is cut with "…"
              h("span", { class: "activity-name", title: item.name }, item.name),
              h("span", { class: "activity-amount" }, `+${formatBytes(item.amount)}`),
              h("time", { class: "activity-date", datetime: item.date.toISOString() }, formatDate(item.date)),
            ),
          ),
        ),
  );
}

// One horizontal bar drawn with SVG: a grey track and a colored part on top.
function bar(percent, className) {
  return svg("svg", {
      class: "bar",
      viewBox: "0 0 100 8",
      preserveAspectRatio: "none", // stretch to the full width of the card
      "aria-hidden": "true", // the numbers next to it are read instead
    },
    svg("rect", { class: "bar-track", x: 0, y: 0, width: 100, height: 8, rx: 4 }),
    svg("rect", { class: `bar-fill ${className}`, x: 0, y: 0, width: percent, height: 8, rx: 4 }),
  );
}

// Section 3: audits
export function renderAuditSection({ ratio, done, bonus, received }) {
  const max = Math.max(done + bonus, received);
  const message = auditMessage(ratio);

  return h("section", { class: "card", "aria-labelledby": "audit-title" },
    h("h2", { id: "audit-title" }, "Audits"),
    h("div", { class: "stats" },
      h("div", { class: "stat" },
        h("span", { class: `stat-value ratio-${message.level}` }, formatRatio(ratio)),
        h("span", { class: "stat-label" }, `Audit ratio · ${message.text}`),
      ),
    ),
    h("div", { class: "audit-bars" },
      h("span", { class: "audit-label" }, "Done"),
      bar(barPercent(done + bonus, max), "bar-done"),
      h("span", { class: "audit-value" },
        formatBytes(done),
        bonus > 0 && h("small", {}, ` + ${formatBytes(bonus)}`),
      ),
      h("span", { class: "audit-label" }, "Received"),
      bar(barPercent(received, max), "bar-received"),
      h("span", { class: "audit-value" }, formatBytes(received)),
    ),
  );
}

// Loading state: grey placeholder cards with the shape of the real ones (skeletons)
export function renderLoading() {
  const skeletonCard = () =>
    h("div", { class: "card skeleton-card", "aria-hidden": "true" },
      h("div", { class: "skeleton skeleton-title" }),
      h("div", { class: "skeleton skeleton-line" }),
      h("div", { class: "skeleton skeleton-line" }),
      h("div", { class: "skeleton skeleton-line short" }),
    );

  return [
    h("p", { class: "visually-hidden", role: "status" }, "Loading your profile…"),
    skeletonCard(),
    skeletonCard(),
    skeletonCard(),
  ];
}

// Error state: a clear message and a way to try again
export function renderError(message, onRetry) {
  return h("section", { class: "card error-card", role: "alert" },
    h("h2", {}, "Could not load your profile"),
    h("p", { class: "muted" }, message),
    h("button", { class: "btn btn-primary", type: "button", onclick: onRetry }, "Try again"),
  );
}

// A card for one graph: title, a sentence that explains the data, and the chart
function chartCard(title, description, chart) {
  return h("figure", { class: "chart-card" },
    h("figcaption", {},
      h("h3", {}, title),
      h("p", { class: "muted" }, description),
    ),
    chart,
  );
}

// Full year on purpose: "Nov 26" could be read as "26 November"
const formatMonth = (date) =>
  date.toLocaleDateString("en-GB", { month: "short", year: "numeric" });

// Section 4: statistics (graphs)
const TOP_PROJECTS = 10;

// Pass/fail donut with a legend next to it
// A collapsible list of project names under the legend
function projectDetails(title, items, describe) {
  if (items.length === 0) return null;
  return h("details", { class: "project-details" },
    h("summary", {}, `${title} (${items.length})`),
    h("ul", {},
      items.map((item) =>
        h("li", {},
          h("span", { class: "project-name" }, item.name),
          h("span", { class: "muted" }, describe(item)),
        ),
      ),
    ),
  );
}

function passFailChart({ passed, failed, inProgress }, lists) {
  const graded = passed + failed;
  if (graded === 0) return h("p", { class: "muted" }, "No graded projects yet.");

  const passRate = Math.round((passed / graded) * 100);
  const items = [
    { name: "Passed", value: passed, className: "donut-pass" },
    { name: "Failed", value: failed, className: "donut-fail" },
  ];
  const count = (n) => `${n} ${n === 1 ? "attempt" : "attempts"}`;

  return h("div", { class: "donut-layout" },
    donutChart(items, {
      center: { value: `${passRate}%`, label: "pass rate" },
      label: `Project attempts: ${passed} passed, ${failed} failed, pass rate ${passRate}%`,
      formatValue: count,
    }),
    h("ul", { class: "legend" },
      items.map((item) =>
        h("li", {},
          h("span", { class: `legend-dot ${item.className}`, "aria-hidden": "true" }),
          h("span", {}, item.name),
          h("strong", {}, item.value),
        ),
      ),
      h("li", { class: "muted" },
        h("span", { class: "legend-dot donut-progress", "aria-hidden": "true" }),
        h("span", {}, "In progress"),
        h("strong", {}, inProgress),
      ),
    ),
    h("div", { class: "project-lists" },
      projectDetails("Failed", lists.failed, (p) =>
        `${formatDate(p.date)}${p.passedLater ? " · passed later ✓" : ""}`),
      projectDetails("In progress", lists.inProgress, (p) => `started ${formatDate(p.date)}`),
    ),
  );
}

export function renderStatsSection({ xpTimeline, xpPerProject, projectResults, projectNames }) {
  const xpChart =
    xpTimeline.length === 0
      ? h("p", { class: "muted" }, "No XP yet.")
      : responsiveChart((width, height) =>
          lineChart(
            xpTimeline.map((p) => ({ x: p.date, y: p.total, amount: p.amount, name: p.name })),
            {
              width,
              height,
              formatY: formatBytes,
              formatX: formatMonth,
              tooltip: (point) => [
                formatDate(point.x),
                `${formatBytes(point.y)} total`,
                `+${formatBytes(point.amount)} · ${point.name}`,
              ],
              label: `XP over time, from 0 to ${formatBytes(xpTimeline[xpTimeline.length - 1].total)}`,
            },
          ),
        );

  const topProjects = xpPerProject.slice(0, TOP_PROJECTS);
  const projectChart =
    topProjects.length === 0
      ? h("p", { class: "muted" }, "No project XP yet.")
      : responsiveChart(
          (width) =>
            barChart(
              topProjects.map((p) => ({ name: p.name, value: p.amount })),
              {
                width,
                formatValue: formatBytes,
                label: `XP by project, highest: ${topProjects[0].name} with ${formatBytes(topProjects[0].amount)}`,
              },
            ),
          topProjects.length * BAR_ROW_HEIGHT,
        );

  return h("section", { class: "card stats-section", "aria-labelledby": "stats-title" },
    h("h2", { id: "stats-title" }, "Statistics"),
    h("div", { class: "chart-grid" },
      chartCard(
        "XP over time",
        "Total XP earned in the main curriculum (div-01), piscines excluded.",
        xpChart,
      ),
      chartCard(
        "XP by project",
        `Top ${topProjects.length} of ${xpPerProject.length} projects by XP earned (exercises excluded).`,
        projectChart,
      ),
      chartCard(
        "Projects pass / fail",
        "Every graded project attempt: grade ≥ 1 is a pass, below 1 is a fail. Projects not graded yet are not in the chart.",
        passFailChart(projectResults, projectNames),
      ),
    ),
  );
}
