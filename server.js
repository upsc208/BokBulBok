import express from 'express';
import crypto from 'crypto';
import fs from 'fs';
import path from 'path';
import { fileURLToPath } from 'url';

const __dirname = path.dirname(fileURLToPath(import.meta.url));

const PORT = process.env.PORT || 8080;
const STORE_PATH = path.join(__dirname, 'data', 'store.json');
const CLIENT_ID_RE = /^[a-zA-Z0-9-]{8,64}$/;
const MAX_NAME_LEN = 30;

const app = express();
app.use(express.json());
app.use(express.static(path.join(__dirname, 'dist')));

function todayKey() {
  return new Date().toISOString().slice(0, 10); // YYYY-MM-DD
}

function loadStore() {
  if (!fs.existsSync(STORE_PATH)) return {};
  return JSON.parse(fs.readFileSync(STORE_PATH, 'utf8'));
}

function saveStore(store) {
  fs.mkdirSync(path.dirname(STORE_PATH), { recursive: true });
  fs.writeFileSync(STORE_PATH, JSON.stringify(store, null, 2));
}

function getToday(store) {
  const date = todayKey();
  if (!store[date]) store[date] = { menus: [], votes: {} };
  return { date, day: store[date] };
}

function withCounts(day) {
  const counts = {};
  for (const menuId of Object.values(day.votes)) {
    counts[menuId] = (counts[menuId] || 0) + 1;
  }
  return day.menus.map((m) => ({ ...m, votes: counts[m.id] || 0 }));
}

app.get('/api/menus', (req, res) => {
  const store = loadStore();
  const { date, day } = getToday(store);
  res.json({ date, menus: withCounts(day) });
});

app.post('/api/menus', (req, res) => {
  const name = typeof req.body?.name === 'string' ? req.body.name.trim() : '';
  if (!name || name.length > MAX_NAME_LEN) {
    return res.status(400).json({ error: 'invalid name' });
  }

  const store = loadStore();
  const { date, day } = getToday(store);

  let menu = day.menus.find((m) => m.name.toLowerCase() === name.toLowerCase());
  if (!menu) {
    menu = { id: crypto.randomUUID(), name };
    day.menus.push(menu);
    saveStore(store);
  }

  res.json({ date, menus: withCounts(day) });
});

app.get('/api/my-vote', (req, res) => {
  const clientId = req.query.clientId;
  if (typeof clientId !== 'string' || !CLIENT_ID_RE.test(clientId)) {
    return res.json({ menuId: null });
  }
  const store = loadStore();
  const { day } = getToday(store);
  res.json({ menuId: day.votes[clientId] || null });
});

app.post('/api/vote', (req, res) => {
  const { clientId, menuId } = req.body || {};
  if (typeof clientId !== 'string' || !CLIENT_ID_RE.test(clientId)) {
    return res.status(400).json({ error: 'invalid clientId' });
  }

  const store = loadStore();
  const { date, day } = getToday(store);
  if (!day.menus.some((m) => m.id === menuId)) {
    return res.status(400).json({ error: 'invalid menuId' });
  }

  day.votes[clientId] = menuId;
  saveStore(store);

  res.json({ date, menus: withCounts(day) });
});

app.listen(PORT, '0.0.0.0', () => {
  console.log(`Server listening on http://0.0.0.0:${PORT}`);
});
