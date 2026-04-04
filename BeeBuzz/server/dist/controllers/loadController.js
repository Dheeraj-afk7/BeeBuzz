"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.updateLoad = exports.uploadProofOfDelivery = exports.cancelLoad = exports.updateLocation = exports.updateLoadStatus = exports.acceptLoad = exports.getLoad = exports.getLoads = exports.createLoad = void 0;
const uuid_1 = require("uuid");
const database_js_1 = require("../services/database.js");
const createLoad = async (req, res) => {
    try {
        const { pickupAddress, pickupLat, pickupLng, deliveryAddress, deliveryLat, deliveryLng, cargoType, cargoWeight, cargoDimensions, truckType, specialRequirements, pickupDate, deliveryDate, price } = req.body;
        // Convert undefined to null
        const _pickupLat = pickupLat ?? null;
        const _pickupLng = pickupLng ?? null;
        const _deliveryLat = deliveryLat ?? null;
        const _deliveryLng = deliveryLng ?? null;
        const _cargoWeight = cargoWeight ?? 0;
        const _cargoDimensions = cargoDimensions ?? null;
        const _specialRequirements = specialRequirements ?? null;
        const _price = price ?? 0;
        // Validate required fields
        if (!pickupAddress || !deliveryAddress || !cargoType || !_cargoWeight || !truckType || !pickupDate || !deliveryDate || !_price) {
            res.status(400).json({ success: false, error: 'All required fields must be provided' });
            return;
        }
        const loadId = (0, uuid_1.v4)();
        (0, database_js_1.runQuery)(`
      INSERT INTO loads (id, shipper_id, pickup_address, pickup_lat, pickup_lng, delivery_address, delivery_lat, delivery_lng, cargo_type, cargo_weight, cargo_dimensions, truck_type, special_requirements, pickup_date, delivery_date, price, status, current_status)
      VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, 'open', 'pending')
    `, [loadId, req.user?.userId, pickupAddress, _pickupLat, _pickupLng, deliveryAddress, _deliveryLat, _deliveryLng, cargoType, _cargoWeight, _cargoDimensions, truckType, _specialRequirements, pickupDate, deliveryDate, _price]);
        // Notify drivers about new load
        const drivers = (0, database_js_1.getAll)("SELECT id FROM users WHERE role = 'driver' AND document_status = 'verified'");
        drivers.forEach((driver) => {
            (0, database_js_1.runQuery)('INSERT INTO notifications (id, user_id, title, message, type, reference_id) VALUES (?, ?, ?, ?, ?, ?)', [(0, uuid_1.v4)(), driver.id, 'New Load Available', `New ${cargoType} load from ${pickupAddress.split(',')[0]} to ${deliveryAddress.split(',')[0]}`, 'new_load', loadId]);
        });
        const load = (0, database_js_1.getOne)('SELECT * FROM loads WHERE id = ?', [loadId]);
        res.status(201).json({ success: true, data: formatLoad(load) });
    }
    catch (error) {
        console.error('Create load error:', error);
        res.status(500).json({ success: false, error: 'Server error' });
    }
};
exports.createLoad = createLoad;
const getLoads = async (req, res) => {
    try {
        const { status } = req.query;
        let loads;
        if (req.user?.role === 'shipper') {
            let query = 'SELECT l.*, u.name as shipper_name, u.phone as shipper_phone, d.name as driver_name, d.phone as driver_phone, d.vehicle_type as driver_vehicle FROM loads l LEFT JOIN users u ON l.shipper_id = u.id LEFT JOIN users d ON l.driver_id = d.id WHERE l.shipper_id = ?';
            const params = [req.user.userId];
            if (status && status !== 'all') {
                query += ' AND l.status = ?';
                params.push(status);
            }
            query += ' ORDER BY l.created_at DESC';
            loads = (0, database_js_1.getAll)(query, params);
        }
        else if (req.user?.role === 'driver') {
            let query = 'SELECT l.*, u.name as shipper_name, u.phone as shipper_phone FROM loads l LEFT JOIN users u ON l.shipper_id = u.id WHERE 1=1';
            const params = [];
            if (status === 'open') {
                query += ' AND l.status = ?';
                params.push('open');
            }
            else if (status === 'my') {
                query += ' AND l.driver_id = ?';
                params.push(req.user.userId);
            }
            else if (status === 'available') {
                query += " AND l.status = 'open'";
            }
            else {
                query += ' AND (l.status = ? OR l.driver_id = ?)';
                params.push('open', req.user.userId);
            }
            query += ' ORDER BY l.created_at DESC';
            loads = (0, database_js_1.getAll)(query, params);
        }
        else {
            loads = (0, database_js_1.getAll)('SELECT * FROM loads ORDER BY created_at DESC');
        }
        res.json({ success: true, data: loads.map(formatLoad) });
    }
    catch (error) {
        console.error('Get loads error:', error);
        res.status(500).json({ success: false, error: 'Server error' });
    }
};
exports.getLoads = getLoads;
const getLoad = async (req, res) => {
    try {
        const { id } = req.params;
        const load = (0, database_js_1.getOne)(`
      SELECT l.*, u.name as shipper_name, u.phone as shipper_phone, u.company_name as shipper_company,
             d.name as driver_name, d.phone as driver_phone, d.vehicle_type as driver_vehicle, d.vehicle_number as driver_vehicle_number
      FROM loads l 
      LEFT JOIN users u ON l.shipper_id = u.id 
      LEFT JOIN users d ON l.driver_id = d.id 
      WHERE l.id = ?
    `, [id]);
        if (!load) {
            res.status(404).json({ success: false, error: 'Load not found' });
            return;
        }
        // Get bids for this load
        const bids = (0, database_js_1.getAll)(`
      SELECT b.*, u.name as driver_name, u.rating, u.total_jobs, u.vehicle_type, u.vehicle_number
      FROM bids b 
      LEFT JOIN users u ON b.driver_id = u.id 
      WHERE b.load_id = ?
      ORDER BY b.amount ASC
    `, [id]);
        // Get proof of delivery if delivered
        let pod = null;
        if (load.status === 'delivered') {
            pod = (0, database_js_1.getOne)('SELECT * FROM proof_of_delivery WHERE load_id = ?', [id]);
        }
        // Get location history
        const locations = (0, database_js_1.getAll)('SELECT * FROM location_updates WHERE load_id = ? ORDER BY timestamp DESC LIMIT 100', [id]);
        res.json({
            success: true,
            data: {
                ...formatLoad(load),
                bids: bids.map((b) => ({
                    id: b.id,
                    driverId: b.driver_id,
                    driverName: b.driver_name,
                    driverRating: b.rating,
                    driverTotalJobs: b.total_jobs,
                    driverVehicle: b.vehicle_type,
                    driverVehicleNumber: b.vehicle_number,
                    amount: b.amount,
                    notes: b.notes,
                    status: b.status,
                    estimatedArrival: b.estimated_arrival,
                    createdAt: b.created_at
                })),
                proofOfDelivery: pod ? {
                    id: pod.id,
                    photos: pod.photos ? JSON.parse(pod.photos) : [],
                    signature: pod.signature,
                    recipientName: pod.recipient_name,
                    deliveryNotes: pod.delivery_notes,
                    timestamp: pod.timestamp
                } : null,
                locations: locations.map((l) => ({
                    lat: l.latitude,
                    lng: l.longitude,
                    timestamp: l.timestamp
                }))
            }
        });
    }
    catch (error) {
        console.error('Get load error:', error);
        res.status(500).json({ success: false, error: 'Server error' });
    }
};
exports.getLoad = getLoad;
const acceptLoad = async (req, res) => {
    try {
        const { id } = req.params;
        const load = (0, database_js_1.getOne)('SELECT * FROM loads WHERE id = ?', [id]);
        if (!load) {
            res.status(404).json({ success: false, error: 'Load not found' });
            return;
        }
        if (load.status !== 'open') {
            res.status(400).json({ success: false, error: 'Load is not available' });
            return;
        }
        // Check if driver is verified
        const driver = (0, database_js_1.getOne)('SELECT * FROM users WHERE id = ?', [req.user?.userId]);
        if (driver.document_status !== 'verified') {
            res.status(400).json({ success: false, error: 'Your documents are not verified yet' });
            return;
        }
        // Update load
        (0, database_js_1.runQuery)('UPDATE loads SET driver_id = ?, status = ?, current_status = ? WHERE id = ?', [req.user?.userId, 'assigned', 'accepted', id]);
        // Create payment record (escrow)
        const paymentId = (0, uuid_1.v4)();
        const platformFee = load.price * 0.05;
        const netAmount = load.price - platformFee;
        (0, database_js_1.runQuery)(`
      INSERT INTO payments (id, load_id, shipper_id, driver_id, amount, platform_fee, net_amount, status)
      VALUES (?, ?, ?, ?, ?, ?, ?, 'held')
    `, [paymentId, id, load.shipper_id, req.user?.userId, load.price, platformFee, netAmount]);
        // Accept the driver's bid
        (0, database_js_1.runQuery)(`UPDATE bids SET status = 'accepted' WHERE load_id = ? AND driver_id = ?`, [id, req.user?.userId]);
        // Reject all other bids
        (0, database_js_1.runQuery)(`UPDATE bids SET status = 'rejected' WHERE load_id = ? AND driver_id != ?`, [id, req.user?.userId]);
        // Notify shipper
        (0, database_js_1.runQuery)(`
      INSERT INTO notifications (id, user_id, title, message, type, reference_id)
      VALUES (?, ?, ?, ?, ?, ?)
    `, [(0, uuid_1.v4)(), load.shipper_id, 'Bid Accepted', `Your load has been accepted by ${driver.name}`, 'load_accepted', id]);
        const updatedLoad = (0, database_js_1.getOne)('SELECT * FROM loads WHERE id = ?', [id]);
        // Broadcast update
        broadcastLoadUpdate(id, formatLoad(updatedLoad));
        res.json({ success: true, data: formatLoad(updatedLoad) });
    }
    catch (error) {
        console.error('Accept load error:', error);
        res.status(500).json({ success: false, error: 'Server error' });
    }
};
exports.acceptLoad = acceptLoad;
const updateLoadStatus = async (req, res) => {
    try {
        const { id } = req.params;
        const { status, notes } = req.body;
        const validStatuses = ['arrived_pickup', 'loaded', 'en_route', 'arrived_delivery', 'delivered', 'cancelled'];
        if (!validStatuses.includes(status)) {
            res.status(400).json({ success: false, error: 'Invalid status' });
            return;
        }
        const load = (0, database_js_1.getOne)('SELECT * FROM loads WHERE id = ?', [id]);
        if (!load) {
            res.status(404).json({ success: false, error: 'Load not found' });
            return;
        }
        if (load.driver_id !== req.user?.userId && req.user?.role !== 'admin') {
            res.status(403).json({ success: false, error: 'Not authorized' });
            return;
        }
        // Update status
        let dbStatus = 'in_transit';
        if (status === 'delivered')
            dbStatus = 'delivered';
        (0, database_js_1.runQuery)('UPDATE loads SET current_status = ?, status = ? WHERE id = ?', [status, dbStatus, id]);
        // If delivered, process payment release
        if (status === 'delivered') {
            (0, database_js_1.runQuery)("UPDATE payments SET status = 'released', released_at = CURRENT_TIMESTAMP WHERE load_id = ?", [id]);
            (0, database_js_1.runQuery)('UPDATE users SET total_jobs = total_jobs + 1 WHERE id = ?', [req.user?.userId]);
        }
        // Notify shipper
        const statusMessages = {
            'arrived_pickup': 'Driver has arrived at pickup location',
            'loaded': 'Cargo has been loaded and driver departed',
            'en_route': 'Shipment is on the way',
            'arrived_delivery': 'Driver has arrived at delivery location',
            'delivered': 'Shipment has been delivered!'
        };
        if (statusMessages[status]) {
            (0, database_js_1.runQuery)(`
        INSERT INTO notifications (id, user_id, title, message, type, reference_id)
        VALUES (?, ?, ?, ?, ?, ?)
      `, [(0, uuid_1.v4)(), load.shipper_id, 'Status Update', statusMessages[status], 'status_update', id]);
        }
        const updatedLoad = (0, database_js_1.getOne)('SELECT * FROM loads WHERE id = ?', [id]);
        broadcastLoadUpdate(id, formatLoad(updatedLoad));
        res.json({ success: true, data: formatLoad(updatedLoad) });
    }
    catch (error) {
        console.error('Update load status error:', error);
        res.status(500).json({ success: false, error: 'Server error' });
    }
};
exports.updateLoadStatus = updateLoadStatus;
const updateLocation = async (req, res) => {
    try {
        const { id } = req.params;
        const { latitude, longitude } = req.body;
        const load = (0, database_js_1.getOne)('SELECT * FROM loads WHERE id = ?', [id]);
        if (!load) {
            res.status(404).json({ success: false, error: 'Load not found' });
            return;
        }
        if (load.driver_id !== req.user?.userId) {
            res.status(403).json({ success: false, error: 'Not authorized' });
            return;
        }
        const locId = (0, uuid_1.v4)();
        (0, database_js_1.runQuery)('INSERT INTO location_updates (id, load_id, driver_id, latitude, longitude) VALUES (?, ?, ?, ?, ?)', [locId, id, req.user?.userId, latitude ?? 0, longitude ?? 0]);
        broadcastLocationUpdate(id, latitude ?? 0, longitude ?? 0);
        res.json({ success: true, data: { latitude, longitude, timestamp: new Date().toISOString() } });
    }
    catch (error) {
        console.error('Update location error:', error);
        res.status(500).json({ success: false, error: 'Server error' });
    }
};
exports.updateLocation = updateLocation;
const cancelLoad = async (req, res) => {
    try {
        const { id } = req.params;
        const load = (0, database_js_1.getOne)('SELECT * FROM loads WHERE id = ?', [id]);
        if (!load) {
            res.status(404).json({ success: false, error: 'Load not found' });
            return;
        }
        if (load.shipper_id !== req.user?.userId && req.user?.role !== 'admin') {
            res.status(403).json({ success: false, error: 'Not authorized' });
            return;
        }
        if (load.status !== 'open') {
            res.status(400).json({ success: false, error: 'Cannot cancel load in progress' });
            return;
        }
        (0, database_js_1.runQuery)('UPDATE loads SET status = ? WHERE id = ?', ['cancelled', id]);
        const updatedLoad = (0, database_js_1.getOne)('SELECT * FROM loads WHERE id = ?', [id]);
        broadcastLoadUpdate(id, formatLoad(updatedLoad));
        res.json({ success: true, data: formatLoad(updatedLoad) });
    }
    catch (error) {
        console.error('Cancel load error:', error);
        res.status(500).json({ success: false, error: 'Server error' });
    }
};
exports.cancelLoad = cancelLoad;
const uploadProofOfDelivery = async (req, res) => {
    try {
        const { id } = req.params;
        const { photos, signature, recipientName, deliveryNotes, latitude, longitude } = req.body;
        const load = (0, database_js_1.getOne)('SELECT * FROM loads WHERE id = ?', [id]);
        if (!load) {
            res.status(404).json({ success: false, error: 'Load not found' });
            return;
        }
        if (load.driver_id !== req.user?.userId) {
            res.status(403).json({ success: false, error: 'Not authorized' });
            return;
        }
        const podId = (0, uuid_1.v4)();
        (0, database_js_1.runQuery)(`
      INSERT INTO proof_of_delivery (id, load_id, photos, signature, recipient_name, delivery_notes, latitude, longitude)
      VALUES (?, ?, ?, ?, ?, ?, ?, ?)
    `, [podId, id, JSON.stringify(photos || []), signature, recipientName, deliveryNotes, latitude ?? 0, longitude ?? 0]);
        (0, database_js_1.runQuery)("UPDATE loads SET status = 'delivered', current_status = 'delivered' WHERE id = ?", [id]);
        (0, database_js_1.runQuery)("UPDATE payments SET status = 'released', released_at = CURRENT_TIMESTAMP WHERE load_id = ?", [id]);
        (0, database_js_1.runQuery)(`
      INSERT INTO notifications (id, user_id, title, message, type, reference_id)
      VALUES (?, ?, ?, ?, ?, ?)
    `, [(0, uuid_1.v4)(), load.shipper_id, 'Proof of Delivery', 'Driver has uploaded proof of delivery. Please confirm.', 'pod_uploaded', id]);
        const updatedLoad = (0, database_js_1.getOne)('SELECT * FROM loads WHERE id = ?', [id]);
        res.json({ success: true, data: formatLoad(updatedLoad) });
    }
    catch (error) {
        console.error('Upload POD error:', error);
        res.status(500).json({ success: false, error: 'Server error' });
    }
};
exports.uploadProofOfDelivery = uploadProofOfDelivery;
const updateLoad = async (req, res) => {
    try {
        const { id } = req.params;
        const { pickupAddress, pickupLat, pickupLng, deliveryAddress, deliveryLat, deliveryLng, cargoType, cargoWeight, truckType, specialRequirements, pickupDate, deliveryDate, price } = req.body;
        const load = (0, database_js_1.getOne)('SELECT * FROM loads WHERE id = ?', [id]);
        if (!load) {
            res.status(404).json({ success: false, error: 'Load not found' });
            return;
        }
        if (load.shipper_id !== req.user?.userId && req.user?.role !== 'admin') {
            res.status(403).json({ success: false, error: 'Not authorized' });
            return;
        }
        if (load.status !== 'open') {
            res.status(400).json({ success: false, error: 'Cannot edit a load that is no longer open' });
            return;
        }
        (0, database_js_1.runQuery)(`
      UPDATE loads SET 
        pickup_address = ?, pickup_lat = ?, pickup_lng = ?, 
        delivery_address = ?, delivery_lat = ?, delivery_lng = ?, 
        cargo_type = ?, cargo_weight = ?, truck_type = ?, 
        special_requirements = ?, pickup_date = ?, delivery_date = ?, price = ?
      WHERE id = ?
    `, [
            pickupAddress || load.pickup_address, pickupLat ?? load.pickup_lat, pickupLng ?? load.pickup_lng,
            deliveryAddress || load.delivery_address, deliveryLat ?? load.delivery_lat, deliveryLng ?? load.delivery_lng,
            cargoType || load.cargo_type, cargoWeight ?? load.cargo_weight, truckType || load.truck_type,
            specialRequirements ?? load.special_requirements, pickupDate || load.pickup_date, deliveryDate || load.delivery_date, price ?? load.price,
            id
        ]);
        const updatedLoad = (0, database_js_1.getOne)('SELECT * FROM loads WHERE id = ?', [id]);
        broadcastLoadUpdate(id, formatLoad(updatedLoad));
        res.json({ success: true, data: formatLoad(updatedLoad) });
    }
    catch (error) {
        console.error('Update load error:', error);
        res.status(500).json({ success: false, error: 'Server error' });
    }
};
exports.updateLoad = updateLoad;
function formatLoad(load) {
    return {
        id: load.id,
        shipperId: load.shipper_id,
        driverId: load.driver_id,
        pickupAddress: load.pickup_address,
        pickupLat: load.pickup_lat,
        pickupLng: load.pickup_lng,
        deliveryAddress: load.delivery_address,
        deliveryLat: load.delivery_lat,
        deliveryLng: load.delivery_lng,
        cargoType: load.cargo_type,
        cargoWeight: load.cargo_weight,
        cargoDimensions: load.cargo_dimensions,
        truckType: load.truck_type,
        specialRequirements: load.special_requirements,
        pickupDate: load.pickup_date,
        deliveryDate: load.delivery_date,
        price: load.price,
        status: load.status,
        currentStatus: load.current_status,
        bidCount: load.bid_count,
        createdAt: load.created_at,
        shipperName: load.shipper_name,
        shipperPhone: load.shipper_phone,
        shipperCompany: load.shipper_company,
        driverName: load.driver_name,
        driverPhone: load.driver_phone,
        driverVehicle: load.driver_vehicle,
        driverVehicleNumber: load.driver_vehicle_number
    };
}
function broadcastLoadUpdate(loadId, data) {
    const message = JSON.stringify({ type: 'load_update', loadId, data });
    if (global.wsClients) {
        global.wsClients.forEach((client) => {
            if (client.readyState === 1) {
                client.send(message);
            }
        });
    }
}
function broadcastLocationUpdate(loadId, lat, lng) {
    const message = JSON.stringify({ type: 'location_update', loadId, lat, lng, timestamp: new Date().toISOString() });
    if (global.wsClients) {
        global.wsClients.forEach((client) => {
            if (client.readyState === 1) {
                client.send(message);
            }
        });
    }
}
exports.default = { createLoad: exports.createLoad, getLoads: exports.getLoads, getLoad: exports.getLoad, updateLoad: exports.updateLoad, acceptLoad: exports.acceptLoad, updateLoadStatus: exports.updateLoadStatus, updateLocation: exports.updateLocation, cancelLoad: exports.cancelLoad, uploadProofOfDelivery: exports.uploadProofOfDelivery };
