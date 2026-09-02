import { Response } from 'express';
import bcrypt from 'bcryptjs';
import jwt from 'jsonwebtoken';
import { v4 as uuidv4 } from 'uuid';
import { getOne, getAll, runQuery, saveDatabase } from '../services/database.js'; 
import { AuthRequest } from '../middleware/auth.js';

const JWT_SECRET = process.env.JWT_SECRET || 'beebuzz-secret-key-2024';

export const register = async (req: AuthRequest, res: Response): Promise<void> => {
  try {
    const { email, password, name, phone, role, companyName, gstin, licenseNumber, vehicleType, vehicleNumber } = req.body;
    
    if (!email || !password || !name || !phone || !role) {
      res.status(400).json({ success: false, error: 'All fields are required' });
      return;
    }

    const passwordRegex = /^(?=.*[a-z])(?=.*[A-Z])(?=.*[!@#$%^&*(),.?":{}|<>]).{8,}$/;
    if (!passwordRegex.test(password)) {
      res.status(400).json({ success: false, error: 'Password does not meet security requirements' });
      return;
    }
    
    const existingUser = await getOne('SELECT id FROM users WHERE email = ?', [email]);
    if (existingUser) {
      res.status(400).json({ success: false, error: 'Email already registered' });
      return;
    }
    
    const hashedPassword = await bcrypt.hash(password, 10);
    const userId = uuidv4();
    
    let documentStatus = 'pending';
    let isVerified = 0;
    if (role === 'driver') {
      documentStatus = 'pending';
    }
    
    await runQuery(`
      INSERT INTO users (id, email, password, name, phone, role, company_name, gstin, license_number, vehicle_type, vehicle_number, document_status, is_verified)
      VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)
    `, [userId, email, hashedPassword, name, phone, role, companyName || null, gstin || null, licenseNumber || null, vehicleType || null, vehicleNumber || null, documentStatus, isVerified]);
    
    await saveDatabase(); 

    const token = jwt.sign({ userId, email, role }, JWT_SECRET, { expiresIn: '7d' });
    
    const user = await getOne('SELECT * FROM users WHERE id = ?', [userId]);
    
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
    
    const user = await getOne('SELECT * FROM users WHERE email = ?', [email]);
    if (!user) {
      res.status(401).json({ success: false, error: 'Invalid email or password' });
      return;
    }
    
    const isMatch = await bcrypt.compare(password, user.password);
    if (!isMatch) {
      res.status(401).json({ success: false, error: 'Invalid email or password' });
      return;
    }
    
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
    const user = await getOne('SELECT * FROM users WHERE id = ?', [req.user!.userId]);
    
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
    const { 
      name, phone, companyName, gstin, address, licenseNumber, insuranceNumber, 
      vehicleType, vehicleNumber, rcNumber, profilePhoto,
      bankAccountNumber, bankIfscCode, bankAccountName, signature
    } = req.body;
    
    const userId = req.user!.userId;
    
    const user = await getOne('SELECT * FROM users WHERE id = ?', [userId]);
    
    if (!user) {
      res.status(404).json({ success: false, error: 'User not found' });
      return;
    }
    
    await runQuery(`
      UPDATE users SET 
        name = ?, phone = ?, company_name = ?, gstin = ?, address = ?, 
        license_number = ?, insurance_number = ?, vehicle_type = ?, vehicle_number = ?, 
        rc_number = ?, profile_photo = ?,
        bank_account_number = ?, bank_ifsc_code = ?, bank_account_name = ?,
        signature = ?
      WHERE id = ?
    `, [
      name !== undefined ? name : user.name,
      phone !== undefined ? phone : user.phone,
      companyName !== undefined ? companyName : user.company_name,
      gstin !== undefined ? gstin : user.gstin,
      address !== undefined ? address : user.address,
      licenseNumber !== undefined ? licenseNumber : user.license_number,
      insuranceNumber !== undefined ? insuranceNumber : user.insurance_number,
      vehicleType !== undefined ? vehicleType : user.vehicle_type,
      vehicleNumber !== undefined ? vehicleNumber : user.vehicle_number,
      rcNumber !== undefined ? rcNumber : user.rc_number,
      profilePhoto !== undefined ? profilePhoto : user.profile_photo,
      bankAccountNumber !== undefined ? bankAccountNumber : user.bank_account_number,
      bankIfscCode !== undefined ? bankIfscCode : user.bank_ifsc_code,
      bankAccountName !== undefined ? bankAccountName : user.bank_account_name,
      signature !== undefined ? signature : user.signature,
      userId
    ]);
    
    await saveDatabase();

    const updatedUser = await getOne('SELECT * FROM users WHERE id = ?', [userId]);
    
    res.json({ success: true, data: formatUser(updatedUser) });
  } catch (error) {
    console.error('Update profile error:', error);
    res.status(500).json({ success: false, error: 'Server error' });
  }
};

export const uploadDocument = async (req: AuthRequest, res: Response): Promise<void> => {
  try {
    const { documentType, documentPhoto } = req.body;
    
    if (!documentType || !documentPhoto) {
        res.status(400).json({ success: false, error: 'Document type and photo are required' });
        return;
    }

    const userId = req.user!.userId;
    
    const user = await getOne('SELECT * FROM users WHERE id = ?', [userId]);
    
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
    
    await runQuery(`UPDATE users SET ${updateField}, document_status = 'pending' WHERE id = ?`, [documentPhoto, userId]);
    
    await saveDatabase();
    
    res.json({ success: true, message: 'Document uploaded successfully' });
  } catch (error) {
    console.error('Upload document error:', error);
    res.status(500).json({ success: false, error: 'Server error' });
  }
};

export const verifyDriver = async (req: AuthRequest, res: Response): Promise<void> => {
  try {
    const { licenseNumber, vehicleNumber } = req.body;
    const userId = req.user!.userId;

    const user = await getOne('SELECT * FROM users WHERE id = ?', [userId]);
    if (!user) {
      res.status(404).json({ success: false, error: 'User not found' });
      return;
    }

    const dlToUse = licenseNumber || user.license_number || 'DL-1420180012345';
    const vehicleToUse = vehicleNumber || user.vehicle_number || 'DL-01-A-1234';

    const holderName = user.name;
    const dateOfIssue = '15-Mar-2018';
    const dateOfExpiry = '14-Mar-2028';
    const licenseClass = 'MCWG, LMV, HGV (Heavy Goods Vehicle)';
    const vehicleClass = 'Goods Carrier (TATA LPT 1613)';
    const insuranceStatus = 'Active (Digit Insurance, Expiry: 12-Dec-2026)';
    const fitnessStatus = 'Active (Expiry: 18-Feb-2027)';

    const isClean = dlToUse.includes('CLEAN') || dlToUse.endsWith('00');
    const challans = isClean ? [] : [
      {
        id: `CH-${Math.floor(1000000 + Math.random() * 9000000)}`,
        date: '10-Apr-2026',
        violation: 'Over-speeding on NH-44 near Ambala',
        amount: 1000,
        status: 'unpaid'
      },
      {
        id: `CH-${Math.floor(1000000 + Math.random() * 9000000)}`,
        date: '02-May-2026',
        violation: 'Overloading Cargo beyond permitted limit',
        amount: 2000,
        status: 'unpaid'
      }
    ];

    const report = {
      licenseNumber: dlToUse,
      holderName,
      dateOfIssue,
      dateOfExpiry,
      licenseClass,
      vahanStatus: {
        vehicleNumber: vehicleToUse,
        vehicleClass,
        ownerName: holderName,
        insuranceStatus,
        fitnessStatus
      },
      challans
    };

    const hasUnpaidChallans = challans.some(c => c.status === 'unpaid');
    const isVerified = hasUnpaidChallans ? 0 : 1;

    await runQuery(`
      UPDATE users 
      SET license_number = ?, vehicle_number = ?, dl_verified = 1, is_verified = ?, verification_report = ?
      WHERE id = ?
    `, [dlToUse, vehicleToUse, isVerified, JSON.stringify(report), userId]);

    await saveDatabase();

    const updatedUser = await getOne('SELECT * FROM users WHERE id = ?', [userId]);

    res.json({ success: true, data: formatUser(updatedUser) });
  } catch (error) {
    console.error('Verify driver error:', error);
    res.status(500).json({ success: false, error: 'Server error' });
  }
};

export const payChallan = async (req: AuthRequest, res: Response): Promise<void> => {
  try {
    const { challanId } = req.body;
    const userId = req.user!.userId;

    const user = await getOne('SELECT * FROM users WHERE id = ?', [userId]);
    if (!user) {
      res.status(404).json({ success: false, error: 'User not found' });
      return;
    }

    if (!user.verification_report) {
      res.status(400).json({ success: false, error: 'No verification report found' });
      return;
    }

    const report = JSON.parse(user.verification_report);
    let found = false;

    if (report.challans && Array.isArray(report.challans)) {
      for (const challan of report.challans) {
        if (challan.id === challanId) {
          challan.status = 'paid';
          found = true;
        }
      }
    }

    if (!found) {
      res.status(404).json({ success: false, error: 'Challan not found' });
      return;
    }

    const hasUnpaidChallans = report.challans.some((c: any) => c.status === 'unpaid');
    const isVerified = hasUnpaidChallans ? 0 : 1;

    await runQuery(`
      UPDATE users 
      SET is_verified = ?, verification_report = ?
      WHERE id = ?
    `, [isVerified, JSON.stringify(report), userId]);

    await saveDatabase();

    const updatedUser = await getOne('SELECT * FROM users WHERE id = ?', [userId]);

    res.json({ success: true, data: formatUser(updatedUser) });
  } catch (error) {
    console.error('Pay challan error:', error);
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
    bankAccountNumber: user.bank_account_number,
    bankIfscCode: user.bank_ifsc_code,
    bankAccountName: user.bank_account_name,
    rating: user.rating,
    totalJobs: user.total_jobs,
    isVerified: Boolean(user.is_verified),
    signature: user.signature,
    dlVerified: Boolean(user.dl_verified),
    verificationReport: user.verification_report,
    createdAt: user.created_at
  };
}

export default { register, login, getMe, updateProfile, uploadDocument, verifyDriver, payChallan };