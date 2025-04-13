// src/controllers/expense.controller.ts
import { Request, Response } from 'express';
import { PrismaClient } from '@prisma/client';
import { logger } from '../utils/logger';

const prisma = new PrismaClient();

/**
 * Get all expenses for the current company
 * 
 * @route GET /api/expenses
 * @access Private
 */
export const getExpenses = async (req: Request, res: Response) => {
  try {
    const { 
      search, 
      category, 
      projectId, 
      vendorId,
      startDate,
      endDate,
      limit = '100',
      page = '1',
      sortBy = 'date',
      sortOrder = 'desc'
    } = req.query;
    const companyId = req.user?.companyId;

    if (!companyId) {
      return res.status(400).json({ message: 'Company ID is required' });
    }

    // Parse pagination
    const limitNum = parseInt(limit as string, 10);
    const pageNum = parseInt(page as string, 10);
    const skip = (pageNum - 1) * limitNum;

    // Build filter conditions
    const where: any = {
      companyId,
      ...(category ? { category: category as string } : {}),
      ...(projectId ? { projectId: projectId as string } : {}),
      ...(vendorId ? { vendorId: vendorId as string } : {}),
      ...(search
        ? {
            OR: [
              { description: { contains: search as string, mode: 'insensitive' } },
              { reference: { contains: search as string, mode: 'insensitive' } },
            ],
          }
        : {}),
    };

    // Add date range filter if provided
    if (startDate || endDate) {
      where.date = {};
      if (startDate) {
        where.date.gte = new Date(startDate as string);
      }
      if (endDate) {
        where.date.lte = new Date(endDate as string);
      }
    }

    // Get expenses with pagination
    const [expenses, total] = await Promise.all([
      prisma.expense.findMany({
        where,
        include: {
          project: {
            select: {
              id: true,
              name: true,
              code: true,
            },
          },
          vendor: {
            select: {
              id: true,
              name: true,
              code: true,
            },
          },
        },
        orderBy: {
          [sortBy as string]: sortOrder,
        },
        skip,
        take: limitNum,
      }),
      prisma.expense.count({ where }),
    ]);

    return res.status(200).json({
      expenses,
      pagination: {
        total,
        page: pageNum,
        limit: limitNum,
        pages: Math.ceil(total / limitNum),
      },
    });
  } catch (error) {
    logger.error('Error getting expenses:', error);
    return res.status(500).json({ message: 'Failed to get expenses' });
  }
};

/**
 * Get expenses by project
 * 
 * @route GET /api/expenses/project/:projectId
 * @access Private
 */
export const getExpensesByProject = async (req: Request, res: Response) => {
  try {
    const { projectId } = req.params;
    const companyId = req.user?.companyId;

    if (!companyId) {
      return res.status(400).json({ message: 'Company ID is required' });
    }

    // Check if project exists and belongs to the company
    const project = await prisma.project.findFirst({
      where: {
        id: projectId,
        companyId,
      },
    });

    if (!project) {
      return res.status(404).json({ message: 'Project not found' });
    }

    // Get expenses for this project
    const expenses = await prisma.expense.findMany({
      where: {
        projectId,
      },
      include: {
        vendor: {
          select: {
            id: true,
            name: true,
            code: true,
          },
        },
      },
      orderBy: {
        date: 'desc',
      },
    });

    // Calculate totals by category
    const totalsByCategory: Record<string, number> = {};
    let grandTotal = 0;

    expenses.forEach((expense) => {
      const category = expense.category;
      const amount = Number(expense.amount);
      
      if (!totalsByCategory[category]) {
        totalsByCategory[category] = 0;
      }
      
      totalsByCategory[category] += amount;
      grandTotal += amount;
    });

    return res.status(200).json({
      expenses,
      totalsByCategory,
      grandTotal,
      count: expenses.length,
    });
  } catch (error) {
    logger.error(`Error getting expenses for project ${req.params.projectId}:`, error);
    return res.status(500).json({ message: 'Failed to get project expenses' });
  }
};

/**
 * Get expenses by category
 * 
 * @route GET /api/expenses/category/:category
 * @access Private
 */
export const getExpensesByCategory = async (req: Request, res: Response) => {
  try {
    const { category } = req.params;
    const companyId = req.user?.companyId;

    if (!companyId) {
      return res.status(400).json({ message: 'Company ID is required' });
    }

    // Get expenses for this category
    const expenses = await prisma.expense.findMany({
      where: {
        companyId,
        category: category as any,
      },
      include: {
        project: {
          select: {
            id: true,
            name: true,
            code: true,
          },
        },
        vendor: {
          select: {
            id: true,
            name: true,
            code: true,
          },
        },
      },
      orderBy: {
        date: 'desc',
      },
    });

    // Calculate total
    const total = expenses.reduce((sum, expense) => sum + Number(expense.amount), 0);

    return res.status(200).json({
      expenses,
      total,
      count: expenses.length,
    });
  } catch (error) {
    logger.error(`Error getting expenses for category ${req.params.category}:`, error);
    return res.status(500).json({ message: 'Failed to get category expenses' });
  }
};

/**
 * Get expense by ID
 * 
 * @route GET /api/expenses/:id
 * @access Private
 */
export const getExpenseById = async (req: Request, res: Response) => {
  try {
    const { id } = req.params;
    const companyId = req.user?.companyId;

    if (!companyId) {
      return res.status(400).json({ message: 'Company ID is required' });
    }

    // Get expense
    const expense = await prisma.expense.findUnique({
      where: {
        id,
        companyId,
      },
      include: {
        project: {
          select: {
            id: true,
            name: true,
            code: true,
          },
        },
        vendor: {
          select: {
            id: true,
            name: true,
            code: true,
          },
        },
      },
    });

    if (!expense) {
      return res.status(404).json({ message: 'Expense not found' });
    }

    return res.status(200).json(expense);
  } catch (error) {
    logger.error(`Error getting expense ${req.params.id}:`, error);
    return res.status(500).json({ message: 'Failed to get expense' });
  }
};

/**
 * Create a new expense
 * 
 * @route POST /api/expenses
 * @access Private
 */
export const createExpense = async (req: Request, res: Response) => {
  try {
    const {
      date,
      amount,
      description,
      category,
      reference,
      recurring,
      projectId,
      vendorId,
    } = req.body;
    const companyId = req.user?.companyId;

    if (!companyId) {
      return res.status(400).json({ message: 'Company ID is required' });
    }

    // Check if project exists if provided
    if (projectId) {
      const project = await prisma.project.findFirst({
        where: {
          id: projectId,
          companyId,
        },
      });

      if (!project) {
        return res.status(404).json({ message: 'Project not found' });
      }
    }

    // Check if vendor exists if provided
    if (vendorId) {
      const vendor = await prisma.vendor.findFirst({
        where: {
          id: vendorId,
          companyId,
        },
      });

      if (!vendor) {
        return res.status(404).json({ message: 'Vendor not found' });
      }
    }

    // Create expense
    const expense = await prisma.expense.create({
      data: {
        date: new Date(date),
        amount,
        description,
        category,
        reference,
        recurring: recurring || false,
        projectId,
        vendorId,
        companyId,
      },
      include: {
        project: {
          select: {
            id: true,
            name: true,
            code: true,
          },
        },
        vendor: {
          select: {
            id: true,
            name: true,
            code: true,
          },
        },
      },
    });

    return res.status(201).json(expense);
  } catch (error) {
    logger.error('Error creating expense:', error);
    return res.status(500).json({ message: 'Failed to create expense' });
  }
};

/**
 * Update an expense
 * 
 * @route PUT /api/expenses/:id
 * @access Private
 */
export const updateExpense = async (req: Request, res: Response) => {
  try {
    const { id } = req.params;
    const {
      date,
      amount,
      description,
      category,
      reference,
      recurring,
      projectId,
      vendorId,
    } = req.body;
    const companyId = req.user?.companyId;

    if (!companyId) {
      return res.status(400).json({ message: 'Company ID is required' });
    }

    // Check if expense exists
    const existingExpense = await prisma.expense.findFirst({
      where: {
        id,
        companyId,
      },
    });

    if (!existingExpense) {
      return res.status(404).json({ message: 'Expense not found' });
    }

    // Check if project exists if provided
    if (projectId && projectId !== existingExpense.projectId) {
      const project = await prisma.project.findFirst({
        where: {
          id: projectId,
          companyId,
        },
      });

      if (!project) {
        return res.status(404).json({ message: 'Project not found' });
      }
    }

    // Check if vendor exists if provided
    if (vendorId && vendorId !== existingExpense.vendorId) {
      const vendor = await prisma.vendor.findFirst({
        where: {
          id: vendorId,
          companyId,
        },
      });

      if (!vendor) {
        return res.status(404).json({ message: 'Vendor not found' });
      }
    }

    // Update expense
    const expense = await prisma.expense.update({
      where: {
        id,
      },
      data: {
        date: date ? new Date(date) : undefined,
        amount,
        description,
        category,
        reference,
        recurring,
        projectId,
        vendorId,
      },
      include: {
        project: {
          select: {
            id: true,
            name: true,
            code: true,
          },
        },
        vendor: {
          select: {
            id: true,
            name: true,
            code: true,
          },
        },
      },
    });

    return res.status(200).json(expense);
  } catch (error) {
    logger.error(`Error updating expense ${req.params.id}:`, error);
    return res.status(500).json({ message: 'Failed to update expense' });
  }
};

/**
 * Delete an expense
 * 
 * @route DELETE /api/expenses/:id
 * @access Private
 */
export const deleteExpense = async (req: Request, res: Response) => {
  try {
    const { id } = req.params;
    const companyId = req.user?.companyId;

    if (!companyId) {
      return res.status(400).json({ message: 'Company ID is required' });
    }

    // Check if expense exists
    const existingExpense = await prisma.expense.findFirst({
      where: {
        id,
        companyId,
      },
    });

    if (!existingExpense) {
      return res.status(404).json({ message: 'Expense not found' });
    }

    // Delete expense
    await prisma.expense.delete({
      where: {
        id,
      },
    });

    return res.status(200).json({ message: 'Expense deleted successfully' });
  } catch (error) {
    logger.error(`Error deleting expense ${req.params.id}:`, error);
    return res.status(500).json({ message: 'Failed to delete expense' });
  }
};