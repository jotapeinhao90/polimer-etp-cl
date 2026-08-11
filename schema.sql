CREATE TABLE IF NOT EXISTS leads (
  id INTEGER PRIMARY KEY AUTOINCREMENT,
  nombre TEXT NOT NULL,
  empresa TEXT,
  telefono TEXT,
  producto TEXT,
  origen TEXT,
  created_at TEXT NOT NULL DEFAULT (datetime('now'))
);

ALTER TABLE leads ADD COLUMN email TEXT;
ALTER TABLE leads ADD COLUMN ancho_mm TEXT;
ALTER TABLE leads ADD COLUMN largo_mm TEXT;
ALTER TABLE leads ADD COLUMN micraje TEXT;
ALTER TABLE leads ADD COLUMN volumen_mensual TEXT;
ALTER TABLE leads ADD COLUMN cantidad TEXT;
