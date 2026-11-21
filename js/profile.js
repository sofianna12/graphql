// Builds the sections of the profile page from the processed data.
import { h } from "./dom.js";

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
