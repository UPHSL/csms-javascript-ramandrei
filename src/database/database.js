import { DatabaseSync } from "node:sqlite";
import fs from "node:fs";
import path from "node:path";

export function createDatabase(databasePath) {
  const directory = path.dirname(databasePath);

  fs.mkdirSync(directory, {
    recursive: true
  });

  const database = new DatabaseSync(databasePath);

  database.exec(`
    CREATE TABLE IF NOT EXISTS residents (
      id INTEGER PRIMARY KEY AUTOINCREMENT,
      first_name TEXT NOT NULL,
      last_name TEXT NOT NULL,
      address TEXT NOT NULL,
      contact_number TEXT NOT NULL,
      email TEXT NOT NULL,
      status TEXT NOT NULL
    )
  `);

  return database;
}