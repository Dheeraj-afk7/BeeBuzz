"use strict";
var __importDefault = (this && this.__importDefault) || function (mod) {
    return (mod && mod.__esModule) ? mod : { "default": mod };
};
Object.defineProperty(exports, "__esModule", { value: true });
exports.uploadDocument = exports.updateProfile = exports.getMe = exports.login = exports.register = void 0;
const bcryptjs_1 = __importDefault(require("bcryptjs"));
const jsonwebtoken_1 = __importDefault(require("jsonwebtoken"));
const uuid_1 = require("uuid");
const database_js_1 = require("../services/database.js");
const JWT_SECRET = process.env.JWT_SECRET || 'beebuzz-secret-key-2024';
const register = async (req, res) => {
    try {
        const { email, password, name, phone, role, companyName, gstin, licenseNumber, vehicleType, vehicleNumber } = req.body;
        if (!email || !password || !name || !phone || !role) {
            res.status(400).json({ success: false, error: 'All fields are required' });
            return;
        }
        const existingUser = await (0, database_js_1.getOne)('SELECT id FROM users WHERE email = ?', [email]);
        if (existingUser) {
            res.status(400).json({ success: false, error: 'Email already registered' });
            return;
        }
        const hashedPassword = await bcryptjs_1.default.hash(password, 10);
        const userId = (0, uuid_1.v4)();
        let documentStatus = 'pending';
        let isVerified = 0;
        if (role === 'driver') {
            documentStatus = 'pending';
        }
        await (0, database_js_1.runQuery)(`
      INSERT INTO users (id, email, password, name, phone, role, company_name, gstin, license_number, vehicle_type, vehicle_number, document_status, is_verified)
      VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)
    `, [userId, email, hashedPassword, name, phone, role, companyName || null, gstin || null, licenseNumber || null, vehicleType || null, vehicleNumber || null, documentStatus, isVerified]);
        await (0, database_js_1.saveDatabase)();
        const token = jsonwebtoken_1.default.sign({ userId, email, role }, JWT_SECRET, { expiresIn: '7d' });
        const user = await (0, database_js_1.getOne)('SELECT * FROM users WHERE id = ?', [userId]);
        res.status(201).json({
            success: true,
            data: {
                token,
                user: formatUser(user)
            }
        });
    }
    catch (error) {
        console.error('Register error:', error);
        res.status(500).json({ success: false, error: 'Server error during registration' });
    }
};
exports.register = register;
const login = async (req, res) => {
    try {
        const { email, password } = req.body;
        if (!email || !password) {
            res.status(400).json({ success: false, error: 'Email and password required' });
            return;
        }
        const user = await (0, database_js_1.getOne)('SELECT * FROM users WHERE email = ?', [email]);
        if (!user) {
            res.status(401).json({ success: false, error: 'Invalid email or password' });
            return;
        }
        const isMatch = await bcryptjs_1.default.compare(password, user.password);
        if (!isMatch) {
            res.status(401).json({ success: false, error: 'Invalid email or password' });
            return;
        }
        const token = jsonwebtoken_1.default.sign({ userId: user.id, email: user.email, role: user.role }, JWT_SECRET, { expiresIn: '7d' });
        res.json({
            success: true,
            data: {
                token,
                user: formatUser(user)
            }
        });
    }
    catch (error) {
        console.error('Login error:', error);
        res.status(500).json({ success: false, error: 'Server error during login' });
    }
};
exports.login = login;
const getMe = async (req, res) => {
    try {
        const user = await (0, database_js_1.getOne)('SELECT * FROM users WHERE id = ?', [req.user.userId]);
        if (!user) {
            res.status(404).json({ success: false, error: 'User not found' });
            return;
        }
        res.json({ success: true, data: formatUser(user) });
    }
    catch (error) {
        console.error('Get me error:', error);
        res.status(500).json({ success: false, error: 'Server error' });
    }
};
exports.getMe = getMe;
const updateProfile = async (req, res) => {
    try {
        const { name, phone, companyName, gstin, address, licenseNumber, insuranceNumber, vehicleType, vehicleNumber, rcNumber, profilePhoto } = req.body;
        const userId = req.user.userId;
        const user = await (0, database_js_1.getOne)('SELECT * FROM users WHERE id = ?', [userId]);
        if (!user) {
            res.status(404).json({ success: false, error: 'User not found' });
            return;
        }
        await (0, database_js_1.runQuery)(`
      UPDATE users SET 
        name = ?, phone = ?, company_name = ?, gstin = ?, address = ?, 
        license_number = ?, insurance_number = ?, vehicle_type = ?, vehicle_number = ?, 
        rc_number = ?, profile_photo = ?
      WHERE id = ?
    `, [
            name || null, phone || null, companyName || null, gstin || null, address || null,
            licenseNumber || null, insuranceNumber || null, vehicleType || null, vehicleNumber || null,
            rcNumber || null, profilePhoto || null, userId
        ]);
        await (0, database_js_1.saveDatabase)();
        const updatedUser = await (0, database_js_1.getOne)('SELECT * FROM users WHERE id = ?', [userId]);
        res.json({ success: true, data: formatUser(updatedUser) });
    }
    catch (error) {
        console.error('Update profile error:', error);
        res.status(500).json({ success: false, error: 'Server error' });
    }
};
exports.updateProfile = updateProfile;
const uploadDocument = async (req, res) => {
    try {
        const { documentType, documentPhoto } = req.body;
        if (!documentType || !documentPhoto) {
            res.status(400).json({ success: false, error: 'Document type and photo are required' });
            return;
        }
        const userId = req.user.userId;
        const user = await (0, database_js_1.getOne)('SELECT * FROM users WHERE id = ?', [userId]);
        if (!user) {
            res.status(404).json({ success: false, error: 'User not found' });
            return;
        }
        let updateField = '';
        switch (documentType) {
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
        await (0, database_js_1.runQuery)(`UPDATE users SET ${updateField}, document_status = 'pending' WHERE id = ?`, [documentPhoto, userId]);
        await (0, database_js_1.saveDatabase)();
        res.json({ success: true, message: 'Document uploaded successfully' });
    }
    catch (error) {
        console.error('Upload document error:', error);
        res.status(500).json({ success: false, error: 'Server error' });
    }
};
exports.uploadDocument = uploadDocument;
function formatUser(user) {
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
exports.default = { register: exports.register, login: exports.login, getMe: exports.getMe, updateProfile: exports.updateProfile, uploadDocument: exports.uploadDocument };
