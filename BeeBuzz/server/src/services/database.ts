import initSqlJs, { Database as SqlJsDatabase } from 'sql.js';
import path from 'path';
import fs from 'fs';

const dbPath = path.join(process.cwd(), 'data', 'beebuzz.db');

const dataDir = path.dirname(dbPath);
if (!fs.existsSync(dataDir)) {
  fs.mkdirSync(dataDir, { recursive: true });
}

// Debug: show database path
console.log('Database path:', dbPath);

let db: SqlJsDatabase | null = null;

// Use "export async function" instead of "export default"
export async function initDatabase() {
  const SQL = await initSqlJs();
  
  if (fs.existsSync(dbPath)) {
    const fileBuffer = fs.readFileSync(dbPath);
    db = new SQL.Database(fileBuffer);
  } else {
    db = new SQL.Database();
  }

  initializeTables();
  return db;
}

function initializeTables() {
  if (!db) return;

  db.run(`
    CREATE TABLE IF NOT EXISTS users (
      id TEXT PRIMARY KEY,
      email TEXT UNIQUE NOT NULL,
      password TEXT NOT NULL,
      name TEXT NOT NULL,
      phone TEXT NOT NULL,
      role TEXT NOT NULL,
      company_name TEXT,
      gstin TEXT,
      address TEXT,
      profile_photo TEXT,
      license_number TEXT,
      license_photo TEXT,
      insurance_number TEXT,
      insurance_photo TEXT,
      vehicle_type TEXT,
      vehicle_number TEXT,
      rc_number TEXT,
      document_status TEXT DEFAULT 'pending',
      rating REAL DEFAULT 5.0,
      total_jobs INTEGER DEFAULT 0,
      is_verified INTEGER DEFAULT 0,
      created_at TEXT DEFAULT CURRENT_TIMESTAMP
    )
  `);

  db.run(`
    CREATE TABLE IF NOT EXISTS loads (
      id TEXT PRIMARY KEY,
      shipper_id TEXT NOT NULL,
      driver_id TEXT,
      pickup_address TEXT NOT NULL,
      pickup_lat REAL NOT NULL,
      pickup_lng REAL NOT NULL,
      delivery_address TEXT NOT NULL,
      delivery_lat REAL NOT NULL,
      delivery_lng REAL NOT NULL,
      cargo_type TEXT NOT NULL,
      cargo_weight REAL NOT NULL,
      cargo_dimensions TEXT,
      truck_type TEXT NOT NULL,
      special_requirements TEXT,
      pickup_date TEXT NOT NULL,
      delivery_date TEXT NOT NULL,
      price REAL NOT NULL,
      status TEXT DEFAULT 'open',
      current_status TEXT DEFAULT 'pending',
      bid_count INTEGER DEFAULT 0,
      created_at TEXT DEFAULT CURRENT_TIMESTAMP,
      FOREIGN KEY (shipper_id) REFERENCES users(id),
      FOREIGN KEY (driver_id) REFERENCES users(id)
    )
  `);

  db.run(`
    CREATE TABLE IF NOT EXISTS bids (
      id TEXT PRIMARY KEY,
      load_id TEXT NOT NULL,
      driver_id TEXT NOT NULL,
      amount REAL NOT NULL,
      notes TEXT,
      status TEXT DEFAULT 'pending',
      estimated_arrival TEXT,
      created_at TEXT DEFAULT CURRENT_TIMESTAMP,
      FOREIGN KEY (load_id) REFERENCES loads(id),
      FOREIGN KEY (driver_id) REFERENCES users(id),
      UNIQUE(load_id, driver_id)
    )
  `);

  db.run(`
    CREATE TABLE IF NOT EXISTS proof_of_delivery (
      id TEXT PRIMARY KEY,
      load_id TEXT NOT NULL,
      photos TEXT,
      signature TEXT,
      recipient_name TEXT,
      delivery_notes TEXT,
      latitude REAL,
      longitude REAL,
      timestamp TEXT DEFAULT CURRENT_TIMESTAMP,
      FOREIGN KEY (load_id) REFERENCES loads(id)
    )
  `);

  db.run(`
    CREATE TABLE IF NOT EXISTS location_updates (
      id TEXT PRIMARY KEY,
      load_id TEXT NOT NULL,
      driver_id TEXT NOT NULL,
      latitude REAL NOT NULL,
      longitude REAL NOT NULL,
      timestamp TEXT DEFAULT CURRENT_TIMESTAMP,
      FOREIGN KEY (load_id) REFERENCES loads(id),
      FOREIGN KEY (driver_id) REFERENCES users(id)
    )
  `);

  db.run(`
    CREATE TABLE IF NOT EXISTS notifications (
      id TEXT PRIMARY KEY,
      user_id TEXT NOT NULL,
      title TEXT NOT NULL,
      message TEXT NOT NULL,
      type TEXT NOT NULL,
      reference_id TEXT,
      read INTEGER DEFAULT 0,
      created_at TEXT DEFAULT CURRENT_TIMESTAMP,
      FOREIGN KEY (user_id) REFERENCES users(id)
    )
  `);

  db.run(`
    CREATE TABLE IF NOT EXISTS payments (
      id TEXT PRIMARY KEY,
      load_id TEXT NOT NULL,
      shipper_id TEXT NOT NULL,
      driver_id TEXT NOT NULL,
      amount REAL NOT NULL,
      platform_fee REAL DEFAULT 0,
      net_amount REAL NOT NULL,
      status TEXT DEFAULT 'held',
      created_at TEXT DEFAULT CURRENT_TIMESTAMP,
      released_at TEXT,
      FOREIGN KEY (load_id) REFERENCES loads(id),
      FOREIGN KEY (shipper_id) REFERENCES users(id),
      FOREIGN KEY (driver_id) REFERENCES users(id)
    )
  `);

  db.run(`
    CREATE TABLE IF NOT EXISTS chat_messages (
      id TEXT PRIMARY KEY,
      load_id TEXT NOT NULL,
      sender_id TEXT NOT NULL,
      receiver_id TEXT NOT NULL,
      message TEXT NOT NULL,
      created_at TEXT DEFAULT CURRENT_TIMESTAMP,
      FOREIGN KEY (load_id) REFERENCES loads(id),
      FOREIGN KEY (sender_id) REFERENCES users(id),
      FOREIGN KEY (receiver_id) REFERENCES users(id)
    )
  `);

  db.run(`
    CREATE TABLE IF NOT EXISTS ratings (
      id TEXT PRIMARY KEY,
      load_id TEXT NOT NULL,
      from_user_id TEXT NOT NULL,
      to_user_id TEXT NOT NULL,
      rating INTEGER NOT NULL,
      review TEXT,
      created_at TEXT DEFAULT CURRENT_TIMESTAMP,
      FOREIGN KEY (load_id) REFERENCES loads(id),
      FOREIGN KEY (from_user_id) REFERENCES users(id),
      FOREIGN KEY (to_user_id) REFERENCES users(id)
    )
  `);

  db.run(`CREATE INDEX IF NOT EXISTS idx_loads_shipper ON loads(shipper_id)`);
  db.run(`CREATE INDEX IF NOT EXISTS idx_loads_driver ON loads(driver_id)`);
  db.run(`CREATE INDEX IF NOT EXISTS idx_loads_status ON loads(status)`);
  db.run(`CREATE INDEX IF NOT EXISTS idx_bids_load ON bids(load_id)`);
  db.run(`CREATE INDEX IF NOT EXISTS idx_bids_driver ON bids(driver_id)`);
  db.run(`CREATE INDEX IF NOT EXISTS idx_notifications_user ON notifications(user_id)`);
  db.run(`CREATE INDEX IF NOT EXISTS idx_location_load ON location_updates(load_id)`);

  saveDatabase();
}

export function getDb() {
  if (!db) throw new Error('Database not initialized. Call initDatabase() first.');
  return db;
}

export function saveDatabase() {
  if (!db) {
    console.log('DB is null, cannot save');
    return;
  }
  
  try {
    const data = db.export();
    const buffer = Buffer.from(data);
    fs.writeFileSync(dbPath, buffer);
    console.log('✅ Database saved to:', dbPath);
  } catch (error) {
    console.error('Error saving database:', error);
  }
}

// Helper functions - with undefined to null conversion
export function runQuery(sql: string, params: any[] = []): void {
  const database = getDb();
  const stmt = database.prepare(sql);
  
  // Convert undefined to null for all params
  const safeParams = params.map((p: any) => p === undefined ? null : p);
  
  try {
    stmt.bind(safeParams);
    stmt.step();
  } catch (err) {
    console.error('Query error:', err);
    console.error('SQL:', sql);
  } finally {
    stmt.free();
  }
  
  saveDatabase();
}

export function getOne(sql: string, params: any[] = []): any {
  const database = getDb();
  const stmt = database.prepare(sql);
  
  // Convert undefined to null
  const safeParams = params.map((p: any) => p === undefined ? null : p);
  stmt.bind(safeParams);
  
  let result = null;
  if (stmt.step()) {
    result = stmt.getAsObject();
  }
  stmt.free();
  return result;
}

export function getAll(sql: string, params: any[] = []): any[] {
  const database = getDb();
  const stmt = database.prepare(sql);
  
  // Convert undefined to null
  const safeParams = params.map((p: any) => p === undefined ? null : p);
  stmt.bind(safeParams);
  
  const results: any[] = [];
  while (stmt.step()) {
    results.push(stmt.getAsObject());
  }
  stmt.free();
  return results;
}
