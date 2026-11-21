// Builds the sections of the profile page from the processed data.
import { h, svg } from "./dom.js";
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
