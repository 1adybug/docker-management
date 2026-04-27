export const DatabaseUrl = process.env.NODE_ENV === "development" ? "file:./data/development.db" : "file:./data/production.db"
