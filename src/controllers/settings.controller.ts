// src/controllers/settings.controller.ts
import { Request, Response } from 'express';
import { PrismaClient } from '@prisma/client';
import bcrypt from 'bcrypt';
import { logger } from '../utils/logger';

const prisma = new PrismaClient();

/**
 * Get company settings
 * 
 * @route GET /api/settings/company
 * @access Private
 */
export const getCompanySettings = async (req: Request, res: Response) => {
  try {
    const companyId = req.user?.companyId;

    if (!companyId) {
      return res.status(400).json({ message: 'Company ID is required' });
    }

    const company = await prisma.company.findUnique({
      where: { id: companyId },
    });

    if (!company) {
      return res.status(404).json({ message: 'Company not found' });
    }

    return res.status(200).json(company);
  } catch (error) {
    logger.error('Error getting company settings:', error);
    return res.status(500).json({ message: 'Failed to get company settings' });
  }
};

/**
 * Update company settings
 * 
 * @route PUT /api/settings/company
 * @access Private
 */
export const updateCompanySettings = async (req: Request, res: Response) => {
  try {
    const companyId = req.user?.companyId;
    const { name, address, city, state, zip, phone, email, logo } = req.body;

    if (!companyId) {
      return res.status(400).json({ message: 'Company ID is required' });
    }

    // Check if company exists
    const existingCompany = await prisma.company.findUnique({
      where: { id: companyId },
    });

    if (!existingCompany) {
      return res.status(404).json({ message: 'Company not found' });
    }

    // Update company
    const company = await prisma.company.update({
      where: { id: companyId },
      data: {
        name,
        address,
        city,
        state,
        zip,
        phone,
        email,
        logo,
      },
    });

    return res.status(200).json(company);
  } catch (error) {
    logger.error('Error updating company settings:', error);
    return res.status(500).json({ message: 'Failed to update company settings' });
  }
};

/**
 * Get users for the current company
 * 
 * @route GET /api/settings/users
 * @access Private (Admin only)
 */
export const getUsers = async (req: Request, res: Response) => {
  try {
    const companyId = req.user?.companyId;

    if (!companyId) {
      return res.status(400).json({ message: 'Company ID is required' });
    }

    const users = await prisma.user.findMany({
      where: { companyId },
      select: {
        id: true,
        email: true,
        firstName: true,
        lastName: true,
        role: true,
        active: true,
        createdAt: true,
      },
    });

    return res.status(200).json(users);
  } catch (error) {
    logger.error('Error getting users:', error);
    return res.status(500).json({ message: 'Failed to get users' });
  }
};

/**
 * Create a user
 * 
 * @route POST /api/settings/users
 * @access Private (Admin only)
 */
export const createUser = async (req: Request, res: Response) => {
  try {
    const companyId = req.user?.companyId;
    const { email, password, firstName, lastName, role } = req.body;

    if (!companyId) {
      return res.status(400).json({ message: 'Company ID is required' });
    }

    // Check if user already exists
    const existingUser = await prisma.user.findUnique({
      where: { email },
    });

    if (existingUser) {
      return res.status(409).json({ message: 'User already exists' });
    }

    // Hash password
    const saltRounds = 10;
    const passwordHash = await bcrypt.hash(password, saltRounds);

    // Create user
    const user = await prisma.user.create({
      data: {
        email,
        passwordHash,
        firstName,
        lastName,
        role,
        companyId,
      },
      select: {
        id: true,
        email: true,
        firstName: true,
        lastName: true,
        role: true,
        active: true,
        createdAt: true,
      },
    });

    return res.status(201).json(user);
  } catch (error) {
    logger.error('Error creating user:', error);
    return res.status(500).json({ message: 'Failed to create user' });
  }
};

/**
 * Update a user
 * 
 * @route PUT /api/settings/users/:id
 * @access Private (Admin only)
 */
export const updateUser = async (req: Request, res: Response) => {
  try {
    const { id } = req.params;
    const companyId = req.user?.companyId;
    const { firstName, lastName, email, role, active } = req.body;

    if (!companyId) {
      return res.status(400).json({ message: 'Company ID is required' });
    }

    // Check if user exists and belongs to the company
    const existingUser = await prisma.user.findFirst({
      where: {
        id,
        companyId,
      },
    });

    if (!existingUser) {
      return res.status(404).json({ message: 'User not found' });
    }

    // Check if email is being changed and already exists
    if (email && email !== existingUser.email) {
      const userWithEmail = await prisma.user.findUnique({
        where: { email },
      });

      if (userWithEmail) {
        return res.status(409).json({ message: 'Email already in use' });
      }
    }

    // Update user
    const user = await prisma.user.update({
      where: { id },
      data: {
        firstName,
        lastName,
        email,
        role,
        active,
      },
      select: {
        id: true,
        email: true,
        firstName: true,
        lastName: true,
        role: true,
        active: true,
        updatedAt: true,
      },
    });

    return res.status(200).json(user);
  } catch (error) {
    logger.error(`Error updating user ${req.params.id}:`, error);
    return res.status(500).json({ message: 'Failed to update user' });
  }
};

/**
 * Delete a user
 * 
 * @route DELETE /api/settings/users/:id
 * @access Private (Admin only)
 */
export const deleteUser = async (req: Request, res: Response) => {
  try {
    const { id } = req.params;
    const companyId = req.user?.companyId;
    const requestingUserId = req.user?.id;

    if (!companyId) {
      return res.status(400).json({ message: 'Company ID is required' });
    }

    // Prevent self-deletion
    if (id === requestingUserId) {
      return res.status(400).json({ message: 'Cannot delete your own account' });
    }

    // Check if user exists and belongs to the company
    const existingUser = await prisma.user.findFirst({
      where: {
        id,
        companyId,
      },
    });

    if (!existingUser) {
      return res.status(404).json({ message: 'User not found' });
    }

    // Delete user
    await prisma.user.delete({
      where: { id },
    });

    return res.status(200).json({ message: 'User deleted successfully' });
  } catch (error) {
    logger.error(`Error deleting user ${req.params.id}:`, error);
    return res.status(500).json({ message: 'Failed to delete user' });
  }
};

/**
 * Update user password
 * 
 * @route PUT /api/settings/users/:id/password
 * @access Private (Admin only)
 */
export const updateUserPassword = async (req: Request, res: Response) => {
  try {
    const { id } = req.params;
    const companyId = req.user?.companyId;
    const { password } = req.body;

    if (!companyId) {
      return res.status(400).json({ message: 'Company ID is required' });
    }

    // Check if user exists and belongs to the company
    const existingUser = await prisma.user.findFirst({
      where: {
        id,
        companyId,
      },
    });

    if (!existingUser) {
      return res.status(404).json({ message: 'User not found' });
    }

    // Hash new password
    const saltRounds = 10;
    const passwordHash = await bcrypt.hash(password, saltRounds);

    // Update password
    await prisma.user.update({
      where: { id },
      data: {
        passwordHash,
      },
    });

    return res.status(200).json({ message: 'Password updated successfully' });
  } catch (error) {
    logger.error(`Error updating password for user ${req.params.id}:`, error);
    return res.status(500).json({ message: 'Failed to update password' });
  }
};