import { Response } from 'express';
import { v4 as uuidv4 } from 'uuid';
import { getOne, getAll, runQuery, saveDatabase } from '../services/database.js';
import { AuthRequest } from '../middleware/auth.js';

export const createBid = async (req: AuthRequest, res: Response): Promise<void> => {
  try {
    const { loadId, amount, notes, estimatedArrival } = req.body;
    
    if (!loadId || !amount) {
      res.status(400).json({ success: false, error: 'Load ID and amount required' });
      return;
    }
    
    const load = await getOne('SELECT * FROM loads WHERE id = ?', [loadId]);
    
    if (!load) {
      res.status(404).json({ success: false, error: 'Load not found' });
      return;
    }
    
    if (load.status !== 'open') {
      res.status(400).json({ success: false, error: 'Load is no longer available' });
      return;
    }
    
    // Check if driver already bid
    const existingBid = await getOne('SELECT * FROM bids WHERE load_id = ? AND driver_id = ?', [loadId, req.user?.userId]);
    if (existingBid) {
      res.status(400).json({ success: false, error: 'You have already placed a bid' });
      return;
    }
    
    const bidId = uuidv4();
    
    await runQuery(`
      INSERT INTO bids (id, load_id, driver_id, amount, notes, estimated_arrival)
      VALUES (?, ?, ?, ?, ?, ?)
    `, [bidId, loadId, req.user?.userId, amount, notes, estimatedArrival]);
    
    // Update bid count
    await runQuery('UPDATE loads SET bid_count = bid_count + 1 WHERE id = ?', [loadId]);
    
    // Notify shipper
    const driver = await getOne('SELECT name, rating FROM users WHERE id = ?', [req.user?.userId]);
    await runQuery(`
      INSERT INTO notifications (id, user_id, title, message, type, reference_id)
      VALUES (?, ?, ?, ?, ?, ?)
    `, [uuidv4(), load.shipper_id, 'New Bid Received', `${driver.name} placed a bid of ₹${amount}`, 'new_bid', loadId]);
    
    await saveDatabase();
    
    const bid = await getOne('SELECT * FROM bids WHERE id = ?', [bidId]);
    
    res.status(201).json({ success: true, data: formatBid(bid) });
  } catch (error) {
    console.error('Create bid error:', error);
    res.status(500).json({ success: false, error: 'Server error' });
  }
};

export const getBids = async (req: AuthRequest, res: Response): Promise<void> => {
  try {
    const { loadId } = req.params;
    
    const bids = await getAll(`
      SELECT b.*, u.name as driver_name, u.rating, u.total_jobs, u.vehicle_type, u.vehicle_number, u.profile_photo
      FROM bids b 
      LEFT JOIN users u ON b.driver_id = u.id 
      WHERE b.load_id = ?
      ORDER BY b.amount ASC
    `, [loadId]);
    
    res.json({ success: true, data: bids.map(formatBid) });
  } catch (error) {
    console.error('Get bids error:', error);
    res.status(500).json({ success: false, error: 'Server error' });
  }
};

export const getMyBids = async (req: AuthRequest, res: Response): Promise<void> => {
  try {
    const bids = await getAll(`
      SELECT b.*, l.pickup_address, l.delivery_address, l.cargo_type, l.price as load_price, l.status as load_status, u.name as shipper_name
      FROM bids b 
      LEFT JOIN loads l ON b.load_id = l.id
      LEFT JOIN users u ON l.shipper_id = u.id
      WHERE b.driver_id = ?
      ORDER BY b.created_at DESC
    `, [req.user?.userId]);
    
    res.json({ success: true, data: bids.map(formatMyBid) });
  } catch (error) {
    console.error('Get my bids error:', error);
    res.status(500).json({ success: false, error: 'Server error' });
  }
};

export const acceptBid = async (req: AuthRequest, res: Response): Promise<void> => {
  try {
    const { bidId } = req.params;
    
    const bid = await getOne('SELECT * FROM bids WHERE id = ?', [bidId]);
    
    if (!bid) {
      res.status(404).json({ success: false, error: 'Bid not found' });
      return;
    }
    
    const load = await getOne('SELECT * FROM loads WHERE id = ?', [bid.load_id]);
    
    if (load.shipper_id !== req.user?.userId) {
      res.status(403).json({ success: false, error: 'Not authorized' });
      return;
    }
    
    // Accept this bid
    await runQuery("UPDATE bids SET status = 'accepted' WHERE id = ?", [bidId]);
    
    // Reject all other bids for this load
    await runQuery("UPDATE bids SET status = 'rejected' WHERE load_id = ? AND id != ?", [bid.load_id, bidId]);
    
    // Update load
    await runQuery("UPDATE loads SET driver_id = ?, status = 'assigned', current_status = 'accepted' WHERE id = ?",
      [bid.driver_id, bid.load_id]);
    
    // Create payment record (escrow)
    const paymentId = uuidv4();
    const platformFee = load.price * 0.05;
    const netAmount = load.price - platformFee;
    
    await runQuery(`
      INSERT INTO payments (id, load_id, shipper_id, driver_id, amount, platform_fee, net_amount, status)
      VALUES (?, ?, ?, ?, ?, ?, ?, 'held')
    `, [paymentId, load.id, load.shipper_id, bid.driver_id, load.price, platformFee, netAmount]);
    
    // Notify driver
    const driver = await getOne('SELECT name FROM users WHERE id = ?', [bid.driver_id]);
    await runQuery(`
      INSERT INTO notifications (id, user_id, title, message, type, reference_id)
      VALUES (?, ?, ?, ?, ?, ?)
    `, [uuidv4(), bid.driver_id, 'Bid Accepted', 'Your bid has been accepted!', 'bid_accepted', bid.load_id]);
    
    await saveDatabase();
    
    const updatedLoad = await getOne('SELECT * FROM loads WHERE id = ?', [bid.load_id]);
    
    res.json({ success: true, data: { load: updatedLoad, bid: bid } });
  } catch (error) {
    console.error('Accept bid error:', error);
    res.status(500).json({ success: false, error: 'Server error' });
  }
};

export const rejectBid = async (req: AuthRequest, res: Response): Promise<void> => {
  try {
    const { bidId } = req.params;
    
    const bid = await getOne('SELECT * FROM bids WHERE id = ?', [bidId]);
    
    if (!bid) {
      res.status(404).json({ success: false, error: 'Bid not found' });
      return;
    }
    
    const load = await getOne('SELECT * FROM loads WHERE id = ?', [bid.load_id]);
    
    if (load.shipper_id !== req.user?.userId) {
      res.status(403).json({ success: false, error: 'Not authorized' });
      return;
    }
    
    await runQuery("UPDATE bids SET status = 'rejected' WHERE id = ?", [bidId]);
    
    // Notify driver
    await runQuery(`
      INSERT INTO notifications (id, user_id, title, message, type, reference_id)
      VALUES (?, ?, ?, ?, ?, ?)
    `, [uuidv4(), bid.driver_id, 'Bid Rejected', 'Your bid has been rejected', 'bid_rejected', bid.load_id]);
    
    await saveDatabase();
    
    res.json({ success: true, message: 'Bid rejected' });
  } catch (error) {
    console.error('Reject bid error:', error);
    res.status(500).json({ success: false, error: 'Server error' });
  }
};

export const updateBid = async (req: AuthRequest, res: Response): Promise<void> => {
  try {
    const { bidId } = req.params;
    const { amount, notes, estimatedArrival } = req.body;
    
    const bid = await getOne('SELECT * FROM bids WHERE id = ?', [bidId]);
    
    if (!bid) {
      res.status(404).json({ success: false, error: 'Bid not found' });
      return;
    }
    
    if (bid.driver_id !== req.user?.userId && req.user?.role !== 'admin') {
      res.status(403).json({ success: false, error: 'Not authorized' });
      return;
    }
    
    console.log(`[updateBid] Received PUT /bids/${bidId} with body =`, req.body);
    
    if (bid.status !== 'pending') {
      res.status(400).json({ success: false, error: 'Cannot edit a bid that is already accepted or rejected' });
      return;
    }
    
    console.log(`[updateBid] Updating DB. New amount =`, amount, `Old amount =`, bid.amount, `Array =`, [amount ?? bid.amount, notes ?? bid.notes, estimatedArrival ?? bid.estimated_arrival, bidId]);
    
    await runQuery(`
      UPDATE bids SET amount = ?, notes = ?, estimated_arrival = ?
      WHERE id = ?
    `, [amount ?? bid.amount, notes ?? bid.notes, estimatedArrival ?? bid.estimated_arrival, bidId]);
    
    await saveDatabase();
    
    const updatedBid = await getOne('SELECT * FROM bids WHERE id = ?', [bidId]);
    
    res.json({ success: true, data: formatBid(updatedBid) });
  } catch (error) {
    console.error('Update bid error:', error);
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

export default { createBid, getBids, getMyBids, updateBid, acceptBid, rejectBid };
