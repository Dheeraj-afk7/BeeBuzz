import { Response } from 'express';
import bcrypt from 'bcryptjs';
import jwt from 'jsonwebtoken';
import { v4 as uuidv4 } from 'uuid';
import db from '../services/database.js';
import { AuthRequest } from '../middleware/auth.js';

const JWT_SECRET = process.env.JWT_SECRET || 'beebuzz-secret-key-2024';

export const register = async (req: AuthRequest, res: Response): Promise<void> => {
  try {
    const { email, password, name, phone, role, companyName, gstin, licenseNumber, vehicleType, vehicleNumber } = req.body;
    
    // Validate required fields
    if (!email || !password || !name || !phone || !role) {
      res.status(400).json({ success: false, error: 'All fields are required' });
      return;
    }
    
    // Check if user exists
    const existingUser = db.prepare('SELECT id FROM users WHERE email = ?').get(email);
    if (existingUser) {
      res.status(400).json({ success: false, error: 'Email already registered' });
      return;
    }
    
    // Hash password
    const hashedPassword = await bcrypt.hash(password, 10);
    const userId = uuidv4();
    
    // Determine document status for drivers
    let documentStatus = 'pending';
    let isVerified = 0;
    if (role === 'driver') {
      documentStatus = licenseNumber ? 'pending' : 'pending';
    }
    
    // Insert user
    db.prepare(`
      INSERT INTO users (id, email, password, name, phone, role, company_name, gstin, license_number, vehicle_type, vehicle_number, document_status, is_verified)
      VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)
    `).run(userId, email, hashedPassword, name, phone, role, companyName || null, gstin || null, licenseNumber || null, vehicleType || null, vehicleNumber || null, documentStatus, isVerified);
    
    // Generate token
    const token = jwt.sign({ userId, email, role }, JWT_SECRET, { expiresIn: '7d' });
    
    const user = db.prepare('SELECT * FROM users WHERE id = ?').get(userId) as any;
    
    res.status(201).json({
      success: true,
      data: {
        token,
        user: formatUser(user)
      }
    });
  } catch (error) {
    console.error('Register error:', error);
    res.status(500).json({ success: false, error: 'Server error during registration' });
  }
};

export const login = async (req: AuthRequest, res: Response): Promise<void> => {
  try {
    const { email, password } = req.body;
    
    if (!email || !password) {
      res.status(400).json({ success: false, error: 'Email and password required' });
      return;
    }
    
    // Find user
    const user = db.prepare('SELECT * FROM users WHERE email = ?').get(email) as any;
    if (!user) {
      res.status(401).json({ success: false, error: 'Invalid email or password' });
      return;
    }
    
    // Check password
    const isMatch = await bcrypt.compare(password, user.password);
    if (!isMatch) {
      res.status(401).json({ success: false, error: 'Invalid email or password' });
      return;
    }
    
    // Generate token
    const token = jwt.sign(
      { userId: user.id, email: user.email, role: user.role },
      JWT_SECRET,
      { expiresIn: '7d' }
    );
    
    res.json({
      success: true,
      data: {
        token,
        user: formatUser(user)
      }
    });
  } catch (error) {
    console.error('Login error:', error);
    res.status(500).json({ success: false, error: 'Server error during login' });
  }
};

export const getMe = async (req: AuthRequest, res: Response): Promise<void> => {
  try {
    const user = db.prepare('SELECT * FROM users WHERE id = ?').get(req.user?.userId) as any;
    
    if (!user) {
      res.status(404).json({ success: false, error: 'User not found' });
      return;
    }
    
    res.json({ success: true, data: formatUser(user) });
  } catch (error) {
    console.error('Get me error:', error);
    res.status(500).json({ success: false, error: 'Server error' });
  }
};

export const updateProfile = async (req: AuthRequest, res: Response): Promise<void> => {
  try {
    const { name, phone, companyName, gstin, address, licenseNumber, insuranceNumber, vehicleType, vehicleNumber, rcNumber, profilePhoto } = req.body;
    
    const user = db.prepare('SELECT * FROM users WHERE id = ?').get(req.user?.userId) as any;
    
    if (!user) {
      res.status(404).json({ success: false, error: 'User not found' });
      return;
    }
    
    // Update fields
    db.prepare(`
      UPDATE users SET 
        name = COALESCE(?, name),
        phone = COALESCE(?, phone),
        company_name = COALESCE(?, company_name),
        gstin = COALESCE(?, gstin),
        address = COALESCE(?, address),
        license_number = COALESCE(?, license_number),
        insurance_number = COALESCE(?, insurance_number),
        vehicle_type = COALESCE(?, vehicle_type),
        vehicle_number = COALESCE(?, vehicle_number),
        rc_number = COALESCE(?, rc_number),
        profile_photo = COALESCE(?, profile_photo),
        document_status = CASE 
          WHEN license_number IS NOT NULL AND license_number != '' THEN 'pending' 
          ELSE document_status 
        END
      WHERE id = ?
    `).run(name, phone, companyName, gstin, address, licenseNumber, insuranceNumber, vehicleType, vehicleNumber, rcNumber, profilePhoto, req.user?.userId);
    
    const updatedUser = db.prepare('SELECT * FROM users WHERE id = ?').get(req.user?.userId) as any;
    
    res.json({ success: true, data: formatUser(updatedUser) });
  } catch (error) {
    console.error('Update profile error:', error);
    res.status(500).json({ success: false, error: 'Server error' });
  }
};

export const uploadDocument = async (req: AuthRequest, res: Response): Promise<void> => {
  try {
    const { documentType, documentPhoto } = req.body;
    
    // This would handle file upload in production
    // For now, we'll just update the document status
    
    const user = db.prepare('SELECT * FROM users WHERE id = ?').get(req.user?.userId) as any;
    
    if (!user) {
      res.status(404).json({ success: false, error: 'User not found' });
      return;
    }
    
    let updateField = '';
    switch(documentType) {
      case 'license':
        updateField = 'license_photo = ?';
        break;
      case 'insurance':
        updateField = 'insurance_photo = ?';
        break;
      case 'profile':
        updateField = 'profile_photo = ?';
        break;
      default:
        res.status(400).json({ success: false, error: 'Invalid document type' });
        return;
    }
    
    db.prepare(`UPDATE users SET ${updateField}, document_status = 'pending' WHERE id = ?`).run(documentPhoto, req.user?.userId);
    
    res.json({ success: true, message: 'Document uploaded successfully' });
  } catch (error) {
    console.error('Upload document error:', error);
    res.status(500).json({ success: false, error: 'Server error' });
  }
};

function formatUser(user: any) {
  return {
    id: user.id,
    email: user.email,
    name: user.name,
    phone: user.phone,
    role: user.role,
    companyName: user.company_name,
    gstin: user.gstin,
    address: user.address,
    profilePhoto: user.profile_photo,
    licenseNumber: user.license_number,
    insuranceNumber: user.insurance_number,
    vehicleType: user.vehicle_type,
    vehicleNumber: user.vehicle_number,
    documentStatus: user.document_status,
    rating: user.rating,
    totalJobs: user.total_jobs,
    isVerified: Boolean(user.is_verified),
    createdAt: user.created_at
  };
}

export default { register, login, getMe, updateProfile, uploadDocument };
