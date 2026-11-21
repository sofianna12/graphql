// All the GraphQL queries of the project, in one place.

// Normal query: no arguments, just the fields we need.
// attrs(path: ...) picks single fields from the attrs JSON,
// so private data (phone, address, ...) is never downloaded.
export const USER_QUERY = `
  {
    user {
      id
      login
      firstName: attrs(path: "firstName")
      lastName: attrs(path: "lastName")
      email: attrs(path: "email")
      campus
      createdAt
      auditRatio
      totalUp
      totalUpBonus
      totalDown
    }
  }
`;

// Query with arguments and variables: the XP transactions of the main
// curriculum (div-01), oldest first. Piscine XP is excluded, like on the dashboard.
export const XP_QUERY = `
  query Xp($userId: Int!) {
    transaction(
      where: {
        userId: { _eq: $userId }
        type: { _eq: "xp" }
        event: { path: { _eq: "/athens/div-01" } }
      }
      order_by: { createdAt: asc }
    ) {
      amount
      createdAt
      path
      object {
        name
        type
      }
    }
  }
`;

// Nested query + aliases: two lists from one request.
// - projects: every project attempt, with its object (name, type) nested inside
// - level: the highest level transaction of div-01 (= current level)
// grade >= 1 means PASS, grade < 1 means FAIL, grade null means not graded yet.
export const PROGRESS_QUERY = `
  query Progress($userId: Int!) {
    projects: progress(
      where: {
        userId: { _eq: $userId }
        object: { type: { _eq: "project" } }
      }
      order_by: { createdAt: desc }
    ) {
      grade
      createdAt
      path
      object {
        name
        type
      }
    }
    level: transaction(
      where: {
        userId: { _eq: $userId }
        type: { _eq: "level" }
        event: { path: { _eq: "/athens/div-01" } }
      }
      order_by: { amount: desc }
      limit: 1
    ) {
      amount
    }
  }
`;
