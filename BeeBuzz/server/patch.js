const fs = require('fs');
const file = 'c:/Users/K DHEERAJ/Claude Workspace/BeeBuzz/BeeBuzz/server/src/controllers/loadController.ts';
let content = fs.readFileSync(file, 'utf8');

// Add imports
if (!content.includes('emailService')) {
  content = content.replace(
    "import { AuthRequest } from '../middleware/auth.js';",
    "import { AuthRequest } from '../middleware/auth.js';\nimport { emailService } from '../services/emailService.js';\nimport { paymentGateway } from '../services/paymentGateway.js';"
  );
}

// Modify POD status
content = content.replace(
  "await runQuery(\"UPDATE loads SET status = 'delivered', current_status = 'delivered' WHERE id = ?\", [id]);\n    await runQuery(\"UPDATE payments SET status = 'released', released_at = CURRENT_TIMESTAMP WHERE load_id = ?\", [id]);",
  "await runQuery(\"UPDATE loads SET status = 'delivered_pending_verification', current_status = 'delivered_pending_verification' WHERE id = ?\", [id]);\n    // Payment will be released after shipper verification"
);

fs.writeFileSync(file, content);
console.log('Patched loadController.ts');
