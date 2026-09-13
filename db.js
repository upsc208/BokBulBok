import initSqlJs from 'sql.js';
import fs from 'fs';
import path from 'path';

const DB_PATH = path.join(process.cwd(), 'data', 'app.db');
const SQLJS_DIST = path.join(process.cwd(), 'node_modules', 'sql.js', 'dist');

let db;

export async function initDb() {
  const SQL = await initSqlJs({
    locateFile: (file) => path.join(SQLJS_DIST, file)
  });

  fs.mkdirSync(path.dirname(DB_PATH), { recursive: true });

  db = fs.existsSync(DB_PATH)
    ? new SQL.Database(fs.readFileSync(DB_PATH))
    : new SQL.Database();

  db.run(`
    CREATE TABLE IF NOT EXISTS menus (
      id TEXT PRIMARY KEY,
      date TEXT NOT NULL,
      name TEXT NOT NULL
    );
    CREATE TABLE IF NOT EXISTS votes (
      date TEXT NOT NULL,
      client_id TEXT NOT NULL,
      menu_id TEXT NOT NULL,
      PRIMARY KEY (date, client_id)
    );
    CREATE TABLE IF NOT EXISTS coffee_results (
      date TEXT NOT NULL,
      winner_name TEXT NOT NULL,
      participants TEXT NOT NULL,
      created_at TEXT NOT NULL
    );
  `);

  persist();
}

function persist() {
  fs.writeFileSync(DB_PATH, Buffer.from(db.export()));
}

export function run(sql, params = []) {
  db.run(sql, params);
  persist();
}

export function all(sql, params = []) {
  const stmt = db.prepare(sql);
  stmt.bind(params);
  const rows = [];
  while (stmt.step()) rows.push(stmt.getAsObject());
  stmt.free();
  return rows;
}

export function get(sql, params = []) {
  return all(sql, params)[0] || null;
}
