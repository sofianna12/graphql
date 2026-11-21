// Our own GraphiQL: a small editor that runs any query with the user's JWT
// and shows the raw JSON response (data or errors).
import { graphqlRequest, AuthError } from "./api.js";

// The three query types asked by the audit, plus schema introspection
const EXAMPLES = {
  normal: {
    query: `# Normal query: just fields, no arguments
{
  user {
    id
    login
    campus
    auditRatio
  }
}`,
    variables: {},
  },
  nested: {
    query: `# Nested query: object { ... } is inside progress
{
  progress(limit: 5, order_by: { createdAt: desc }) {
    grade
    createdAt
    object {
      name
      type
    }
  }
}`,
    variables: {},
  },
  arguments: {
    query: `# Query with arguments and a variable
query LastXp($userId: Int!, $limit: Int!) {
  transaction(
    where: { userId: { _eq: $userId }, type: { _eq: "xp" } }
    order_by: { createdAt: desc }
    limit: $limit
  ) {
    amount
    path
    createdAt
  }
}`,
    variables: { limit: 5 }, // userId is added from the token
  },
  schema: {
    query: `# Introspection: GraphQL describes itself
{
  __type(name: "user") {
    name
    fields {
      name
      type { name kind ofType { name } }
    }
  }
}`,
    variables: {},
  },
};

const STORAGE_KEY = "graphiql-last";

// Called once by app.js. Returns a reset() function used on logout.
export function setupGraphiql({ getUserId, onAuthError }) {
  const form = document.querySelector("#graphiql-form");
  const queryInput = form.query;
  const variablesInput = form.variables;
  const runButton = document.querySelector("#graphiql-run");
  const output = document.querySelector("#graphiql-output");
  const status = document.querySelector("#graphiql-status");

  function loadExample(name) {
    const example = EXAMPLES[name];
    const variables = { ...example.variables };
    if (example.query.includes("$userId")) variables.userId = getUserId();
    queryInput.value = example.query;
    variablesInput.value = JSON.stringify(variables, null, 2);
    queryInput.focus();
  }

  function show(text, statusText, isError = false) {
    output.textContent = text; // textContent: the response is shown as text, never as HTML
    output.classList.toggle("is-error", isError);
    status.textContent = statusText;
  }

  async function run() {
    let variables = {};
    try {
      variables = variablesInput.value.trim() ? JSON.parse(variablesInput.value) : {};
    } catch (error) {
      show(`Variables are not valid JSON:\n${error.message}`, "Not sent", true);
      return;
    }

    try {
      sessionStorage.setItem(STORAGE_KEY, JSON.stringify({ query: queryInput.value, variables: variablesInput.value }));
    } catch {
      // storage can be blocked (private mode): the editor still works
    }

    runButton.disabled = true;
    status.textContent = "Running…";
    const start = performance.now();

    try {
      const json = await graphqlRequest(queryInput.value, variables);
      const ms = Math.round(performance.now() - start);
      const firstList = json.data && Object.values(json.data).find(Array.isArray);
      const count = firstList ? ` · ${firstList.length} ${firstList.length === 1 ? "row" : "rows"}` : "";
      show(
        JSON.stringify(json, null, 2),
        json.errors ? `${ms} ms · error` : `${ms} ms${count}`,
        Boolean(json.errors),
      );
    } catch (error) {
      if (error instanceof AuthError) {
        onAuthError(error);
        return;
      }
      show(error.message, "Request failed", true);
    } finally {
      runButton.disabled = false;
    }
  }

  form.addEventListener("submit", (event) => {
    event.preventDefault();
    run();
  });

  // Ctrl+Enter (Cmd+Enter on Mac) runs the query from any textarea
  form.addEventListener("keydown", (event) => {
    if (event.key === "Enter" && (event.ctrlKey || event.metaKey)) {
      event.preventDefault();
      run();
    }
  });

  form.querySelectorAll("[data-example]").forEach((button) => {
    button.addEventListener("click", () => loadExample(button.dataset.example));
  });

  // Restore the last query of this tab, or start with the normal example
  function start() {
    let saved = null;
    try {
      saved = JSON.parse(sessionStorage.getItem(STORAGE_KEY));
    } catch {
      saved = null;
    }
    if (saved) {
      queryInput.value = saved.query;
      variablesInput.value = saved.variables;
    } else {
      loadExample("normal");
    }
  }

  // On logout: forget everything of the previous user
  function reset() {
    try {
      sessionStorage.removeItem(STORAGE_KEY);
    } catch {
      // ignore
    }
    queryInput.value = "";
    variablesInput.value = "";
    show("Press Run to see the response.", "");
  }

  return { start, reset };
}
