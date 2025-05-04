// src/controllers/material.controller.ts
import { Request, Response } from 'express';
import { PrismaClient } from '@prisma/client';
import { logger } from '../utils/logger';

const prisma = new PrismaClient();

/**
 * Get all materials for the current company
 * 
 * @route GET /api/materials
 * @access Private
 */
export const getMaterials = async (req: Request, res: Response) => {
  try {
    const { search, category, sortBy = 'name', sortOrder = 'asc' } = req.query;
    const companyId = req.user?.companyId;

    if (!companyId) {
      return res.status(400).json({ message: 'Company ID is required' });
    }

    // Build filter conditions
    const where: any = {
      companyId,
      ...(category ? { category: category as string } : {}),
      ...(search
        ? {
            OR: [
              { name: { contains: search as string, mode: 'insensitive' } },
              { code: { contains: search as string, mode: 'insensitive' } },
              { description: { contains: search as string, mode: 'insensitive' } },
            ],
          }
        : {}),
    };

    // Get materials
    const materials = await prisma.material.findMany({
      where,
      orderBy: {
        [sortBy as string]: sortOrder,
      },
    });

    return res.status(200).json(materials);
  } catch (error) {
    logger.error('Error getting materials:', error);
    return res.status(500).json({ message: 'Failed to get materials' });
  }
};

/**
 * Get material by ID
 * 
 * @route GET /api/materials/:id
 * @access Private
 */
export const getMaterialById = async (req: Request, res: Response) => {
  try {
    const { id } = req.params;
    const companyId = req.user?.companyId;

    if (!companyId) {
      return res.status(400).json({ message: 'Company ID is required' });
    }

    // Get material with vendor prices
    const material = await prisma.material.findUnique({
      where: {
        id,
        companyId,
      },
      include: {
        vendorPrices: {
          include: {
            vendor: true,
          },
          orderBy: {
            effectiveDate: 'desc',
          },
        },
      },
    });

    if (!material) {
      return res.status(404).json({ message: 'Material not found' });
    }

    return res.status(200).json(material);
  } catch (error) {
    logger.error(`Error getting material ${req.params.id}:`, error);
    return res.status(500).json({ message: 'Failed to get material' });
  }
};

/**
 * Create a new material
 * 
 * @route POST /api/materials
 * @access Private
 */
export const createMaterial = async (req: Request, res: Response) => {
  try {
    const { code, name, description, unit, category } = req.body;
    const companyId = req.user?.companyId;

    if (!companyId) {
      return res.status(400).json({ message: 'Company ID is required' });
    }

    // Check if material code already exists for this company
    const existingMaterial = await prisma.material.findUnique({
      where: {
        companyId_code: {
          companyId,
          code,
        },
      },
    });

    if (existingMaterial) {
      return res.status(409).json({ message: 'Material code already exists' });
    }

    // Create material
    const material = await prisma.material.create({
      data: {
        code,
        name,
        description,
        unit,
        category,
        companyId,
      },
    });

    return res.status(201).json(material);
  } catch (error) {
    logger.error('Error creating material:', error);
    return res.status(500).json({ message: 'Failed to create material' });
  }
};

/**
 * Update a material
 * 
 * @route PUT /api/materials/:id
 * @access Private
 */
export const updateMaterial = async (req: Request, res: Response) => {
  try {
    const { id } = req.params;
    const { name, description, unit, category } = req.body;
    const companyId = req.user?.companyId;

    if (!companyId) {
      return res.status(400).json({ message: 'Company ID is required' });
    }

    // Check if material exists
    const existingMaterial = await prisma.material.findUnique({
      where: {
        id,
        companyId,
      },
    });

    if (!existingMaterial) {
      return res.status(404).json({ message: 'Material not found' });
    }

    // Update material
    const material = await prisma.material.update({
      where: {
        id,
      },
      data: {
        name,
        description,
        unit,
        category,
      },
    });

    return res.status(200).json(material);
  } catch (error) {
    logger.error(`Error updating material ${req.params.id}:`, error);
    return res.status(500).json({ message: 'Failed to update material' });
  }
};

/**
 * Delete a material
 * 
 * @route DELETE /api/materials/:id
 * @access Private
 */
export const deleteMaterial = async (req: Request, res: Response) => {
  try {
    const { id } = req.params;
    const companyId = req.user?.companyId;

    if (!companyId) {
      return res.status(400).json({ message: 'Company ID is required' });
    }

    // Check if material exists
    const existingMaterial = await prisma.material.findUnique({
      where: {
        id,
        companyId,
      },
    });

    if (!existingMaterial) {
      return res.status(404).json({ message: 'Material not found' });
    }

    // Check if material has related vendor prices
    const vendorPriceCount = await prisma.vendorPrice.count({
      where: {
        materialId: id,
      },
    });

    if (vendorPriceCount > 0) {
      // Delete associated vendor prices first (will cascade)
      await prisma.vendorPrice.deleteMany({
        where: {
          materialId: id,
        },
      });
    }

    // Delete material
    await prisma.material.delete({
      where: {
        id,
      },
    });

    return res.status(200).json({ message: 'Material deleted successfully' });
  } catch (error) {
    logger.error(`Error deleting material ${req.params.id}:`, error);
    return res.status(500).json({ message: 'Failed to delete material' });
  }
};

/**
 * Get all vendors for the current company
 * 
 * @route GET /api/materials/vendors
 * @access Private
 */
export const getVendors = async (req: Request, res: Response) => {
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

    // Get vendors
    const vendors = await prisma.vendor.findMany({
      where,
      orderBy: {
        [sortBy as string]: sortOrder,
      },
    });

    return res.status(200).json(vendors);
  } catch (error) {
    logger.error('Error getting vendors:', error);
    return res.status(500).json({ message: 'Failed to get vendors' });
  }
};

/**
 * Get vendor by ID
 * 
 * @route GET /api/materials/vendors/:id
 * @access Private
 */
export const getVendorById = async (req: Request, res: Response) => {
  try {
    const { id } = req.params;
    const companyId = req.user?.companyId;

    if (!companyId) {
      return res.status(400).json({ message: 'Company ID is required' });
    }

    // Get vendor
    const vendor = await prisma.vendor.findUnique({
      where: {
        id,
        companyId,
      },
      include: {
        vendorPrices: {
          include: {
            material: true,
          },
          orderBy: {
            effectiveDate: 'desc',
          },
        },
      },
    });

    if (!vendor) {
      return res.status(404).json({ message: 'Vendor not found' });
    }

    return res.status(200).json(vendor);
  } catch (error) {
    logger.error(`Error getting vendor ${req.params.id}:`, error);
    return res.status(500).json({ message: 'Failed to get vendor' });
  }
};

/**
 * Create a new vendor
 * 
 * @route POST /api/materials/vendors
 * @access Private
 */
export const createVendor = async (req: Request, res: Response) => {
  try {
    const { code, name, address, city, state, zip, phone, email, contactName } = req.body;
    const companyId = req.user?.companyId;

    if (!companyId) {
      return res.status(400).json({ message: 'Company ID is required' });
    }

    // Check if vendor code already exists for this company
    const existingVendor = await prisma.vendor.findUnique({
      where: {
        companyId_code: {
          companyId,
          code,
        },
      },
    });

    if (existingVendor) {
      return res.status(409).json({ message: 'Vendor code already exists' });
    }

    // Create vendor
    const vendor = await prisma.vendor.create({
      data: {
        code,
        name,
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

    return res.status(201).json(vendor);
  } catch (error) {
    logger.error('Error creating vendor:', error);
    return res.status(500).json({ message: 'Failed to create vendor' });
  }
};

/**
 * Update a vendor
 * 
 * @route PUT /api/materials/vendors/:id
 * @access Private
 */
export const updateVendor = async (req: Request, res: Response) => {
  try {
    const { id } = req.params;
    const { name, address, city, state, zip, phone, email, contactName } = req.body;
    const companyId = req.user?.companyId;

    if (!companyId) {
      return res.status(400).json({ message: 'Company ID is required' });
    }

    // Check if vendor exists
    const existingVendor = await prisma.vendor.findUnique({
      where: {
        id,
        companyId,
      },
    });

    if (!existingVendor) {
      return res.status(404).json({ message: 'Vendor not found' });
    }

    // Update vendor
    const vendor = await prisma.vendor.update({
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

    return res.status(200).json(vendor);
  } catch (error) {
    logger.error(`Error updating vendor ${req.params.id}:`, error);
    return res.status(500).json({ message: 'Failed to update vendor' });
  }
};

/**
 * Delete a vendor
 * 
 * @route DELETE /api/materials/vendors/:id
 * @access Private
 */
export const deleteVendor = async (req: Request, res: Response) => {
  try {
    const { id } = req.params;
    const companyId = req.user?.companyId;

    if (!companyId) {
      return res.status(400).json({ message: 'Company ID is required' });
    }

    // Check if vendor exists
    const existingVendor = await prisma.vendor.findUnique({
      where: {
        id,
        companyId,
      },
    });

    if (!existingVendor) {
      return res.status(404).json({ message: 'Vendor not found' });
    }

    // Check if vendor has related vendor prices or expenses
    const vendorPriceCount = await prisma.vendorPrice.count({
      where: {
        vendorId: id,
      },
    });

    const expenseCount = await prisma.expense.count({
      where: {
        vendorId: id,
      },
    });

    if (vendorPriceCount > 0 || expenseCount > 0) {
      return res.status(400).json({
        message: 'Cannot delete vendor with related records',
        vendorPriceCount,
        expenseCount,
      });
    }

    // Delete vendor
    await prisma.vendor.delete({
      where: {
        id,
      },
    });

    return res.status(200).json({ message: 'Vendor deleted successfully' });
  } catch (error) {
    logger.error(`Error deleting vendor ${req.params.id}:`, error);
    return res.status(500).json({ message: 'Failed to delete vendor' });
  }
};

/**
 * Get vendor prices for a material
 * 
 * @route GET /api/materials/:materialId/prices
 * @access Private
 */
export const getVendorPrices = async (req: Request, res: Response) => {
  try {
    const { materialId } = req.params;
    const companyId = req.user?.companyId;

    if (!companyId) {
      return res.status(400).json({ message: 'Company ID is required' });
    }

    // Check if material exists
    const material = await prisma.material.findUnique({
      where: {
        id: materialId,
        companyId,
      },
    });

    if (!material) {
      return res.status(404).json({ message: 'Material not found' });
    }

    // Get vendor prices
    const vendorPrices = await prisma.vendorPrice.findMany({
      where: {
        materialId,
      },
      include: {
        vendor: true,
      },
      orderBy: [
        {
          vendor: {
            name: 'asc',
          },
        },
        {
          effectiveDate: 'desc',
        },
      ],
    });

    return res.status(200).json(vendorPrices);
  } catch (error) {
    logger.error(`Error getting vendor prices for material ${req.params.materialId}:`, error);
    return res.status(500).json({ message: 'Failed to get vendor prices' });
  }
};

/**
 * Create a vendor price for a material
 * 
 * @route POST /api/materials/:materialId/prices
 * @access Private
 */
export const createVendorPrice = async (req: Request, res: Response) => {
  try {
    const { materialId } = req.params;
    const { vendorId, price, effectiveDate, endDate, notes } = req.body;
    const companyId = req.user?.companyId;

    if (!companyId) {
      return res.status(400).json({ message: 'Company ID is required' });
    }

    // Check if material exists
    const material = await prisma.material.findUnique({
      where: {
        id: materialId,
        companyId,
      },
    });

    if (!material) {
      return res.status(404).json({ message: 'Material not found' });
    }

    // Check if vendor exists
    const vendor = await prisma.vendor.findUnique({
      where: {
        id: vendorId,
        companyId,
      },
    });

    if (!vendor) {
      return res.status(404).json({ message: 'Vendor not found' });
    }

    // Create vendor price
    const vendorPrice = await prisma.vendorPrice.create({
      data: {
        materialId,
        vendorId,
        price,
        effectiveDate: new Date(effectiveDate),
        endDate: endDate ? new Date(endDate) : null,
        notes,
      },
      include: {
        vendor: true,
        material: true,
      },
    });

    return res.status(201).json(vendorPrice);
  } catch (error) {
    logger.error(`Error creating vendor price for material ${req.params.materialId}:`, error);
    return res.status(500).json({ message: 'Failed to create vendor price' });
  }
};

/**
 * Update a vendor price
 * 
 * @route PUT /api/materials/:materialId/prices/:priceId
 * @access Private
 */
export const updateVendorPrice = async (req: Request, res: Response) => {
  try {
    const { materialId, priceId } = req.params;
    const { price, effectiveDate, endDate, notes } = req.body;
    const companyId = req.user?.companyId;

    if (!companyId) {
      return res.status(400).json({ message: 'Company ID is required' });
    }

    // Check if material exists
    const material = await prisma.material.findUnique({
      where: {
        id: materialId,
        companyId,
      },
    });

    if (!material) {
      return res.status(404).json({ message: 'Material not found' });
    }

    // Check if vendor price exists
    const existingPrice = await prisma.vendorPrice.findFirst({
      where: {
        id: priceId,
        materialId,
      },
      include: {
        vendor: {
          select: {
            companyId: true,
          },
        },
      },
    });

    if (!existingPrice || existingPrice.vendor.companyId !== companyId) {
      return res.status(404).json({ message: 'Vendor price not found' });
    }

    // Update vendor price
    const vendorPrice = await prisma.vendorPrice.update({
      where: {
        id: priceId,
      },
      data: {
        price,
        effectiveDate: effectiveDate ? new Date(effectiveDate) : undefined,
        endDate: endDate ? new Date(endDate) : null,
        notes,
      },
      include: {
        vendor: true,
        material: true,
      },
    });

    return res.status(200).json(vendorPrice);
  } catch (error) {
    logger.error(`Error updating vendor price ${req.params.priceId}:`, error);
    return res.status(500).json({ message: 'Failed to update vendor price' });
  }
};

/**
 * Delete a vendor price
 * 
 * @route DELETE /api/materials/:materialId/prices/:priceId
 * @access Private
 */
export const deleteVendorPrice = async (req: Request, res: Response) => {
  try {
    const { materialId, priceId } = req.params;
    const companyId = req.user?.companyId;

    if (!companyId) {
      return res.status(400).json({ message: 'Company ID is required' });
    }

    // Check if material exists
    const material = await prisma.material.findUnique({
      where: {
        id: materialId,
        companyId,
      },
    });

    if (!material) {
      return res.status(404).json({ message: 'Material not found' });
    }

    // Check if vendor price exists
    const existingPrice = await prisma.vendorPrice.findFirst({
      where: {
        id: priceId,
        materialId,
      },
      include: {
        vendor: {
          select: {
            companyId: true,
          },
        },
      },
    });

    if (!existingPrice || existingPrice.vendor.companyId !== companyId) {
      return res.status(404).json({ message: 'Vendor price not found' });
    }

    // Delete vendor price
    await prisma.vendorPrice.delete({
      where: {
        id: priceId,
      },
    });

    return res.status(200).json({ message: 'Vendor price deleted successfully' });
  } catch (error) {
    logger.error(`Error deleting vendor price ${req.params.priceId}:`, error);
    return res.status(500).json({ message: 'Failed to delete vendor price' });
  }
};

/**
 * Get best price for a material
 * 
 * @route GET /api/materials/:materialId/best-price
 * @access Private
 */
export const getBestPrice = async (req: Request, res: Response) => {
  try {
    const { materialId } = req.params;
    const companyId = req.user?.companyId;

    if (!companyId) {
      return res.status(400).json({ message: 'Company ID is required' });
    }

    // Check if material exists
    const material = await prisma.material.findUnique({
      where: {
        id: materialId,
        companyId,
      },
    });

    if (!material) {
      return res.status(404).json({ message: 'Material not found' });
    }

    // Get current date
    const now = new Date();

    // Get all active vendor prices for this material
    const vendorPrices = await prisma.vendorPrice.findMany({
      where: {
        materialId,
        effectiveDate: {
          lte: now,
        },
        OR: [
          {
            endDate: null,
          },
          {
            endDate: {
              gte: now,
            },
          },
        ],
      },
      include: {
        vendor: true,
      },
      orderBy: {
        price: 'asc',
      },
    });

    if (vendorPrices.length === 0) {
      return res.status(404).json({ message: 'No active vendor prices found for this material' });
    }

    // Best price is the first one after sorting
    const bestPrice = vendorPrices[0];

    // Get all vendor prices for comparison
    const allPrices = vendorPrices.map(price => ({
      id: price.id,
      vendor: price.vendor.name,
      price: price.price,
      effectiveDate: price.effectiveDate,
      endDate: price.endDate,
      difference: price.price - bestPrice.price,
      percentDifference: ((price.price - bestPrice.price) / bestPrice.price) * 100,
    }));

    return res.status(200).json({
      material: {
        id: material.id,
        name: material.name,
        code: material.code,
        unit: material.unit,
      },
      bestPrice: {
        id: bestPrice.id,
        price: bestPrice.price,
        vendor: bestPrice.vendor,
        effectiveDate: bestPrice.effectiveDate,
        endDate: bestPrice.endDate,
      },
      allPrices,
      priceCount: vendorPrices.length,
    });
  } catch (error) {
    logger.error(`Error getting best price for material ${req.params.materialId}:`, error);
    return res.status(500).json({ message: 'Failed to get best price' });
  }
};