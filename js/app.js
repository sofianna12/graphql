import { signin } from "./api.js";
import { saveToken, getToken, clearToken, isTokenValid } from "./auth.js";

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
