const fs = require('fs');
const path = 'BeeBuzz/server/src/controllers/loadController.ts';
let code = fs.readFileSync(path, 'utf8');

// Update validStatuses
code = code.replace(
  /const validStatuses = \['arrived_pickup', 'loaded', 'en_route', 'arrived_delivery', 'delivered', 'cancelled'\];/,
  `const validStatuses = ['pending', 'accepted', 'arrived_pickup', 'loaded', 'en_route', 'arrived_delivery', 'delivered_pending_verification', 'delivered', 'cancelled'];`
);

// Update dbStatus mapping
const oldMapping = `    // Update status
    let dbStatus = 'in_transit';
    if (status === 'delivered') dbStatus = 'delivered';`;
    
const newMapping = `    // Update status
    let dbStatus = 'in_transit';
    if (status === 'pending') dbStatus = 'open';
    else if (status === 'accepted') dbStatus = 'assigned';
    else if (status === 'delivered_pending_verification') dbStatus = 'delivered_pending_verification';
    else if (status === 'delivered') dbStatus = 'delivered';
    else if (status === 'cancelled') dbStatus = 'cancelled';`;

code = code.replace(oldMapping, newMapping);
fs.writeFileSync(path, code);
console.log('Fixed statuses!');
