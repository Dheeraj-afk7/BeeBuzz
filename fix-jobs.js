const { runQuery, getAll } = require('./BeeBuzz/server/dist/services/database.js');

async function fixTotalJobs() {
  console.log('Fixing total_jobs...');
  // Reset all to 0
  await runQuery('UPDATE users SET total_jobs = 0');
  
  // Recalculate
  const counts = await getAll("SELECT driver_id, COUNT(*) as count FROM loads WHERE status = 'delivered' AND driver_id IS NOT NULL GROUP BY driver_id");
  
  for (const row of counts) {
    await runQuery('UPDATE users SET total_jobs = ? WHERE id = ?', [row.count, row.driver_id]);
    console.log(`Updated user ${row.driver_id} to ${row.count} jobs`);
  }
  
  console.log('Done!');
  process.exit(0);
}

fixTotalJobs().catch(console.error);
