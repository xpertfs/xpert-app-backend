// src/middleware/auth.ts

import { Request, Response, NextFunction } from 'express';
import jwt from 'jsonwebtoken';
import { JWT_SECRET } from '../config/env';
import prisma from '../config/database';
import { logger } from '../utils/logger';

// Extend Express Request type to include the user
declare global {
  namespace Express {
    interface Request {
      user?: {
        id: string;
        email: string;
        role: string;
        companyId: string;
      };
    }
  }
}

/**
 * Authentication middleware to verify JWT tokens
 */
export const authenticate = async (
  req: Request, 
  res: Response, 
  next: NextFunction
) => {
  try {
    // Get token from Authorization header
    const authHeader = req.headers.authorization;
    
    if (!authHeader || !authHeader.startsWith('Bearer ')) {
      return res.status(401).json({ message: 'Authentication required' });
    }
    
    const token = authHeader.split(' ')[1];
    
    // Verify token
    const decoded = jwt.verify(token, JWT_SECRET) as {
      id: string;
      email: string;
      role: string;
      companyId: string;
    };
    
    // Check if user exists and is active
    const user = await prisma.user.findUnique({
      where: { 
        id: decoded.id,
        active: true
      }
    });
    
    if (!user) {
      return res.status(401).json({ message: 'User not found or inactive' });
    }
    
    // Add user to request object
    req.user = {
      id: decoded.id,
      email: decoded.email,
      role: decoded.role,
      companyId: decoded.companyId || ''
    };
    
    next();
  } catch (error) {
    logger.error('Authentication error:', error);
    
    if (error instanceof jwt.JsonWebTokenError) {
      return res.status(401).json({ message: 'Invalid token' });
    }
    
    if (error instanceof jwt.TokenExpiredError) {
      return res.status(401).json({ message: 'Token expired' });
    }
    
    return res.status(500).json({ message: 'Internal server error' });
  }
};

/**
 * Authorization middleware to check user roles
 */
export const authorize = (roles: string[]) => {
  return (req: Request, res: Response, next: NextFunction) => {
    if (!req.user) {
      return res.status(401).json({ message: 'Authentication required' });
    }
    
    if (!roles.includes(req.user.role)) {
      return res.status(403).json({ message: 'Insufficient permissions' });
    }
    
    next();
  };
};

/**
 * Company access middleware to ensure users can only access their company data
 */
export const checkCompanyAccess = (
  req: Request, 
  res: Response, 
  next: NextFunction
) => {
  const companyId = req.params.companyId || req.body.companyId;
  
  if (!req.user || !req.user.companyId) {
    return res.status(401).json({ message: 'Authentication required' });
  }
  
  // Skip check for ADMIN users who can access all companies
  if (req.user.role === 'ADMIN') {
    return next();
  }
  
  // For other users, ensure they can only access their company data
  if (companyId && companyId !== req.user.companyId) {
    return res.status(403).json({ message: 'Access denied to this company data' });
  }
  
  next();
};