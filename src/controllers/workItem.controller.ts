// src/controllers/workItem.controller.ts
import { Request, Response } from 'express';
import { PrismaClient } from '@prisma/client';
import { logger } from '../utils/logger';

const prisma = new PrismaClient();

/**
 * Get all work items for a project
 * 
 * @route GET /api/projects/:projectId/work-items
 * @access Private
 */
export const getWorkItems = async (req: Request, res: Response) => {
  try {
    const { projectId } = req.params;
    const { search, sortBy = 'code', sortOrder = 'asc' } = req.query;
    const companyId = req.user?.companyId;

    if (!companyId) {
      return res.status(400).json({ message: 'Company ID is required' });
    }

    // Check if project exists and belongs to this company
    const project = await prisma.project.findUnique({
      where: {
        id: projectId,
        companyId,
      },
    });

    if (!project) {
      return res.status(404).json({ message: 'Project not found' });
    }

    // Build filter conditions
    const where: any = {
      projectId,
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

    // Get work items for this project
    const workItems = await prisma.workItem.findMany({
      where,
      orderBy: {
        [sortBy as string]: sortOrder,
      },
    });

    return res.status(200).json(workItems);
  } catch (error) {
    logger.error(`Error getting work items for project ${req.params.projectId}:`, error);
    return res.status(500).json({ message: 'Failed to get work items' });
  }
};

/**
 * Get work item by ID
 * 
 * @route GET /api/projects/:projectId/work-items/:id
 * @access Private
 */
export const getWorkItemById = async (req: Request, res: Response) => {
  try {
    const { projectId, id } = req.params;
    const companyId = req.user?.companyId;

    if (!companyId) {
      return res.status(400).json({ message: 'Company ID is required' });
    }

    // Check if project exists and belongs to this company
    const project = await prisma.project.findUnique({
      where: {
        id: projectId,
        companyId,
      },
    });

    if (!project) {
      return res.status(404).json({ message: 'Project not found' });
    }

    // Get work item
    const workItem = await prisma.workItem.findUnique({
      where: {
        id,
        projectId,
      },
    });

    if (!workItem) {
      return res.status(404).json({ message: 'Work item not found' });
    }

    return res.status(200).json(workItem);
  } catch (error) {
    logger.error(`Error getting work item ${req.params.id}:`, error);
    return res.status(500).json({ message: 'Failed to get work item' });
  }
};

/**
 * Create a new work item for a project
 * 
 * @route POST /api/projects/:projectId/work-items
 * @access Private
 */
export const createWorkItem = async (req: Request, res: Response) => {
  try {
    const { projectId } = req.params;
    const { code, name, description, unit, unitPrice } = req.body;
    const companyId = req.user?.companyId;

    if (!companyId) {
      return res.status(400).json({ message: 'Company ID is required' });
    }

    // Check if project exists and belongs to this company
    const project = await prisma.project.findUnique({
      where: {
        id: projectId,
        companyId,
      },
    });

    if (!project) {
      return res.status(404).json({ message: 'Project not found' });
    }

    // Check if work item code already exists in this project
    const existingWorkItem = await prisma.workItem.findFirst({
      where: {
        projectId,
        code,
      },
    });

    if (existingWorkItem) {
      return res.status(409).json({ message: 'Work item code already exists in this project' });
    }

    // Create work item
    const workItem = await prisma.workItem.create({
      data: {
        projectId,
        code,
        name,
        description,
        unit,
        unitPrice,
      },
    });

    return res.status(201).json(workItem);
  } catch (error) {
    logger.error(`Error creating work item for project ${req.params.projectId}:`, error);
    return res.status(500).json({ message: 'Failed to create work item' });
  }
};

/**
 * Update a work item
 * 
 * @route PUT /api/projects/:projectId/work-items/:id
 * @access Private
 */
export const updateWorkItem = async (req: Request, res: Response) => {
  try {
    const { projectId, id } = req.params;
    const { name, description, unit, unitPrice } = req.body;
    const companyId = req.user?.companyId;

    if (!companyId) {
      return res.status(400).json({ message: 'Company ID is required' });
    }

    // Check if project exists and belongs to this company
    const project = await prisma.project.findUnique({
      where: {
        id: projectId,
        companyId,
      },
    });

    if (!project) {
      return res.status(404).json({ message: 'Project not found' });
    }

    // Check if work item exists and belongs to this project
    const existingWorkItem = await prisma.workItem.findUnique({
      where: {
        id,
        projectId,
      },
    });

    if (!existingWorkItem) {
      return res.status(404).json({ message: 'Work item not found' });
    }

    // Update work item
    const workItem = await prisma.workItem.update({
      where: {
        id,
      },
      data: {
        name,
        description,
        unit,
        unitPrice,
      },
    });

    return res.status(200).json(workItem);
  } catch (error) {
    logger.error(`Error updating work item ${req.params.id}:`, error);
    return res.status(500).json({ message: 'Failed to update work item' });
  }
};

/**
 * Delete a work item
 * 
 * @route DELETE /api/projects/:projectId/work-items/:id
 * @access Private
 */
export const deleteWorkItem = async (req: Request, res: Response) => {
  try {
    const { projectId, id } = req.params;
    const companyId = req.user?.companyId;

    if (!companyId) {
      return res.status(400).json({ message: 'Company ID is required' });
    }

    // Check if project exists and belongs to this company
    const project = await prisma.project.findUnique({
      where: {
        id: projectId,
        companyId,
      },
    });

    if (!project) {
      return res.status(404).json({ message: 'Project not found' });
    }

    // Check if work item exists and belongs to this project
    const existingWorkItem = await prisma.workItem.findUnique({
      where: {
        id,
        projectId,
      },
    });

    if (!existingWorkItem) {
      return res.status(404).json({ message: 'Work item not found' });
    }

    // Check if work item is associated with any sub-scopes
    const workItemQuantityCount = await prisma.workItemQuantity.count({
      where: {
        workItemId: id,
      },
    });

    if (workItemQuantityCount > 0) {
      return res.status(400).json({
        message: 'Cannot delete work item that is being used in project sub-scopes',
        count: workItemQuantityCount,
      });
    }

    // Delete work item
    await prisma.workItem.delete({
      where: {
        id,
      },
    });

    return res.status(200).json({ message: 'Work item deleted successfully' });
  } catch (error) {
    logger.error(`Error deleting work item ${req.params.id}:`, error);
    return res.status(500).json({ message: 'Failed to delete work item' });
  }
};

/**
 * Add work item to sub-scope with quantity
 * 
 * @route POST /api/projects/:projectId/scopes/:scopeId/sub-scopes/:subScopeId/work-items
 * @access Private
 */
export const addWorkItemToSubScope = async (req: Request, res: Response) => {
  try {
    const { projectId, scopeId, subScopeId } = req.params;
    const { workItemId, quantity, completed = 0 } = req.body;
    const companyId = req.user?.companyId;

    if (!companyId) {
      return res.status(400).json({ message: 'Company ID is required' });
    }

    // Check if project exists and belongs to this company
    const project = await prisma.project.findUnique({
      where: {
        id: projectId,
        companyId,
      },
    });

    if (!project) {
      return res.status(404).json({ message: 'Project not found' });
    }

    // Check if sub-scope exists and belongs to this project
    const subScope = await prisma.subScope.findFirst({
      where: {
        id: subScopeId,
        scope: {
          id: scopeId,
          projectId,
        },
      },
    });

    if (!subScope) {
      return res.status(404).json({ message: 'Sub-scope not found' });
    }

    // Check if work item exists and belongs to this project
    const workItem = await prisma.workItem.findUnique({
      where: {
        id: workItemId,
        projectId,
      },
    });

    if (!workItem) {
      return res.status(404).json({ message: 'Work item not found' });
    }

    // Check if work item is already in the sub-scope
    const existingWorkItemQuantity = await prisma.workItemQuantity.findUnique({
      where: {
        subScopeId_workItemId: {
          subScopeId,
          workItemId,
        },
      },
    });

    if (existingWorkItemQuantity) {
      return res.status(409).json({ message: 'Work item already added to this sub-scope' });
    }

    // Add work item to sub-scope
    const workItemQuantity = await prisma.workItemQuantity.create({
      data: {
        subScopeId,
        workItemId,
        quantity,
        completed,
      },
      include: {
        workItem: true,
      },
    });

    return res.status(201).json(workItemQuantity);
  } catch (error) {
    logger.error(`Error adding work item to sub-scope ${req.params.subScopeId}:`, error);
    return res.status(500).json({ message: 'Failed to add work item to sub-scope' });
  }
};

/**
 * Update work item quantity in sub-scope
 * 
 * @route PUT /api/projects/:projectId/scopes/:scopeId/sub-scopes/:subScopeId/work-items/:workItemId
 * @access Private
 */
export const updateWorkItemQuantity = async (req: Request, res: Response) => {
  try {
    const { projectId, scopeId, subScopeId, workItemId } = req.params;
    const { quantity, completed } = req.body;
    const companyId = req.user?.companyId;

    if (!companyId) {
      return res.status(400).json({ message: 'Company ID is required' });
    }

    // Check if project exists and belongs to this company
    const project = await prisma.project.findUnique({
      where: {
        id: projectId,
        companyId,
      },
    });

    if (!project) {
      return res.status(404).json({ message: 'Project not found' });
    }

    // Check if sub-scope exists and belongs to this project
    const subScope = await prisma.subScope.findFirst({
      where: {
        id: subScopeId,
        scope: {
          id: scopeId,
          projectId,
        },
      },
    });

    if (!subScope) {
      return res.status(404).json({ message: 'Sub-scope not found' });
    }

    // Check if work item exists and belongs to this project
    const workItem = await prisma.workItem.findUnique({
      where: {
        id: workItemId,
        projectId,
      },
    });

    if (!workItem) {
      return res.status(404).json({ message: 'Work item not found' });
    }

    // Check if work item quantity exists
    const existingWorkItemQuantity = await prisma.workItemQuantity.findUnique({
      where: {
        subScopeId_workItemId: {
          subScopeId,
          workItemId,
        },
      },
    });

    if (!existingWorkItemQuantity) {
      return res.status(404).json({ message: 'Work item not found in this sub-scope' });
    }

    // Validate that completed is not greater than quantity
    const newQuantity = quantity !== undefined ? quantity : existingWorkItemQuantity.quantity;
    const newCompleted = completed !== undefined ? completed : existingWorkItemQuantity.completed;

    if (Number(newCompleted) > Number(newQuantity)) {
      return res.status(400).json({ message: 'Completed quantity cannot exceed total quantity' });
    }

    // Update work item quantity
    const workItemQuantity = await prisma.workItemQuantity.update({
      where: {
        id: existingWorkItemQuantity.id,
      },
      data: {
        quantity: newQuantity,
        completed: newCompleted,
      },
      include: {
        workItem: true,
      },
    });

    return res.status(200).json(workItemQuantity);
  } catch (error) {
    logger.error(`Error updating work item quantity in sub-scope ${req.params.subScopeId}:`, error);
    return res.status(500).json({ message: 'Failed to update work item quantity' });
  }
};

/**
 * Remove work item from sub-scope
 * 
 * @route DELETE /api/projects/:projectId/scopes/:scopeId/sub-scopes/:subScopeId/work-items/:workItemId
 * @access Private
 */
export const removeWorkItemFromSubScope = async (req: Request, res: Response) => {
  try {
    const { projectId, scopeId, subScopeId, workItemId } = req.params;
    const companyId = req.user?.companyId;

    if (!companyId) {
      return res.status(400).json({ message: 'Company ID is required' });
    }

    // Check if project exists and belongs to this company
    const project = await prisma.project.findUnique({
      where: {
        id: projectId,
        companyId,
      },
    });

    if (!project) {
      return res.status(404).json({ message: 'Project not found' });
    }

    // Check if sub-scope exists and belongs to this project
    const subScope = await prisma.subScope.findFirst({
      where: {
        id: subScopeId,
        scope: {
          id: scopeId,
          projectId,
        },
      },
    });

    if (!subScope) {
      return res.status(404).json({ message: 'Sub-scope not found' });
    }

    // Check if work item exists and belongs to this project
    const workItem = await prisma.workItem.findUnique({
      where: {
        id: workItemId,
        projectId,
      },
    });

    if (!workItem) {
      return res.status(404).json({ message: 'Work item not found' });
    }

    // Check if work item quantity exists
    const existingWorkItemQuantity = await prisma.workItemQuantity.findUnique({
      where: {
        subScopeId_workItemId: {
          subScopeId,
          workItemId,
        },
      },
    });

    if (!existingWorkItemQuantity) {
      return res.status(404).json({ message: 'Work item not found in this sub-scope' });
    }

    // Remove work item from sub-scope
    await prisma.workItemQuantity.delete({
      where: {
        id: existingWorkItemQuantity.id,
      },
    });

    return res.status(200).json({ message: 'Work item removed from sub-scope successfully' });
  } catch (error) {
    logger.error(`Error removing work item from sub-scope ${req.params.subScopeId}:`, error);
    return res.status(500).json({ message: 'Failed to remove work item from sub-scope' });
  }
};

/**
 * Get work items for a sub-scope
 * 
 * @route GET /api/projects/:projectId/scopes/:scopeId/sub-scopes/:subScopeId/work-items
 * @access Private
 */
export const getSubScopeWorkItems = async (req: Request, res: Response) => {
  try {
    const { projectId, scopeId, subScopeId } = req.params;
    const companyId = req.user?.companyId;

    if (!companyId) {
      return res.status(400).json({ message: 'Company ID is required' });
    }

    // Check if project exists and belongs to this company
    const project = await prisma.project.findUnique({
      where: {
        id: projectId,
        companyId,
      },
    });

    if (!project) {
      return res.status(404).json({ message: 'Project not found' });
    }

    // Check if sub-scope exists and belongs to this project
    const subScope = await prisma.subScope.findFirst({
      where: {
        id: subScopeId,
        scope: {
          id: scopeId,
          projectId,
        },
      },
    });

    if (!subScope) {
      return res.status(404).json({ message: 'Sub-scope not found' });
    }

    // Get work items for this sub-scope
    const workItemQuantities = await prisma.workItemQuantity.findMany({
      where: {
        subScopeId,
      },
      include: {
        workItem: true,
      },
    });

    return res.status(200).json(workItemQuantities);
  } catch (error) {
    logger.error(`Error getting work items for sub-scope ${req.params.subScopeId}:`, error);
    return res.status(500).json({ message: 'Failed to get work items for sub-scope' });
  }
};