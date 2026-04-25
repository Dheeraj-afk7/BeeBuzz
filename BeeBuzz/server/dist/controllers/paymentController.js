"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.getPayments = exports.getEarnings = void 0;
const database_js_1 = require("../services/database.js");
const getEarnings = async (req, res) => {
    try {
        const payments = await (0, database_js_1.getAll)(`
      SELECT p.*, l.pickup_address, l.delivery_address, l.cargo_type,
             u.name as shipper_name
      FROM payments p
      LEFT JOIN loads l ON p.load_id = l.id
      LEFT JOIN users u ON l.shipper_id = u.id
      WHERE p.driver_id = ?
      ORDER BY p.created_at DESC
    `, [req.user?.userId]);
        const pending = await (0, database_js_1.getOne)(`
      SELECT SUM(net_amount) as total FROM payments WHERE driver_id = ? AND status = 'held'
    `, [req.user?.userId]);
        const totalEarnings = await (0, database_js_1.getOne)(`
      SELECT SUM(net_amount) as total FROM payments WHERE driver_id = ? AND status = 'released'
    `, [req.user?.userId]);
        res.json({
            success: true,
            data: {
                transactions: payments.map(formatPayment),
                pendingAmount: pending?.total || 0,
                totalEarnings: totalEarnings?.total || 0
            }
        });
    }
    catch (error) {
        console.error('Get earnings error:', error);
        res.status(500).json({ success: false, error: 'Server error' });
    }
};
exports.getEarnings = getEarnings;
const getPayments = async (req, res) => {
    try {
        const { role } = req.query;
        let payments;
        if (role === 'shipper' || req.user?.role === 'shipper') {
            payments = await (0, database_js_1.getAll)(`
        SELECT p.*, l.pickup_address, l.delivery_address,
               d.name as driver_name
        FROM payments p
        LEFT JOIN loads l ON p.load_id = l.id
        LEFT JOIN users d ON p.driver_id = d.id
        WHERE p.shipper_id = ?
        ORDER BY p.created_at DESC
      `, [req.user?.userId]);
        }
        else {
            payments = await (0, database_js_1.getAll)(`
        SELECT p.*, l.pickup_address, l.delivery_address,
               u.name as shipper_name
        FROM payments p
        LEFT JOIN loads l ON p.load_id = l.id
        LEFT JOIN users u ON l.shipper_id = u.id
        WHERE p.driver_id = ?
        ORDER BY p.created_at DESC
      `, [req.user?.userId]);
        }
        res.json({ success: true, data: payments.map(formatPayment) });
    }
    catch (error) {
        console.error('Get payments error:', error);
        res.status(500).json({ success: false, error: 'Server error' });
    }
};
exports.getPayments = getPayments;
function formatPayment(p) {
    return {
        id: p.id,
        loadId: p.load_id,
        amount: p.amount,
        platformFee: p.platform_fee,
        netAmount: p.net_amount,
        status: p.status,
        createdAt: p.created_at,
        releasedAt: p.released_at,
        pickupAddress: p.pickup_address,
        deliveryAddress: p.delivery_address,
        shipperName: p.shipper_name,
        driverName: p.driver_name
    };
}
exports.default = { getEarnings: exports.getEarnings, getPayments: exports.getPayments };
