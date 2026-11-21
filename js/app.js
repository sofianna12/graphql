import { signin, graphql, AuthError } from "./api.js";
import { saveToken, getToken, clearToken, isTokenValid, getUserId } from "./auth.js";
import { setupGraphiql } from "./graphiql.js";
import { USER_QUERY, XP_QUERY, PROGRESS_QUERY, SKILLS_QUERY } from "./queries.js";
import {
  totalXp,
  currentLevel,
  recentXp,
  auditStats,
  projectStats,
  projectLists,
  topSkills,
  xpOverTime,
  xpByProject,
} from "./data.js";
import {
  renderUserSection,
  renderXpSection,
  renderAuditSection,
  renderLoading,
  renderError,
  renderStatsSection,
  fullName,
} from "./profile.js";

const loginView = document.querySelector("#login-view");
const appView = document.querySelector("#app-view");
const form = document.querySelector("#login-form");
const errorBox = document.querySelector("#login-error");
const button = document.querySelector("#login-button");
const logoutButton = document.querySelector("#logout-button");
const profileContent = document.querySelector("#profile-content");
const greeting = document.querySelector("#greeting");
const graphiqlPage = document.querySelector("#graphiql-page");
const tabs = document.querySelectorAll(".tab");

const graphiql = setupGraphiql({
  getUserId: () => getUserId(getToken()),
  onAuthError: (error) => {
    logout();
    showError(error.message);
  },
});
let graphiqlStarted = false;

// Hash routing: "#/graphiql" shows our GraphiQL, anything else the profile.
// The URL changes, so Back/Forward and refresh keep the right page.
function route() {
  const page = location.hash === "#/graphiql" ? "graphiql" : "profile";
  profileContent.hidden = page !== "profile";
  graphiqlPage.hidden = page !== "graphiql";

  tabs.forEach((tab) => {
    if (tab.dataset.page === page) tab.setAttribute("aria-current", "page");
    else tab.removeAttribute("aria-current");
  });

  if (page === "graphiql" && !graphiqlStarted) {
    graphiql.start();
    graphiqlStarted = true;
  }
}

window.addEventListener("hashchange", () => {
  if (!appView.hidden) route();
});

function showLogin() {
  appView.hidden = true;
  loginView.hidden = false;
  form.identifier.focus();
}

function showProfile() {
  loginView.hidden = true;
  appView.hidden = false;
  route();
  loadProfile();
}

// Increases on every load and on logout, so a slow old request
// can never show its data after the user logged out or retried.
let currentLoad = 0;

async function loadProfile() {
  const loadId = ++currentLoad;

  profileContent.setAttribute("aria-busy", "true");
  profileContent.replaceChildren(...renderLoading());

  try {
    const userId = getUserId(getToken());

    // All queries run at the same time instead of one after the other
    const [userData, xpData, progressData, skillsData] = await Promise.all([
      graphql(USER_QUERY),
      graphql(XP_QUERY, { userId }),
      graphql(PROGRESS_QUERY, { userId }),
      graphql(SKILLS_QUERY, { userId }),
    ]);

    if (loadId !== currentLoad) return; // a newer load or a logout happened meanwhile

    const user = userData.user[0]; // user is a list with only the logged-in user
    if (!user) throw new Error("No user data was found for this account.");
    const xp = xpData.transaction;
    const { projects, level } = progressData;

    greeting.textContent = `Hi, ${fullName(user).split(" ")[0]}`;
    profileContent.replaceChildren(
      renderUserSection(user),
      renderAuditSection(auditStats(user)),
      renderXpSection({
        level: currentLevel(level),
        totalXp: totalXp(xp),
        recent: recentXp(xp),
      }),
      renderStatsSection({
        xpTimeline: xpOverTime(xp),
        xpPerProject: xpByProject(xp),
        projectResults: projectStats(projects),
        projectNames: projectLists(projects),
        skills: topSkills(skillsData.transaction),
      }),
    );
  } catch (error) {
    if (loadId !== currentLoad) return;
    if (error instanceof AuthError) {
      logout();
      showError(error.message);
      return;
    }
    console.error(error);
    profileContent.replaceChildren(renderError(error.message, loadProfile));
  } finally {
    if (loadId === currentLoad) profileContent.removeAttribute("aria-busy");
  }
}

function showError(message) {
  // textContent (not innerHTML) so the text is never interpreted as HTML
  errorBox.textContent = message;
  errorBox.hidden = false;
}

function hideError() {
  errorBox.hidden = true;
  errorBox.textContent = "";
}

function setLoading(isLoading) {
  button.disabled = isLoading;
  button.textContent = isLoading ? "Signing in…" : "Sign in";
}

form.addEventListener("submit", async (event) => {
  event.preventDefault();
  hideError();

  // trim() removes accidental spaces; never trim the password
  const identifier = form.identifier.value.trim();
  const password = form.password.value;

  if (!identifier || !password) {
    showError("Please fill in both fields.");
    return;
  }

  setLoading(true);
  try {
    const token = await signin(identifier, password);
    saveToken(token);
    form.reset(); // don't leave the password in the form
    showProfile();
  } catch (error) {
    showError(error.message);
  } finally {
    setLoading(false);
  }
});

function logout() {
  currentLoad++; // ignore any request that is still running
  clearToken();
  profileContent.replaceChildren(); // remove the previous user's data from the page
  profileContent.removeAttribute("aria-busy");
  greeting.textContent = "Profile";
  graphiql.reset(); // forget the previous user's queries and results
  graphiqlStarted = false;
  history.replaceState(null, "", "#/"); // the next login starts on the profile
  showLogin();
}

logoutButton.addEventListener("click", logout);

// On page load: stay logged in if we still have a valid token
if (isTokenValid(getToken())) {
  showProfile();
} else {
  clearToken();
  showLogin();
}
