CREATE TABLE user (
  id TEXT PRIMARY KEY NOT NULL
);

CREATE TABLE prah_angkutan (
  id TEXT PRIMARY KEY NOT NULL DEFAULT (lower(hex(randomblob(8)))),
  tanggal TEXT NOT NULL,
  truk TEXT NOT NULL CHECK (truk IN ('katimin', 'doni')),
  peron_muat TEXT NOT NULL DEFAULT 'Nolin',
  no_bast TEXT,
  no_tid TEXT,
  sumber TEXT NOT NULL DEFAULT 'manual' CHECK (sumber IN ('manual', 'penjualan_bast', 'prah_bast')),
  penjualan_id TEXT REFERENCES penjualan(id) ON DELETE SET NULL,
  source_key TEXT,
  tonase_kotor REAL NOT NULL CHECK (tonase_kotor > 0 AND tonase_kotor <= 100000),
  tonase_netto_1 REAL NOT NULL CHECK (tonase_netto_1 > 0 AND tonase_netto_1 <= tonase_kotor),
  tarif_per_kg INTEGER NOT NULL DEFAULT 140 CHECK (tarif_per_kg >= 0),
  pendapatan INTEGER NOT NULL CHECK (pendapatan >= 0),
  biaya_sopir INTEGER NOT NULL DEFAULT 200000 CHECK (biaya_sopir >= 0),
  catatan TEXT,
  created_by TEXT NOT NULL REFERENCES user(id),
  idempotency_key TEXT,
  created_at INTEGER NOT NULL DEFAULT (unixepoch())
);

CREATE UNIQUE INDEX prah_angkutan_idempotency_idx ON prah_angkutan(idempotency_key);
CREATE INDEX prah_angkutan_tanggal_created_idx ON prah_angkutan(tanggal, created_at);
CREATE INDEX prah_angkutan_truk_tanggal_idx ON prah_angkutan(truk, tanggal);
CREATE INDEX prah_angkutan_created_by_idx ON prah_angkutan(created_by);
CREATE INDEX prah_angkutan_penjualan_idx ON prah_angkutan(penjualan_id);
CREATE UNIQUE INDEX prah_angkutan_bast_source_idx ON prah_angkutan(no_bast, source_key);

CREATE TRIGGER prah_angkutan_validate_insert
BEFORE INSERT ON prah_angkutan
WHEN NEW.tonase_kotor <= 0 OR NEW.tonase_kotor > 100000
  OR NEW.tonase_netto_1 <= 0 OR NEW.tonase_netto_1 > NEW.tonase_kotor
BEGIN SELECT RAISE(ABORT, 'Tonase Prah tidak valid'); END;

CREATE TRIGGER prah_angkutan_validate_update
BEFORE UPDATE OF tonase_kotor, tonase_netto_1 ON prah_angkutan
WHEN NEW.tonase_kotor <= 0 OR NEW.tonase_kotor > 100000
  OR NEW.tonase_netto_1 <= 0 OR NEW.tonase_netto_1 > NEW.tonase_kotor
BEGIN SELECT RAISE(ABORT, 'Tonase Prah tidak valid'); END;

CREATE TABLE prah_bbm (
  id TEXT PRIMARY KEY NOT NULL DEFAULT (lower(hex(randomblob(8)))),
  tanggal TEXT NOT NULL,
  truk TEXT NOT NULL CHECK (truk IN ('katimin', 'doni')),
  jumlah_ken INTEGER NOT NULL CHECK (jumlah_ken > 0),
  biaya_total INTEGER NOT NULL CHECK (biaya_total > 0),
  catatan TEXT,
  created_by TEXT NOT NULL REFERENCES user(id),
  idempotency_key TEXT,
  created_at INTEGER NOT NULL DEFAULT (unixepoch())
);

CREATE UNIQUE INDEX prah_bbm_idempotency_idx ON prah_bbm(idempotency_key);
CREATE INDEX prah_bbm_tanggal_created_idx ON prah_bbm(tanggal, created_at);
CREATE INDEX prah_bbm_truk_tanggal_idx ON prah_bbm(truk, tanggal);
CREATE INDEX prah_bbm_created_by_idx ON prah_bbm(created_by);
