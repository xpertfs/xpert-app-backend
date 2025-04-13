// src/controllers/auth.controller.ts

import { Request, Response } from 'express';
import bcrypt from 'bcrypt';
import jwt from 'jsonwebtoken';
import { PrismaClient } from '@prisma/client';
import { JWT_SECRET, JWT_EXPIRES_IN } from '../config/env';
import { logger } from '../utils/logger';

const prisma = new PrismaClient();

/**
 * User login
 * 
 * @route POST /api/auth/login
 * @access Public
 */
export const login = async (req: Request, res: Response) => {
  try {
    const { email, password } = req.body;

    // Find user by email
    const user = await prisma.user.findUnique({
      where: { email },
      include: { company: true },
    });

    if (!user) {
      return res.status(401).json({ message: 'Invalid credentials' });
    }

    // Check if user is active
    if (!user.active) {
      return res.status(401).json({ message: 'Account is disabled' });
    }

    // Verify password
    const isPasswordValid = await bcrypt.compare(password, user.passwordHash);

    if (!isPasswordValid) {
      return res.status(401).json({ message: 'Invalid credentials' });
    }

    // Generate JWT token
    const token = jwt.sign(
      {
        id: user.id,
        email: user.email,
        role: user.role,
        companyId: user.companyId,
      },
      JWT_SECRET,
      { expiresIn: JWT_EXPIRES_IN }
    );

    // Return user info and token
    return res.status(200).json({
      token,
      user: {
        id: user.id,
        email: user.email,
        firstName: user.firstName,
        lastName: user.lastName,
        role: user.role,
        companyId: user.companyId,
        companyName: user.company?.name || null,
      },
    });
  } catch (error) {
    logger.error('Login error:', error);
    return res.status(500).json({ message: 'Internal server error' });
  }
};

/**
 * User registration (creates both user and company)
 * 
 * @route POST /api/auth/register
 * @access Public
 */
export const register = async (req: Request, res: Response) => {
  try {
    const { email, password, firstName, lastName, companyName, role = 'ADMIN' } = req.body;

    // Check if user already exists
    const existingUser = await prisma.user.findUnique({ where: { email } });
    
    if (existingUser) {
      return res.status(409).json({ message: 'User already exists' });
    }

    // Hash password
    const saltRounds = 10;
    const passwordHash = await bcrypt.hash(password, saltRounds);

    // Create company and user in a transaction
    const result = await prisma.$transaction(async (tx) => {
      // Create company
      const company = await tx.company.create({
        data: {
          name: companyName,
        },
      });

      // Create user
      const user = await tx.user.create({
        data: {
          email,
          passwordHash,
          firstName,
          lastName,
          role,
          companyId: company.id,
        },
        include: {
          company: true,
        },
      });

      return { user, company };
    });

    // Generate JWT token
    const token = jwt.sign(
      {
        id: result.user.id,
        email: result.user.email,
        role: result.user.role,
        companyId: result.company.id,
      },
      JWT_SECRET,
      { expiresIn: JWT_EXPIRES_IN }
    );

    // Return user info and token
    return res.status(201).json({
      token,
      user: {
        id: result.user.id,
        email: result.user.email,
        firstName: result.user.firstName,
        lastName: result.user.lastName,
        role: result.user.role,
        companyId: result.company.id,
        companyName: result.company.name,
      },
    });
  } catch (error) {
    logger.error('Registration error:', error);
    return res.status(500).json({ message: 'Internal server error' });
  }
};

/**
 * Refresh JWT token
 * 
 * @route POST /api/auth/refresh-token
 * @access Public
 */
export const refreshToken = async (req: Request, res: Response) => {
  try {
    const { token } = req.body;

    if (!token) {
      return res.status(400).json({ message: 'Token is required' });
    }

    try {
      // Verify and decode token
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
        },
        include: { company: true },
      });

      if (!user) {
        return res.status(401).json({ message: 'Invalid token' });
      }

      // Generate new token
      const newToken = jwt.sign(
        {
          id: user.id,
          email: user.email,
          role: user.role,
          companyId: user.companyId,
        },
        JWT_SECRET,
        { expiresIn: JWT_EXPIRES_IN }
      );

      return res.status(200).json({
        token: newToken,
        user: {
          id: user.id,
          email: user.email,
          firstName: user.firstName,
          lastName: user.lastName,
          role: user.role,
          companyId: user.companyId,
          companyName: user.company?.name || null,
        },
      });
    } catch (error) {
      return res.status(401).json({ message: 'Invalid token' });
    }
  } catch (error) {
    logger.error('Token refresh error:', error);
    return res.status(500).json({ message: 'Internal server error' });
  }
};

/**
 * Request password reset
 * 
 * @route POST /api/auth/forgot-password
 * @access Public
 */
export const forgotPassword = async (req: Request, res: Response) => {
  try {
    const { email } = req.body;

    // Check if user exists
    const user = await prisma.user.findUnique({ where: { email } });
    
    if (!user) {
      // Don't reveal if user exists or not for security
      return res.status(200).json({ message: 'If your email is registered, you will receive a password reset link' });
    }

    // Generate password reset token (valid for 1 hour)
    const resetToken = jwt.sign(
      { id: user.id, email: user.email },
      JWT_SECRET,
      { expiresIn: '1h' }
    );

    // In a real application, send email with reset link
    // For now, just return the token
    logger.info(`Password reset token for ${email}: ${resetToken}`);

    return res.status(200).json({ 
      message: 'If your email is registered, you will receive a password reset link',
      // In development mode, return token for testing
      ...(process.env.NODE_ENV !== 'production' && { token: resetToken }),
    });
  } catch (error) {
    logger.error('Forgot password error:', error);
    return res.status(500).json({ message: 'Internal server error' });
  }
};

/**
 * Reset password using token
 * 
 * @route POST /api/auth/reset-password
 * @access Public
 */
export const resetPassword = async (req: Request, res: Response) => {
  try {
    const { token, password } = req.body;

    try {
      // Verify token
      const decoded = jwt.verify(token, JWT_SECRET) as {
        id: string;
        email: string;
      };

      // Hash new password
      const saltRounds = 10;
      const passwordHash = await bcrypt.hash(password, saltRounds);

      // Update user's password
      await prisma.user.update({
        where: { id: decoded.id },
        data: { passwordHash },
      });

      return res.status(200).json({ message: 'Password reset successful' });
    } catch (error) {
      return res.status(401).json({ message: 'Invalid or expired token' });
    }
  } catch (error) {
    logger.error('Reset password error:', error);
    return res.status(500).json({ message: 'Internal server error' });
  }
};