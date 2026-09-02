import { Response } from 'express';
import bcrypt from 'bcryptjs';
import { v4 as uuidv4 } from 'uuid';
import { getOne, getAll, runQuery, saveDatabase } from '../services/database.js';
import { AuthRequest } from '../middleware/auth.js';

// ─── Platform Stats ──────────────────────────────────────────────────────────
export const getStats = async (req: AuthRequest, res: Response): Promise<void> => {
  try {
    const [
      totalUsers, totalDrivers, totalShippers,
      totalLoads, activeLoads, completedLoads,
      totalRevenue, pendingEscrow, releasedEscrow,
      pendingDocs, verifiedUsers,
      recentLoads, revenueByDay, loadsByStatus,
      topDrivers, topShippers, loadsByMonth
    ] = await Promise.all([
      getOne(`SELECT COUNT(*) as count FROM users WHERE role != 'admin'`, []),
      getOne(`SELECT COUNT(*) as count FROM users WHERE role = 'driver'`, []),
      getOne(`SELECT COUNT(*) as count FROM users WHERE role = 'shipper'`, []),
      getOne(`SELECT COUNT(*) as count FROM loads`, []),
      getOne(`SELECT COUNT(*) as count FROM loads WHERE status NOT IN ('delivered', 'cancelled')`, []),
      getOne(`SELECT COUNT(*) as count FROM loads WHERE status = 'delivered'`, []),
      getOne(`SELECT COALESCE(SUM(amount), 0) as total FROM payments`, []),
      getOne(`SELECT COALESCE(SUM(amount), 0) as total FROM payments WHERE status = 'held'`, []),
      getOne(`SELECT COALESCE(SUM(net_amount), 0) as total FROM payments WHERE status = 'released'`, []),
      getOne(`SELECT COUNT(*) as count FROM users WHERE document_status = 'pending' AND role = 'driver'`, []),
      getOne(`SELECT COUNT(*) as count FROM users WHERE is_verified = 1`, []),

      // Last 7 days loads
      getAll(`SELECT DATE(created_at) as date, COUNT(*) as count, COALESCE(SUM(price),0) as revenue
              FROM loads WHERE created_at >= NOW() - INTERVAL '7 days'
              GROUP BY DATE(created_at) ORDER BY date ASC`, []),

      // Revenue last 30 days
      getAll(`SELECT DATE(created_at) as date, COALESCE(SUM(amount),0) as revenue, COUNT(*) as count
              FROM payments WHERE created_at >= NOW() - INTERVAL '30 days'
              GROUP BY DATE(created_at) ORDER BY date ASC`, []),

      // Load breakdown by status
      getAll(`SELECT current_status as status, COUNT(*) as count FROM loads GROUP BY current_status`, []),

      // Top 5 drivers by completed jobs
      getAll(`SELECT u.id, u.name, u.rating, u.total_jobs,
                COALESCE(SUM(p.net_amount),0) as total_earned
              FROM users u
              LEFT JOIN payments p ON p.driver_id = u.id AND p.status = 'released'
              WHERE u.role = 'driver'
              GROUP BY u.id, u.name, u.rating, u.total_jobs
              ORDER BY u.total_jobs DESC LIMIT 5`, []),

      // Top 5 shippers by loads posted
      getAll(`SELECT u.id, u.name, u.company_name, COUNT(l.id) as total_loads,
                COALESCE(SUM(l.price),0) as total_spent
              FROM users u
              LEFT JOIN loads l ON l.shipper_id = u.id
              WHERE u.role = 'shipper'
              GROUP BY u.id, u.name, u.company_name
              ORDER BY total_loads DESC LIMIT 5`, []),

      // Loads by month (last 6 months)
      getAll(`SELECT TO_CHAR(created_at, 'Mon YYYY') as month,
                DATE_TRUNC('month', created_at) as month_start,
                COUNT(*) as count,
                COALESCE(SUM(price),0) as revenue
              FROM loads
              WHERE created_at >= NOW() - INTERVAL '6 months'
              GROUP BY TO_CHAR(created_at, 'Mon YYYY'), DATE_TRUNC('month', created_at)
              ORDER BY month_start ASC`, []),
    ]);

    res.json({
      success: true,
      data: {
        overview: {
          totalUsers: parseInt(totalUsers?.count || 0),
          totalDrivers: parseInt(totalDrivers?.count || 0),
          totalShippers: parseInt(totalShippers?.count || 0),
          totalLoads: parseInt(totalLoads?.count || 0),
          activeLoads: parseInt(activeLoads?.count || 0),
          completedLoads: parseInt(completedLoads?.count || 0),
          totalRevenue: parseFloat(totalRevenue?.total || 0),
          pendingEscrow: parseFloat(pendingEscrow?.total || 0),
          releasedEscrow: parseFloat(releasedEscrow?.total || 0),
          pendingDocs: parseInt(pendingDocs?.count || 0),
          verifiedUsers: parseInt(verifiedUsers?.count || 0),
        },
        charts: {
          recentLoads,
          revenueByDay,
          loadsByStatus,
          topDrivers,
          topShippers,
          loadsByMonth,
        }
      }
    });
  } catch (error) {
    console.error('Admin stats error:', error);
    res.status(500).json({ success: false, error: 'Server error' });
  }
};

// ─── Users ───────────────────────────────────────────────────────────────────
export const getUsers = async (req: AuthRequest, res: Response): Promise<void> => {
  try {
    const { role, status, search, page = 1, limit = 20 } = req.query;
    const offset = (parseInt(page as string) - 1) * parseInt(limit as string);

    let where = `WHERE u.role != 'admin'`;
    const params: any[] = [];
    let idx = 1;

    if (role) { where += ` AND u.role = $${idx++}`; params.push(role); }
    if (status === 'verified') { where += ` AND u.is_verified = 1`; }
    if (status === 'pending') { where += ` AND u.document_status = 'pending'`; }
    if (status === 'rejected') { where += ` AND u.document_status = 'rejected'`; }
    if (search) {
      where += ` AND (u.name ILIKE $${idx} OR u.email ILIKE $${idx} OR u.phone ILIKE $${idx})`;
      params.push(`%${search}%`);
      idx++;
    }

    const users = await getAll(`
      SELECT u.id, u.email, u.name, u.phone, u.role, u.company_name, u.gstin,
             u.is_verified, u.document_status, u.rating, u.total_jobs,
             u.license_number, u.vehicle_number, u.vehicle_type,
             u.license_photo, u.insurance_photo, u.profile_photo,
             u.dl_verified, u.created_at,
             COUNT(l.id) as load_count
      FROM users u
      LEFT JOIN loads l ON (l.shipper_id = u.id OR l.driver_id = u.id)
      ${where}
      GROUP BY u.id
      ORDER BY u.created_at DESC
      LIMIT $${idx++} OFFSET $${idx++}
    `, [...params, parseInt(limit as string), offset]);

    const total = await getOne(`SELECT COUNT(*) as count FROM users u ${where}`, params);

    res.json({
      success: true,
      data: {
        users: users.map(formatAdminUser),
        total: parseInt(total?.count || 0),
        page: parseInt(page as string),
        limit: parseInt(limit as string)
      }
    });
  } catch (error) {
    console.error('Admin get users error:', error);
    res.status(500).json({ success: false, error: 'Server error' });
  }
};

export const getUser = async (req: AuthRequest, res: Response): Promise<void> => {
  try {
    const { id } = req.params;
    const user = await getOne(`SELECT * FROM users WHERE id = $1`, [id]);
    if (!user) { res.status(404).json({ success: false, error: 'User not found' }); return; }

    const loads = await getAll(`
      SELECT id, pickup_address, delivery_address, status, current_status, price, created_at
      FROM loads WHERE shipper_id = $1 OR driver_id = $1
      ORDER BY created_at DESC LIMIT 10
    `, [id]);

    const payments = await getAll(`
      SELECT p.id, p.amount, p.net_amount, p.status, p.created_at,
             l.pickup_address, l.delivery_address
      FROM payments p LEFT JOIN loads l ON p.load_id = l.id
      WHERE p.driver_id = $1 OR p.shipper_id = $1
      ORDER BY p.created_at DESC LIMIT 10
    `, [id]);

    res.json({
      success: true,
      data: {
        user: formatAdminUser(user),
        loads,
        payments
      }
    });
  } catch (error) {
    console.error('Admin get user error:', error);
    res.status(500).json({ success: false, error: 'Server error' });
  }
};

export const verifyUser = async (req: AuthRequest, res: Response): Promise<void> => {
  try {
    const { id } = req.params;
    const { action, documentType, comment } = req.body;
    // action: 'approve' | 'reject' | 'verify_doc' | 'reject_doc'

    const user = await getOne(`SELECT * FROM users WHERE id = $1`, [id]);
    if (!user) { res.status(404).json({ success: false, error: 'User not found' }); return; }

    if (action === 'approve') {
      await runQuery(`UPDATE users SET is_verified = 1, document_status = 'verified' WHERE id = ?`, [id]);
    } else if (action === 'reject') {
      await runQuery(`UPDATE users SET is_verified = 0, document_status = 'rejected' WHERE id = ?`, [id]);
    } else if (action === 'verify_doc') {
      // Approve specific document type — just mark overall as verified for now
      await runQuery(`UPDATE users SET document_status = 'verified', is_verified = 1 WHERE id = ?`, [id]);
    } else if (action === 'reject_doc') {
      await runQuery(`UPDATE users SET document_status = 'rejected' WHERE id = ?`, [id]);
    }

    await saveDatabase();
    const updated = await getOne(`SELECT * FROM users WHERE id = $1`, [id]);
    res.json({ success: true, data: formatAdminUser(updated) });
  } catch (error) {
    console.error('Admin verify user error:', error);
    res.status(500).json({ success: false, error: 'Server error' });
  }
};

// ─── Orders ──────────────────────────────────────────────────────────────────
export const getLoads = async (req: AuthRequest, res: Response): Promise<void> => {
  try {
    const { status, search, page = 1, limit = 20 } = req.query;
    const offset = (parseInt(page as string) - 1) * parseInt(limit as string);

    let where = `WHERE 1=1`;
    const params: any[] = [];
    let idx = 1;

    if (status) { where += ` AND l.status = $${idx++}`; params.push(status); }
    if (search) {
      where += ` AND (l.pickup_address ILIKE $${idx} OR l.delivery_address ILIKE $${idx} OR s.name ILIKE $${idx})`;
      params.push(`%${search}%`);
      idx++;
    }

    const loads = await getAll(`
      SELECT l.*, s.name as shipper_name, s.email as shipper_email,
             d.name as driver_name, d.email as driver_email,
             (SELECT COUNT(*) FROM bids WHERE load_id = l.id) as bid_count_real
      FROM loads l
      LEFT JOIN users s ON l.shipper_id = s.id
      LEFT JOIN users d ON l.driver_id = d.id
      ${where}
      ORDER BY l.created_at DESC
      LIMIT $${idx++} OFFSET $${idx++}
    `, [...params, parseInt(limit as string), offset]);

    const total = await getOne(`
      SELECT COUNT(*) as count FROM loads l
      LEFT JOIN users s ON l.shipper_id = s.id
      ${where}
    `, params);

    res.json({
      success: true,
      data: {
        loads,
        total: parseInt(total?.count || 0),
        page: parseInt(page as string),
        limit: parseInt(limit as string)
      }
    });
  } catch (error) {
    console.error('Admin get loads error:', error);
    res.status(500).json({ success: false, error: 'Server error' });
  }
};

// ─── Payments ────────────────────────────────────────────────────────────────
export const getPayments = async (req: AuthRequest, res: Response): Promise<void> => {
  try {
    const { status, page = 1, limit = 20 } = req.query;
    const offset = (parseInt(page as string) - 1) * parseInt(limit as string);

    let where = `WHERE 1=1`;
    const params: any[] = [];
    let idx = 1;

    if (status) { where += ` AND p.status = $${idx++}`; params.push(status); }

    const payments = await getAll(`
      SELECT p.*, l.pickup_address, l.delivery_address, l.cargo_type,
             s.name as shipper_name, s.email as shipper_email,
             d.name as driver_name, d.email as driver_email
      FROM payments p
      LEFT JOIN loads l ON p.load_id = l.id
      LEFT JOIN users s ON p.shipper_id = s.id
      LEFT JOIN users d ON p.driver_id = d.id
      ${where}
      ORDER BY p.created_at DESC
      LIMIT $${idx++} OFFSET $${idx++}
    `, [...params, parseInt(limit as string), offset]);

    const summary = await getOne(`
      SELECT 
        COALESCE(SUM(amount), 0) as total_volume,
        COALESCE(SUM(platform_fee), 0) as total_fees,
        COALESCE(SUM(CASE WHEN status = 'held' THEN amount ELSE 0 END), 0) as held,
        COALESCE(SUM(CASE WHEN status = 'released' THEN net_amount ELSE 0 END), 0) as released,
        COUNT(*) as total_count
      FROM payments p ${where}
    `, params);

    const total = await getOne(`SELECT COUNT(*) as count FROM payments p ${where}`, params);

    res.json({
      success: true,
      data: {
        payments,
        summary,
        total: parseInt(total?.count || 0),
        page: parseInt(page as string),
        limit: parseInt(limit as string)
      }
    });
  } catch (error) {
    console.error('Admin get payments error:', error);
    res.status(500).json({ success: false, error: 'Server error' });
  }
};

// ─── Pending Documents ───────────────────────────────────────────────────────
export const getPendingDocuments = async (req: AuthRequest, res: Response): Promise<void> => {
  try {
    const users = await getAll(`
      SELECT id, name, email, phone, role, 
             license_photo, insurance_photo, profile_photo,
             license_number, vehicle_number, vehicle_type,
             document_status, dl_verified, created_at
      FROM users
      WHERE role = 'driver' AND (license_photo IS NOT NULL OR insurance_photo IS NOT NULL OR profile_photo IS NOT NULL)
      ORDER BY CASE WHEN document_status = 'pending' THEN 0 ELSE 1 END, created_at DESC
    `, []);

    res.json({ success: true, data: users });
  } catch (error) {
    console.error('Admin get docs error:', error);
    res.status(500).json({ success: false, error: 'Server error' });
  }
};

// ─── Seed Admin ──────────────────────────────────────────────────────────────
export const seedAdmin = async () => {
  try {
    const existing = await getOne(`SELECT id FROM users WHERE email = $1`, ['admin@beebuzz.com']);
    if (!existing) {
      const hashedPassword = await bcrypt.hash('Admin@1234', 10);
      await runQuery(`
        INSERT INTO users (id, email, password, name, phone, role, document_status, is_verified)
        VALUES (?, ?, ?, ?, ?, ?, ?, ?)
      `, [uuidv4(), 'admin@beebuzz.com', hashedPassword, 'BeeBuzz Admin', '9999999999', 'admin', 'verified', 1]);
      console.log('✅ Admin account seeded: admin@beebuzz.com / Admin@1234');
    }
  } catch (err) {
    console.error('Seed admin error:', err);
  }
};

// ─── Helpers ─────────────────────────────────────────────────────────────────
function formatAdminUser(u: any) {
  return {
    id: u.id,
    email: u.email,
    name: u.name,
    phone: u.phone,
    role: u.role,
    companyName: u.company_name,
    gstin: u.gstin,
    isVerified: Boolean(u.is_verified),
    documentStatus: u.document_status,
    rating: u.rating,
    totalJobs: u.total_jobs,
    licenseNumber: u.license_number,
    vehicleNumber: u.vehicle_number,
    vehicleType: u.vehicle_type,
    licensePhoto: u.license_photo,
    insurancePhoto: u.insurance_photo,
    profilePhoto: u.profile_photo,
    dlVerified: Boolean(u.dl_verified),
    createdAt: u.created_at,
    loadCount: u.load_count,
  };
}

export default { getStats, getUsers, getUser, verifyUser, getLoads, getPayments, getPendingDocuments, seedAdmin };
