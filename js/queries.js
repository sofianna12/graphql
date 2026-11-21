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
    }
  }
`;
