import { Response } from 'express';
import db from '../services/database.js';
import { AuthRequest } from '../middleware/auth.js';

export const getEarnings = async (req: AuthRequest, res: Response): Promise<void> => {
  try {
    const payments = db.prepare(`
      SELECT p.*, l.pickup_address, l.delivery_address, l.cargo_type,
             u.name as shipper_name
      FROM payments p
      LEFT JOIN loads l ON p.load_id = l.id
      LEFT JOIN users u ON l.shipper_id = u.id
      WHERE p.driver_id = ?
      ORDER BY p.created_at DESC
    `).all(req.user?.userId) as any[];
    
    const pending = db.prepare(`
      SELECT SUM(net_amount) as total FROM payments WHERE driver_id = ? AND status = 'held'
    `).get(req.user?.userId) as any;
    
    const totalEarnings = db.prepare(`
      SELECT SUM(net_amount) as total FROM payments WHERE driver_id = ? AND status = 'released'
    `).get(req.user?.userId) as any;
    
    res.json({
      success: true,
      data: {
        transactions: payments.map(formatPayment),
        pendingAmount: pending?.total || 0,
        totalEarnings: totalEarnings?.total || 0
      }
    });
  } catch (error) {
    console.error('Get earnings error:', error);
    res.status(500).json({ success: false, error: 'Server error' });
  }
};

export const getPayments = async (req: AuthRequest, res: Response): Promise<void> => {
  try {
    const { role } = req.query;
    
    let payments: any[];
    
    if (role === 'shipper' || req.user?.role === 'shipper') {
      payments = db.prepare(`
        SELECT p.*, l.pickup_address, l.delivery_address,
               d.name as driver_name
        FROM payments p
        LEFT JOIN loads l ON p.load_id = l.id
        LEFT JOIN users d ON p.driver_id = d.id
        WHERE p.shipper_id = ?
        ORDER BY p.created_at DESC
      `).all(req.user?.userId);
    } else {
      payments = db.prepare(`
        SELECT p.*, l.pickup_address, l.delivery_address,
               u.name as shipper_name
        FROM payments p
        LEFT JOIN loads l ON p.load_id = l.id
        LEFT JOIN users u ON l.shipper_id = u.id
        WHERE p.driver_id = ?
        ORDER BY p.created_at DESC
      `).all(req.user?.userId);
    }
    
    res.json({ success: true, data: payments.map(formatPayment) });
  } catch (error) {
    console.error('Get payments error:', error);
    res.status(500).json({ success: false, error: 'Server error' });
  }
};

function formatPayment(p: any) {
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

export default { getEarnings, getPayments };
