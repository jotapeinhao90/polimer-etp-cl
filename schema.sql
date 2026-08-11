CREATE TABLE IF NOT EXISTS leads (
  id INTEGER PRIMARY KEY AUTOINCREMENT,
  nombre TEXT NOT NULL,
  empresa TEXT,
  telefono TEXT,
  producto TEXT,
  origen TEXT,
  created_at TEXT NOT NULL DEFAULT (datetime('now'))
);
