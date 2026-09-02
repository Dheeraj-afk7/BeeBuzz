const { Pool } = require('pg');
const pool = new Pool({
  connectionString: 'postgresql://postgres:postgres@localhost:5432/beebuzz',
  ssl: false
});

async function run() {
  try {
    const res = await pool.query('SELECT id, shipper_id, driver_id, status, current_status FROM loads');
    console.log(JSON.stringify(res.rows, null, 2));
  } catch (err) {
    console.error('Error:', err);
  } finally {
    await pool.end();
  }
}
run();
