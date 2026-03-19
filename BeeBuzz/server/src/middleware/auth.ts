import { Response, NextFunction } from 'express';
import jwt from 'jsonwebtoken';
import { JwtPayload } from '../types/index.js';

const JWT_SECRET = process.env.JWT_SECRET || 'beebuzz-secret-key-2024';

export interface AuthRequest extends Request {
  user?: JwtPayload;
}

export const authenticate = (req: any, res: Response, next: NextFunction) => {
  const authHeader = req.headers.authorization;
  
  if (!authHeader || !authHeader.startsWith('Bearer ')) {
    return res.status(401).json({ success: false, error: 'Authentication required' });
  }
  
  const token = authHeader.split(' ')[1];
  
  try {
    const decoded = jwt.verify(token, JWT_SECRET) as JwtPayload;
    req.user = decoded;
    next();
  } catch (error) {
    return res.status(401).json({ success: false, error: 'Invalid or expired token' });
  }
};

export const authorize = (...roles: string[]) => {
  return (req: any, res: Response, next: NextFunction) => {
    if (!req.user) {
      return res.status(401).json({ success: false, error: 'Authentication required' });
    }
    
    if (!roles.includes(req.user.role)) {
      return res.status(403).json({ success: false, error: 'Access denied' });
    }
    
    next();
  };
};

export default { authenticate, authorize };
