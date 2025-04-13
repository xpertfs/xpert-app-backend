// src/controllers/contractor.controller.ts
import { Request, Response } from 'express';
import { PrismaClient } from '@prisma/client';
import { logger } from '../utils/logger';

const prisma = new PrismaClient();

/**
 * Get all contractors for the current company
 * 
 * @route GET /api/contractors
 * @access Private
 */
export const getContractors = async (req: Request, res: Response) => {
  try {
    const { search, sortBy = 'name', sortOrder = 'asc' } = req.query;
    const companyId = req.user?.companyId;

    if (!companyId) {
      return res.status(400).json({ message: 'Company ID is required' });
    }

    // Build filter conditions
    const where: any = {
      companyId,
      ...(search
        ? {
            OR: [
              { name: { contains: search as string, mode: 'insensitive' } },
              { code: { contains: search as string, mode: 'insensitive' } },
              { contactName: { contains: search as string, mode: 'insensitive' } },
            ],
          }
        : {}),
    };

    // Get contractors
    const contractors = await prisma.contractor.findMany({
      where,
      orderBy: {
        [sortBy as string]: sortOrder,
      },
    });

    return res.status(200).json(contractors);
  } catch (error) {
    logger.error('Error getting contractors:', error);
    return res.status(500).json({ message: 'Failed to get contractors' });
  }
};

/**
 * Get contractor by ID
 * 
 * @route GET /api/contractors/:id
 * @access Private
 */
export const getContractorById = async (req: Request, res: Response) => {
  try {
    const { id } = req.params;
    const companyId = req.user?.companyId;

    if (!companyId) {
      return res.status(400).json({ message: 'Company ID is required' });
    }

    // Get contractor with project count
    const contractor = await prisma.contractor.findUnique({
      where: {
        id,
        companyId,
      },
      include: {
        _count: {
          select: {
            projects: true,
          },
        },
      },
    });

    if (!contractor) {
      return res.status(404).json({ message: 'Contractor not found' });
    }

    return res.status(200).json(contractor);
  } catch (error) {
    logger.error(`Error getting contractor ${req.params.id}:`, error);
    return res.status(500).json({ message: 'Failed to get contractor' });
  }
};

/**
 * Create a new contractor
 * 
 * @route POST /api/contractors
 * @access Private
 */
export const createContractor = async (req: Request, res: Response) => {
  try {
    const {
      name,
      code,
      address,
      city,
      state,
      zip,
      phone,
      email,
      contactName,
    } = req.body;
    const companyId = req.user?.companyId;

    if (!companyId) {
      return res.status(400).json({ message: 'Company ID is required' });
    }

    // Check if contractor code already exists for this company
    const existingContractor = await prisma.contractor.findUnique({
      where: {
        companyId_code: {
          companyId,
          code,
        },
      },
    });

    if (existingContractor) {
      return res.status(409).json({ message: 'Contractor code already exists' });
    }

    // Create contractor
    const contractor = await prisma.contractor.create({
      data: {
        name,
        code,
        address,
        city,
        state,
        zip,
        phone,
        email,
        contactName,
        companyId,
      },
    });

    return res.status(201).json(contractor);
  } catch (error) {
    logger.error('Error creating contractor:', error);
    return res.status(500).json({ message: 'Failed to create contractor' });
  }
};

/**
 * Update a contractor
 * 
 * @route PUT /api/contractors/:id
 * @access Private
 */
export const updateContractor = async (req: Request, res: Response) => {
  try {
    const { id } = req.params;
    const {
      name,
      address,
      city,
      state,
      zip,
      phone,
      email,
      contactName,
    } = req.body;
    const companyId = req.user?.companyId;

    if (!companyId) {
      return res.status(400).json({ message: 'Company ID is required' });
    }

    // Check if contractor exists
    const existingContractor = await prisma.contractor.findUnique({
      where: {
        id,
        companyId,
      },
    });

    if (!existingContractor) {
      return res.status(404).json({ message: 'Contractor not found' });
    }

    // Update contractor
    const contractor = await prisma.contractor.update({
      where: {
        id,
      },
      data: {
        name,
        address,
        city,
        state,
        zip,
        phone,
        email,
        contactName,
      },
    });

    return res.status(200).json(contractor);
  } catch (error) {
    logger.error(`Error updating contractor ${req.params.id}:`, error);
    return res.status(500).json({ message: 'Failed to update contractor' });
  }
};

/**
 * Delete a contractor
 * 
 * @route DELETE /api/contractors/:id
 * @access Private
 */
export const deleteContractor = async (req: Request, res: Response) => {
  try {
    const { id } = req.params;
    const companyId = req.user?.companyId;

    if (!companyId) {
      return res.status(400).json({ message: 'Company ID is required' });
    }

    // Check if contractor exists
    const existingContractor = await prisma.contractor.findUnique({
      where: {
        id,
        companyId,
      },
    });

    if (!existingContractor) {
      return res.status(404).json({ message: 'Contractor not found' });
    }

    // Check if contractor has related projects
    const projectCount = await prisma.project.count({
      where: {
        contractorId: id,
      },
    });

    if (projectCount > 0) {
      return res.status(400).json({
        message: 'Cannot delete contractor with related projects',
        projectCount,
      });
    }

    // Delete contractor
    await prisma.contractor.delete({
      where: {
        id,
      },
    });

    return res.status(200).json({ message: 'Contractor deleted successfully' });
  } catch (error) {
    logger.error(`Error deleting contractor ${req.params.id}:`, error);
    return res.status(500).json({ message: 'Failed to delete contractor' });
  }
};