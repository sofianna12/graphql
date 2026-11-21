import { signin, graphql, AuthError } from "./api.js";
import { saveToken, getToken, clearToken, isTokenValid, getUserId } from "./auth.js";
import { USER_QUERY, XP_QUERY, PROGRESS_QUERY } from "./queries.js";

const loginView = document.querySelector("#login-view");
const appView = document.querySelector("#app-view");
const form = document.querySelector("#login-form");
const errorBox = document.querySelector("#login-error");
const button = document.querySelector("#login-button");
const logoutButton = document.querySelector("#logout-button");
const profileContent = document.querySelector("#profile-content");

function showLogin() {
  appView.hidden = true;
  loginView.hidden = false;
  form.identifier.focus();
}

function showProfile() {
  loginView.hidden = true;
  appView.hidden = false;
  loadProfile();
}

async function loadProfile() {
  try {
    const userId = getUserId(getToken());

    // All queries run at the same time instead of one after the other
    const [userData, xpData, progressData] = await Promise.all([
      graphql(USER_QUERY),
      graphql(XP_QUERY, { userId }),
      graphql(PROGRESS_QUERY, { userId }),
    ]);

    const user = userData.user[0]; // user is a list with only the logged-in user
    const xp = xpData.transaction;
    const { projects, level } = progressData;

    // temporary: the calculations move to data.js in #11, the UI comes in Milestone 3
    const totalXp = xp.reduce((sum, t) => sum + t.amount, 0);
    console.log(user);
    console.log(`${xp.length} XP transactions, total ${totalXp} (= ${Math.round(totalXp / 1000)} kB)`);
    console.log("First XP project:", xp[0]?.object?.name);
    console.log("Audit ratio:", user.auditRatio, "| up:", user.totalUp, "| bonus:", user.totalUpBonus, "| down:", user.totalDown);
    console.log("Level:", level[0]?.amount);
    console.log(`${projects.length} project attempts`);
  } catch (error) {
    if (error instanceof AuthError) {
      logout();
      showError(error.message);
      return;
    }
    console.error(error);
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
  clearToken();
  profileContent.replaceChildren(); // remove the previous user's data from the page
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
