import { Request, Response, NextFunction } from 'express';
import jwt from 'jsonwebtoken';
// FIX: Import from index.ts in src folder
import { JwtPayload } from '../index.js'; 

const JWT_SECRET = process.env.JWT_SECRET || 'beebuzz-secret-key-2024';

export interface AuthRequest extends Request {
  user?: JwtPayload;
}

export const authenticate = (req: AuthRequest, res: Response, next: NextFunction): void => {
  try {
    const authHeader = req.headers.authorization;
    
    if (!authHeader || !authHeader.startsWith('Bearer ')) {
      res.status(401).json({ success: false, error: 'Access denied. No token provided.' });
      return;
    }

    const token = authHeader.split(' ')[1];
    const decoded = jwt.verify(token, JWT_SECRET) as JwtPayload;
    
    req.user = decoded;
    
    next();
  } catch (error) {
    res.status(401).json({ success: false, error: 'Invalid or expired token' });
  }
};

export const authorize = (...allowedRoles: string[]) => {
  return (req: AuthRequest, res: Response, next: NextFunction): void => {
    if (!req.user) {
      res.status(401).json({ success: false, error: 'Not authenticated' });
      return;
    }

    if (!allowedRoles.includes(req.user.role)) {
      res.status(403).json({ success: false, error: 'Access denied. Insufficient permissions.' });
      return;
    }

    next();
  };
};
