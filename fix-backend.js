const fs = require('fs');
const path = require('path');

const serverDir = path.join(__dirname, 'BeeBuzz', 'server', 'src');

// 1. Fix loadController.ts
const loadControllerPath = path.join(serverDir, 'controllers', 'loadController.ts');
let loadControllerContent = fs.readFileSync(loadControllerPath, 'utf8');

loadControllerContent = loadControllerContent.replace(
  /if \(load\.driver_id !== req\.user\?\.userId && req\.user\?\.role !== 'admin'\) {\s*res\.status\(403\)\.json\({ success: false, error: 'Not authorized' }\);\s*return;\s*}/g,
  `if (load.driver_id !== req.user?.userId && load.shipper_id !== req.user?.userId && req.user?.role !== 'admin') {\n      res.status(403).json({ success: false, error: 'Not authorized' });\n      return;\n    }`
);

// Add rejectPod to loadController
if (!loadControllerContent.includes('export const rejectPod')) {
  const rejectPodCode = `
export const rejectPod = async (req: AuthRequest, res: Response): Promise<void> => {
  try {
    const { id } = req.params;
    const { comment } = req.body;
    
    if (!comment) {
      res.status(400).json({ success: false, error: 'Reason for rejection is required' });
      return;
    }

    const load = await getOne('SELECT * FROM loads WHERE id = ?', [id]);
    
    if (!load) {
      res.status(404).json({ success: false, error: 'Load not found' });
      return;
    }
    
    if (load.shipper_id !== req.user?.userId && req.user?.role !== 'admin') {
      res.status(403).json({ success: false, error: 'Not authorized' });
      return;
    }
    
    if (load.status !== 'delivered_pending_verification' && load.current_status !== 'delivered_pending_verification') {
      res.status(400).json({ success: false, error: 'Load is not pending verification' });
      return;
    }

    // Reject POD and revert status
    await runQuery(\`
      UPDATE loads SET 
        status = 'assigned', 
        current_status = 'arrived_delivery',
        pod_rejection_comment = ?
      WHERE id = ?
    \`, [comment, id]);

    // Clear the POD records since it was rejected
    await runQuery('DELETE FROM proof_of_delivery WHERE load_id = ?', [id]);

    // Notify Driver
    await runQuery(\`
      INSERT INTO notifications (id, user_id, title, message, type, reference_id)
      VALUES (?, ?, ?, ?, ?, ?)
    \`, [require('uuid').v4(), load.driver_id, 'POD Rejected', \`Shipper rejected proof of delivery: \${comment}\`, 'pod_rejected', id]);

    const updatedLoad = await getOne('SELECT * FROM loads WHERE id = ?', [id]);
    broadcastLoadUpdate(id, formatLoad(updatedLoad));

    res.json({ success: true, data: formatLoad(updatedLoad) });
  } catch (error) {
    console.error('Reject POD error:', error);
    res.status(500).json({ success: false, error: 'Server error' });
  }
};
`;
  loadControllerContent = loadControllerContent.replace(
    /export default {/,
    `${rejectPodCode}\nexport default {`
  );
  loadControllerContent = loadControllerContent.replace(
    /export default { (.*) };/,
    `export default { $1, rejectPod };`
  );
  
  // also add it to the named exports
  if (loadControllerContent.includes('requestPaymentReleaseOTP, verifyPODAndReleasePayment } from')) {
     loadControllerContent = loadControllerContent.replace(
       /verifyPODAndReleasePayment } from '\.\.\/controllers\/loadController\.js';/,
       `verifyPODAndReleasePayment, rejectPod } from '../controllers/loadController.js';`
     );
  }
}

// Update formatLoad
if (!loadControllerContent.includes('podRejectionComment: load.pod_rejection_comment')) {
  loadControllerContent = loadControllerContent.replace(
    /driverVehicleNumber: load\.driver_vehicle_number/,
    `driverVehicleNumber: load.driver_vehicle_number,\n    podRejectionComment: load.pod_rejection_comment`
  );
}

fs.writeFileSync(loadControllerPath, loadControllerContent);

// 2. Fix loads.ts
const loadsRoutesPath = path.join(serverDir, 'routes', 'loads.ts');
let loadsRoutesContent = fs.readFileSync(loadsRoutesPath, 'utf8');

loadsRoutesContent = loadsRoutesContent.replace(
  /router\.put\('\/:id\/status', authorize\('driver', 'admin'\), updateLoadStatus\);/,
  `router.put('/:id/status', authorize('driver', 'shipper', 'admin'), updateLoadStatus);`
);

if (!loadsRoutesContent.includes('rejectPod')) {
  loadsRoutesContent = loadsRoutesContent.replace(
    /verifyPODAndReleasePayment } from '\.\.\/controllers\/loadController\.js';/,
    `verifyPODAndReleasePayment, rejectPod } from '../controllers/loadController.js';`
  );
  
  loadsRoutesContent = loadsRoutesContent.replace(
    /router\.post\('\/:id\/verify-pod', authorize\('shipper', 'admin'\), verifyPODAndReleasePayment\);/,
    `router.post('/:id/verify-pod', authorize('shipper', 'admin'), verifyPODAndReleasePayment);\nrouter.post('/:id/reject-pod', authorize('shipper', 'admin'), rejectPod);`
  );
}

fs.writeFileSync(loadsRoutesPath, loadsRoutesContent);

// 3. Fix database.ts
const databasePath = path.join(serverDir, 'services', 'database.ts');
let databaseContent = fs.readFileSync(databasePath, 'utf8');

if (!databaseContent.includes('pod_rejection_comment TEXT')) {
  databaseContent = databaseContent.replace(
    /release_otp_expiry TIMESTAMP,/,
    `release_otp_expiry TIMESTAMP,\n      pod_rejection_comment TEXT,`
  );
}

if (!databaseContent.includes('ALTER TABLE loads ADD COLUMN pod_rejection_comment TEXT')) {
  databaseContent = databaseContent.replace(
    /`ALTER TABLE loads ADD COLUMN release_otp_expiry TIMESTAMP`\n\s*\];/,
    `\`ALTER TABLE loads ADD COLUMN release_otp_expiry TIMESTAMP\`,\n    \`ALTER TABLE loads ADD COLUMN pod_rejection_comment TEXT\`\n  ];`
  );
}

fs.writeFileSync(databasePath, databaseContent);

console.log('Backend fixed!');
