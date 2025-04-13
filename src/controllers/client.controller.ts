// src/controllers/client.controller.ts
import { Request, Response } from 'express';
import { PrismaClient } from '@prisma/client';
import { logger } from '../utils/logger';

const prisma = new PrismaClient();

/**
 * Get all clients for the current company
 * 
 * @route GET /api/clients
 * @access Private
 */
export const getClients = async (req: Request, res: Response) => {
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

    // Get clients
    const clients = await prisma.client.findMany({
      where,
      orderBy: {
        [sortBy as string]: sortOrder,
      },
    });

    return res.status(200).json(clients);
  } catch (error) {
    logger.error('Error getting clients:', error);
    return res.status(500).json({ message: 'Failed to get clients' });
  }
};

/**
 * Get client by ID
 * 
 * @route GET /api/clients/:id
 * @access Private
 */
export const getClientById = async (req: Request, res: Response) => {
  try {
    const { id } = req.params;
    const companyId = req.user?.companyId;

    if (!companyId) {
      return res.status(400).json({ message: 'Company ID is required' });
    }

    // Get client with project count
    const client = await prisma.client.findUnique({
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

    if (!client) {
      return res.status(404).json({ message: 'Client not found' });
    }

    return res.status(200).json(client);
  } catch (error) {
    logger.error(`Error getting client ${req.params.id}:`, error);
    return res.status(500).json({ message: 'Failed to get client' });
  }
};

/**
 * Create a new client
 * 
 * @route POST /api/clients
 * @access Private
 */
export const createClient = async (req: Request, res: Response) => {
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

    // Check if client code already exists for this company
    const existingClient = await prisma.client.findUnique({
      where: {
        companyId_code: {
          companyId,
          code,
        },
      },
    });

    if (existingClient) {
      return res.status(409).json({ message: 'Client code already exists' });
    }

    // Create client
    const client = await prisma.client.create({
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

    return res.status(201).json(client);
  } catch (error) {
    logger.error('Error creating client:', error);
    return res.status(500).json({ message: 'Failed to create client' });
  }
};

/**
 * Update a client
 * 
 * @route PUT /api/clients/:id
 * @access Private
 */
export const updateClient = async (req: Request, res: Response) => {
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

    // Check if client exists
    const existingClient = await prisma.client.findUnique({
      where: {
        id,
        companyId,
      },
    });

    if (!existingClient) {
      return res.status(404).json({ message: 'Client not found' });
    }

    // Update client
    const client = await prisma.client.update({
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

    return res.status(200).json(client);
  } catch (error) {
    logger.error(`Error updating client ${req.params.id}:`, error);
    return res.status(500).json({ message: 'Failed to update client' });
  }
};

/**
 * Delete a client
 * 
 * @route DELETE /api/clients/:id
 * @access Private
 */
export const deleteClient = async (req: Request, res: Response) => {
  try {
    const { id } = req.params;
    const companyId = req.user?.companyId;

    if (!companyId) {
      return res.status(400).json({ message: 'Company ID is required' });
    }

    // Check if client exists
    const existingClient = await prisma.client.findUnique({
      where: {
        id,
        companyId,
      },
    });

    if (!existingClient) {
      return res.status(404).json({ message: 'Client not found' });
    }

    // Check if client has related projects
    const projectCount = await prisma.project.count({
      where: {
        clientId: id,
      },
    });

    if (projectCount > 0) {
      return res.status(400).json({
        message: 'Cannot delete client with related projects',
        projectCount,
      });
    }

    // Delete client
    await prisma.client.delete({
      where: {
        id,
      },
    });

    return res.status(200).json({ message: 'Client deleted successfully' });
  } catch (error) {
    logger.error(`Error deleting client ${req.params.id}:`, error);
    return res.status(500).json({ message: 'Failed to delete client' });
  }
};