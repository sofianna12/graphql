// Builds the sections of the profile page from the processed data.
import { h } from "./dom.js";
import { formatBytes } from "./data.js";

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
