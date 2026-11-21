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
