import { Response } from 'express';
import { v4 as uuidv4 } from 'uuid';
import db from '../services/database.js';
import { AuthRequest } from '../middleware/auth.js';

export const createBid = async (req: AuthRequest, res: Response): Promise<void> => {
  try {
    const { loadId, amount, notes, estimatedArrival } = req.body;
    
    if (!loadId || !amount) {
      res.status(400).json({ success: false, error: 'Load ID and amount required' });
      return;
    }
    
    const load = db.prepare('SELECT * FROM loads WHERE id = ?').get(loadId) as any;
    
    if (!load) {
      res.status(404).json({ success: false, error: 'Load not found' });
      return;
    }
    
    if (load.status !== 'open') {
      res.status(400).json({ success: false, error: 'Load is no longer available' });
      return;
    }
    
    // Check if driver already bid
    const existingBid = db.prepare('SELECT * FROM bids WHERE load_id = ? AND driver_id = ?').get(loadId, req.user?.userId) as any;
    if (existingBid) {
      res.status(400).json({ success: false, error: 'You have already placed a bid' });
      return;
    }
    
    const bidId = uuidv4();
    
    db.prepare(`
      INSERT INTO bids (id, load_id, driver_id, amount, notes, estimated_arrival)
      VALUES (?, ?, ?, ?, ?, ?)
    `).run(bidId, loadId, req.user?.userId, amount, notes, estimatedArrival);
    
    // Update bid count
    db.prepare('UPDATE loads SET bid_count = bid_count + 1 WHERE id = ?').run(loadId);
    
    // Notify shipper
    const driver = db.prepare('SELECT name, rating FROM users WHERE id = ?').get(req.user?.userId) as any;
    db.prepare(`
      INSERT INTO notifications (id, user_id, title, message, type, reference_id)
      VALUES (?, ?, ?, ?, ?, ?)
    `).run(uuidv4(), load.shipper_id, 'New Bid Received', `${driver.name} placed a bid of ₹${amount}`, 'new_bid', loadId);
    
    const bid = db.prepare('SELECT * FROM bids WHERE id = ?').get(bidId) as any;
    
    res.status(201).json({ success: true, data: formatBid(bid) });
  } catch (error) {
    console.error('Create bid error:', error);
    res.status(500).json({ success: false, error: 'Server error' });
  }
};

export const getBids = async (req: AuthRequest, res: Response): Promise<void> => {
  try {
    const { loadId } = req.params;
    
    const bids = db.prepare(`
      SELECT b.*, u.name as driver_name, u.rating, u.total_jobs, u.vehicle_type, u.vehicle_number, u.profile_photo
      FROM bids b 
      LEFT JOIN users u ON b.driver_id = u.id 
      WHERE b.load_id = ?
      ORDER BY b.amount ASC
    `).all(loadId);
    
    res.json({ success: true, data: bids.map(formatBid) });
  } catch (error) {
    console.error('Get bids error:', error);
    res.status(500).json({ success: false, error: 'Server error' });
  }
};

export const getMyBids = async (req: AuthRequest, res: Response): Promise<void> => {
  try {
    const bids = db.prepare(`
      SELECT b.*, l.pickup_address, l.delivery_address, l.cargo_type, l.price as load_price, l.status as load_status, u.name as shipper_name
      FROM bids b 
      LEFT JOIN loads l ON b.load_id = l.id
      LEFT JOIN users u ON l.shipper_id = u.id
      WHERE b.driver_id = ?
      ORDER BY b.created_at DESC
    `).all(req.user?.userId);
    
    res.json({ success: true, data: bids.map(formatMyBid) });
  } catch (error) {
    console.error('Get my bids error:', error);
    res.status(500).json({ success: false, error: 'Server error' });
  }
};

export const acceptBid = async (req: AuthRequest, res: Response): Promise<void> => {
  try {
    const { bidId } = req.params;
    
    const bid = db.prepare('SELECT * FROM bids WHERE id = ?').get(bidId) as any;
    
    if (!bid) {
      res.status(404).json({ success: false, error: 'Bid not found' });
      return;
    }
    
    const load = db.prepare('SELECT * FROM loads WHERE id = ?').get(bid.load_id) as any;
    
    if (load.shipper_id !== req.user?.userId) {
      res.status(403).json({ success: false, error: 'Not authorized' });
      return;
    }
    
    // Accept this bid
    db.prepare("UPDATE bids SET status = 'accepted' WHERE id = ?").run(bidId);
    
    // Reject all other bids for this load
    db.prepare("UPDATE bids SET status = 'rejected' WHERE load_id = ? AND id != ?").run(bid.load_id, bidId);
    
    // Update load
    db.prepare("UPDATE loads SET driver_id = ?, status = 'assigned', current_status = 'accepted' WHERE id = ?")
      .run(bid.driver_id, bid.load_id);
    
    // Create payment record (escrow)
    const paymentId = uuidv4();
    const platformFee = load.price * 0.05;
    const netAmount = load.price - platformFee;
    
    db.prepare(`
      INSERT INTO payments (id, load_id, shipper_id, driver_id, amount, platform_fee, net_amount, status)
      VALUES (?, ?, ?, ?, ?, ?, ?, 'held')
    `).run(paymentId, load.id, load.shipper_id, bid.driver_id, load.price, platformFee, netAmount);
    
    // Notify driver
    const driver = db.prepare('SELECT name FROM users WHERE id = ?').get(bid.driver_id) as any;
    db.prepare(`
      INSERT INTO notifications (id, user_id, title, message, type, reference_id)
      VALUES (?, ?, ?, ?, ?, ?)
    `).run(uuidv4(), bid.driver_id, 'Bid Accepted', 'Your bid has been accepted!', 'bid_accepted', bid.load_id);
    
    const updatedLoad = db.prepare('SELECT * FROM loads WHERE id = ?').get(bid.load_id) as any;
    
    res.json({ success: true, data: { load: updatedLoad, bid: bid } });
  } catch (error) {
    console.error('Accept bid error:', error);
    res.status(500).json({ success: false, error: 'Server error' });
  }
};

export const rejectBid = async (req: AuthRequest, res: Response): Promise<void> => {
  try {
    const { bidId } = req.params;
    
    const bid = db.prepare('SELECT * FROM bids WHERE id = ?').get(bidId) as any;
    
    if (!bid) {
      res.status(404).json({ success: false, error: 'Bid not found' });
      return;
    }
    
    const load = db.prepare('SELECT * FROM loads WHERE id = ?').get(bid.load_id) as any;
    
    if (load.shipper_id !== req.user?.userId) {
      res.status(403).json({ success: false, error: 'Not authorized' });
      return;
    }
    
    db.prepare("UPDATE bids SET status = 'rejected' WHERE id = ?").run(bidId);
    
    // Notify driver
    db.prepare(`
      INSERT INTO notifications (id, user_id, title, message, type, reference_id)
      VALUES (?, ?, ?, ?, ?, ?)
    `).run(uuidv4(), bid.driver_id, 'Bid Rejected', 'Your bid has been rejected', 'bid_rejected', bid.load_id);
    
    res.json({ success: true, message: 'Bid rejected' });
  } catch (error) {
    console.error('Reject bid error:', error);
    res.status(500).json({ success: false, error: 'Server error' });
  }
};

function formatBid(bid: any) {
  return {
    id: bid.id,
    loadId: bid.load_id,
    driverId: bid.driver_id,
    driverName: bid.driver_name,
    driverRating: bid.rating,
    driverTotalJobs: bid.total_jobs,
    driverVehicle: bid.vehicle_type,
    driverVehicleNumber: bid.vehicle_number,
    driverProfilePhoto: bid.profile_photo,
    amount: bid.amount,
    notes: bid.notes,
    estimatedArrival: bid.estimated_arrival,
    status: bid.status,
    createdAt: bid.created_at
  };
}

function formatMyBid(bid: any) {
  return {
    id: bid.id,
    loadId: bid.load_id,
    pickupAddress: bid.pickup_address,
    deliveryAddress: bid.delivery_address,
    cargoType: bid.cargo_type,
    loadPrice: bid.load_price,
    loadStatus: bid.load_status,
    shipperName: bid.shipper_name,
    amount: bid.amount,
    status: bid.status,
    createdAt: bid.created_at
  };
}

export default { createBid, getBids, getMyBids, acceptBid, rejectBid };
