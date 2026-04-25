"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.initDatabase = initDatabase;
exports.getDb = getDb;
exports.saveDatabase = saveDatabase;
exports.runQuery = runQuery;
exports.getOne = getOne;
exports.getAll = getAll;
const pg_1 = require("pg");
require("dotenv/config");
// If no DATABASE_URL, fallback to a standard local postgres url
const connectionString = process.env.DATABASE_URL || 'postgresql://postgres:postgres@localhost:5432/beebuzz';
// Render typical production URL will need SSL
const pool = new pg_1.Pool({
    connectionString,
    ssl: connectionString.includes('render.com') || process.env.NODE_ENV === 'production'
        ? { rejectUnauthorized: false }
        : false
});
async function initDatabase() {
    try {
        const client = await pool.connect();
        client.release();
        console.log('✅ Connected to PostgreSQL database.');
        await initializeTables();
        return pool;
    }
    catch (error) {
        console.error('Database connection error:', error);
        throw error;
    }
}
async function initializeTables() {
    const queries = [
        `CREATE TABLE IF NOT EXISTS users (
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
      created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
    )`,
        `CREATE TABLE IF NOT EXISTS loads (
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
      created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
      FOREIGN KEY (shipper_id) REFERENCES users(id),
      FOREIGN KEY (driver_id) REFERENCES users(id)
    )`,
        `CREATE TABLE IF NOT EXISTS bids (
      id TEXT PRIMARY KEY,
      load_id TEXT NOT NULL,
      driver_id TEXT NOT NULL,
      amount REAL NOT NULL,
      notes TEXT,
      status TEXT DEFAULT 'pending',
      estimated_arrival TEXT,
      created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
      FOREIGN KEY (load_id) REFERENCES loads(id),
      FOREIGN KEY (driver_id) REFERENCES users(id),
      UNIQUE(load_id, driver_id)
    )`,
        `CREATE TABLE IF NOT EXISTS proof_of_delivery (
      id TEXT PRIMARY KEY,
      load_id TEXT NOT NULL,
      photos TEXT,
      signature TEXT,
      recipient_name TEXT,
      delivery_notes TEXT,
      latitude REAL,
      longitude REAL,
      timestamp TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
      FOREIGN KEY (load_id) REFERENCES loads(id)
    )`,
        `CREATE TABLE IF NOT EXISTS location_updates (
      id TEXT PRIMARY KEY,
      load_id TEXT NOT NULL,
      driver_id TEXT NOT NULL,
      latitude REAL NOT NULL,
      longitude REAL NOT NULL,
      timestamp TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
      FOREIGN KEY (load_id) REFERENCES loads(id),
      FOREIGN KEY (driver_id) REFERENCES users(id)
    )`,
        `CREATE TABLE IF NOT EXISTS notifications (
      id TEXT PRIMARY KEY,
      user_id TEXT NOT NULL,
      title TEXT NOT NULL,
      message TEXT NOT NULL,
      type TEXT NOT NULL,
      reference_id TEXT,
      read INTEGER DEFAULT 0,
      created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
      FOREIGN KEY (user_id) REFERENCES users(id)
    )`,
        `CREATE TABLE IF NOT EXISTS payments (
      id TEXT PRIMARY KEY,
      load_id TEXT NOT NULL,
      shipper_id TEXT NOT NULL,
      driver_id TEXT NOT NULL,
      amount REAL NOT NULL,
      platform_fee REAL DEFAULT 0,
      net_amount REAL NOT NULL,
      status TEXT DEFAULT 'held',
      created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
      released_at TIMESTAMP,
      FOREIGN KEY (load_id) REFERENCES loads(id),
      FOREIGN KEY (shipper_id) REFERENCES users(id),
      FOREIGN KEY (driver_id) REFERENCES users(id)
    )`,
        `CREATE TABLE IF NOT EXISTS chat_messages (
      id TEXT PRIMARY KEY,
      load_id TEXT NOT NULL,
      sender_id TEXT NOT NULL,
      receiver_id TEXT NOT NULL,
      message TEXT NOT NULL,
      created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
      FOREIGN KEY (load_id) REFERENCES loads(id),
      FOREIGN KEY (sender_id) REFERENCES users(id),
      FOREIGN KEY (receiver_id) REFERENCES users(id)
    )`,
        `CREATE TABLE IF NOT EXISTS ratings (
      id TEXT PRIMARY KEY,
      load_id TEXT NOT NULL,
      from_user_id TEXT NOT NULL,
      to_user_id TEXT NOT NULL,
      rating INTEGER NOT NULL,
      review TEXT,
      created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
      FOREIGN KEY (load_id) REFERENCES loads(id),
      FOREIGN KEY (from_user_id) REFERENCES users(id),
      FOREIGN KEY (to_user_id) REFERENCES users(id)
    )`
    ];
    for (const q of queries) {
        await pool.query(q);
    }
    const indexes = [
        `CREATE INDEX IF NOT EXISTS idx_loads_shipper ON loads(shipper_id)`,
        `CREATE INDEX IF NOT EXISTS idx_loads_driver ON loads(driver_id)`,
        `CREATE INDEX IF NOT EXISTS idx_loads_status ON loads(status)`,
        `CREATE INDEX IF NOT EXISTS idx_bids_load ON bids(load_id)`,
        `CREATE INDEX IF NOT EXISTS idx_bids_driver ON bids(driver_id)`,
        `CREATE INDEX IF NOT EXISTS idx_notifications_user ON notifications(user_id)`,
        `CREATE INDEX IF NOT EXISTS idx_location_load ON location_updates(load_id)`
    ];
    for (const idx of indexes) {
        await pool.query(idx);
    }
}
function getDb() {
    return pool;
}
function saveDatabase() {
    // No-op for PostgreSQL
}
// Convert ? to $1, $2, etc for pg driver
function convertSqlToPg(sql) {
    let paramIndex = 1;
    return sql.replace(/\?/g, () => `$${paramIndex++}`);
}
async function runQuery(sql, params = []) {
    const pgSql = convertSqlToPg(sql);
    const safeParams = params.map(p => p === undefined ? null : p);
    try {
        await pool.query(pgSql, safeParams);
    }
    catch (err) {
        console.error('Query error:', err);
        console.error('SQL:', pgSql);
        throw err;
    }
}
async function getOne(sql, params = []) {
    const pgSql = convertSqlToPg(sql);
    const safeParams = params.map(p => p === undefined ? null : p);
    const result = await pool.query(pgSql, safeParams);
    return result.rows[0] || null;
}
async function getAll(sql, params = []) {
    const pgSql = convertSqlToPg(sql);
    const safeParams = params.map(p => p === undefined ? null : p);
    const result = await pool.query(pgSql, safeParams);
    return result.rows;
}
