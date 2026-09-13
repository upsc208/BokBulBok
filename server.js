import express from 'express';
import crypto from 'crypto';
import path from 'path';
import { fileURLToPath } from 'url';
import { initDb, run, all, get } from './db.js';

const __dirname = path.dirname(fileURLToPath(import.meta.url));

const PORT = process.env.PORT || 8080;
const CLIENT_ID_RE = /^[a-zA-Z0-9-]{8,64}$/;
const MAX_NAME_LEN = 30;

await initDb();

const app = express();
app.use(express.json());
app.use(express.static(path.join(__dirname, 'dist')));

function todayKey() {
  return new Date().toISOString().slice(0, 10); // YYYY-MM-DD
}

function menusWithVotes(date) {
  return all(
    `SELECT m.id as id, m.name as name,
            (SELECT COUNT(*) FROM votes v WHERE v.menu_id = m.id AND v.date = m.date) as votes
     FROM menus m WHERE m.date = ? ORDER BY m.name`,
    [date]
  );
}

app.get('/api/menus', (req, res) => {
  const date = todayKey();
  res.json({ date, menus: menusWithVotes(date) });
});

app.post('/api/menus', (req, res) => {
  const name = typeof req.body?.name === 'string' ? req.body.name.trim() : '';
  if (!name || name.length > MAX_NAME_LEN) {
    return res.status(400).json({ error: 'invalid name' });
  }

  const date = todayKey();
  const existing = get(`SELECT id FROM menus WHERE date = ? AND LOWER(name) = LOWER(?)`, [date, name]);
  if (!existing) {
    run(`INSERT INTO menus (id, date, name) VALUES (?, ?, ?)`, [crypto.randomUUID(), date, name]);
  }

  res.json({ date, menus: menusWithVotes(date) });
});

app.get('/api/my-vote', (req, res) => {
  const clientId = req.query.clientId;
  if (typeof clientId !== 'string' || !CLIENT_ID_RE.test(clientId)) {
    return res.json({ menuId: null });
  }
  const date = todayKey();
  const row = get(`SELECT menu_id as menuId FROM votes WHERE date = ? AND client_id = ?`, [date, clientId]);
  res.json({ menuId: row ? row.menuId : null });
});

app.post('/api/vote', (req, res) => {
  const { clientId, menuId } = req.body || {};
  if (typeof clientId !== 'string' || !CLIENT_ID_RE.test(clientId)) {
    return res.status(400).json({ error: 'invalid clientId' });
  }

  const date = todayKey();
  const menu = get(`SELECT id FROM menus WHERE id = ? AND date = ?`, [menuId, date]);
  if (!menu) {
    return res.status(400).json({ error: 'invalid menuId' });
  }

  run(
    `INSERT INTO votes (date, client_id, menu_id) VALUES (?, ?, ?)
     ON CONFLICT(date, client_id) DO UPDATE SET menu_id = excluded.menu_id`,
    [date, clientId, menuId]
  );

  res.json({ date, menus: menusWithVotes(date) });
});

app.post('/api/coffee-result', (req, res) => {
  const winnerName = typeof req.body?.winnerName === 'string' ? req.body.winnerName.trim() : '';
  const participants = Array.isArray(req.body?.participants)
    ? req.body.participants.filter((p) => typeof p === 'string').slice(0, 50)
    : [];

  if (!winnerName || winnerName.length > MAX_NAME_LEN || participants.length < 2) {
    return res.status(400).json({ error: 'invalid payload' });
  }

  run(
    `INSERT INTO coffee_results (date, winner_name, participants, created_at) VALUES (?, ?, ?, ?)`,
    [todayKey(), winnerName, JSON.stringify(participants), new Date().toISOString()]
  );

  res.json({ ok: true });
});

app.get('/api/history', (req, res) => {
  const year = parseInt(req.query.year, 10);
  const month = parseInt(req.query.month, 10); // 1-12
  if (!Number.isInteger(year) || !Number.isInteger(month) || month < 1 || month > 12) {
    return res.status(400).json({ error: 'invalid year/month' });
  }
  const prefix = `${year}-${String(month).padStart(2, '0')}%`;

  const menuRows = all(
    `SELECT m.date as date, m.name as name,
            (SELECT COUNT(*) FROM votes v WHERE v.menu_id = m.id AND v.date = m.date) as votes
     FROM menus m WHERE m.date LIKE ? ORDER BY m.date, votes DESC`,
    [prefix]
  );
  const coffeeRows = all(
    `SELECT date, winner_name as winnerName FROM coffee_results WHERE date LIKE ? ORDER BY date, created_at`,
    [prefix]
  );

  const history = {};
  for (const row of menuRows) {
    if (!history[row.date]) history[row.date] = { menus: [], coffeeWinners: [] };
    history[row.date].menus.push({ name: row.name, votes: row.votes });
  }
  for (const row of coffeeRows) {
    if (!history[row.date]) history[row.date] = { menus: [], coffeeWinners: [] };
    history[row.date].coffeeWinners.push(row.winnerName);
  }

  res.json({ history });
});

app.listen(PORT, '0.0.0.0', () => {
  console.log(`Server listening on http://0.0.0.0:${PORT}`);
});
