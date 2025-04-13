// src/controllers/workItem.controller.ts
import { Request, Response } from 'express';
import { PrismaClient } from '@prisma/client';
import { logger } from '../utils/logger';

const prisma = new PrismaClient();

/**
 * Get all work items
 * 
 * @route GET /api/work-items
 * @access Private
 */
export const getWorkItems = async (req: Request, res: Response) => {
  try {
    const { search, sortBy = 'code', sortOrder = 'asc' } = req.query;

    // Build filter conditions
    const where: any = {
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

    // Get work items
    const workItems = await prisma.workItem.findMany({
      where,
      orderBy: {
        [sortBy as string]: sortOrder,
      },
    });

    return res.status(200).json(workItems);
  } catch (error) {
    logger.error('Error getting work items:', error);
    return res.status(500).json({ message: 'Failed to get work items' });
  }
};

/**
 * Get work item by ID
 * 
 * @route GET /api/work-items/:id
 * @access Private
 */
export const getWorkItemById = async (req: Request, res: Response) => {
  try {
    const { id } = req.params;

    // Get work item
    const workItem = await prisma.workItem.findUnique({
      where: {
        id,
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
 * Create a new work item
 * 
 * @route POST /api/work-items
 * @access Private
 */
export const createWorkItem = async (req: Request, res: Response) => {
  try {
    const { code, name, description, unit } = req.body;

    // Check if work item code already exists
    const existingWorkItem = await prisma.workItem.findFirst({
      where: {
        code,
      },
    });

    if (existingWorkItem) {
      return res.status(409).json({ message: 'Work item code already exists' });
    }

    // Create work item
    const workItem = await prisma.workItem.create({
      data: {
        code,
        name,
        description,
        unit,
      },
    });

    return res.status(201).json(workItem);
  } catch (error) {
    logger.error('Error creating work item:', error);
    return res.status(500).json({ message: 'Failed to create work item' });
  }
};

/**
 * Update a work item
 * 
 * @route PUT /api/work-items/:id
 * @access Private
 */
export const updateWorkItem = async (req: Request, res: Response) => {
  try {
    const { id } = req.params;
    const { name, description, unit } = req.body;

    // Check if work item exists
    const existingWorkItem = await prisma.workItem.findUnique({
      where: {
        id,
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
 * @route DELETE /api/work-items/:id
 * @access Private
 */
export const deleteWorkItem = async (req: Request, res: Response) => {
  try {
    const { id } = req.params;

    // Check if work item exists
    const existingWorkItem = await prisma.workItem.findUnique({
      where: {
        id,
      },
    });

    if (!existingWorkItem) {
      return res.status(404).json({ message: 'Work item not found' });
    }

    // Check if work item is associated with any projects
    const projectWorkItemCount = await prisma.projectWorkItem.count({
      where: {
        workItemId: id,
      },
    });

    if (projectWorkItemCount > 0) {
      return res.status(400).json({
        message: 'Cannot delete work item that is associated with projects',
        count: projectWorkItemCount,
      });
    }

    // Check if work item is associated with any sub-scopes
    const workItemQuantityCount = await prisma.workItemQuantity.count({
      where: {
        workItemId: id,
      },
    });

    if (workItemQuantityCount > 0) {
      return res.status(400).json({
        message: 'Cannot delete work item that is associated with sub-scopes',
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
 * Add work item to project with unit price
 * 
 * @route POST /api/projects/:projectId/work-items
 * @access Private
 */
export const addWorkItemToProject = async (req: Request, res: Response) => {
  try {
    const { projectId } = req.params;
    const { workItemId, unitPrice } = req.body;
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

    // Check if work item exists
    const workItem = await prisma.workItem.findUnique({
      where: {
        id: workItemId,
      },
    });

    if (!workItem) {
      return res.status(404).json({ message: 'Work item not found' });
    }

    // Check if work item is already associated with this project
    const existingProjectWorkItem = await prisma.projectWorkItem.findUnique({
      where: {
        projectId_workItemId: {
          projectId,
          workItemId,
        },
      },
    });

    if (existingProjectWorkItem) {
      return res.status(409).json({ message: 'Work item already added to project' });
    }

    // Add work item to project
    const projectWorkItem = await prisma.projectWorkItem.create({
      data: {
        projectId,
        workItemId,
        unitPrice,
      },
      include: {
        workItem: true,
      },
    });

    return res.status(201).json(projectWorkItem);
  } catch (error) {
    logger.error(`Error adding work item to project ${req.params.projectId}:`, error);
    return res.status(500).json({ message: 'Failed to add work item to project' });
  }
};

/**
 * Update project work item unit price
 * 
 * @route PUT /api/projects/:projectId/work-items/:workItemId
 * @access Private
 */
export const updateProjectWorkItem = async (req: Request, res: Response) => {
  try {
    const { projectId, workItemId } = req.params;
    const { unitPrice } = req.body;
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

    // Check if project work item exists
    const existingProjectWorkItem = await prisma.projectWorkItem.findUnique({
      where: {
        projectId_workItemId: {
          projectId,
          workItemId,
        },
      },
    });

    if (!existingProjectWorkItem) {
      return res.status(404).json({ message: 'Work item not associated with this project' });
    }

    // Update project work item
    const projectWorkItem = await prisma.projectWorkItem.update({
      where: {
        id: existingProjectWorkItem.id,
      },
      data: {
        unitPrice,
      },
      include: {
        workItem: true,
      },
    });

    return res.status(200).json(projectWorkItem);
  } catch (error) {
    logger.error(`Error updating project work item for project ${req.params.projectId}:`, error);
    return res.status(500).json({ message: 'Failed to update project work item' });
  }
};

/**
 * Remove work item from project
 * 
 * @route DELETE /api/projects/:projectId/work-items/:workItemId
 * @access Private
 */
export const removeWorkItemFromProject = async (req: Request, res: Response) => {
  try {
    const { projectId, workItemId } = req.params;
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

    // Check if project work item exists
    const existingProjectWorkItem = await prisma.projectWorkItem.findUnique({
      where: {
        projectId_workItemId: {
          projectId,
          workItemId,
        },
      },
    });

    if (!existingProjectWorkItem) {
      return res.status(404).json({ message: 'Work item not associated with this project' });
    }

    // Check if work item is being used in any sub-scopes
    const workItemQuantityCount = await prisma.workItemQuantity.count({
      where: {
        workItemId,
        subScope: {
          scope: {
            projectId,
          },
        },
      },
    });

    if (workItemQuantityCount > 0) {
      return res.status(400).json({
        message: 'Cannot remove work item that is being used in project sub-scopes',
        count: workItemQuantityCount,
      });
    }

    // Remove work item from project
    await prisma.projectWorkItem.delete({
      where: {
        id: existingProjectWorkItem.id,
      },
    });

    return res.status(200).json({ message: 'Work item removed from project successfully' });
  } catch (error) {
    logger.error(`Error removing work item from project ${req.params.projectId}:`, error);
    return res.status(500).json({ message: 'Failed to remove work item from project' });
  }
};

/**
 * Add work item to sub-scope with quantity
 * 
 * @route POST /api/sub-scopes/:subScopeId/work-items
 * @access Private
 */
export const addWorkItemToSubScope = async (req: Request, res: Response) => {
  try {
    const { subScopeId } = req.params;
    const { workItemId, quantity, completed = 0 } = req.body;
    const companyId = req.user?.companyId;

    if (!companyId) {
      return res.status(400).json({ message: 'Company ID is required' });
    }

    // Check if sub-scope exists and belongs to a project in this company
    const subScope = await prisma.subScope.findFirst({
      where: {
        id: subScopeId,
        scope: {
          project: {
            companyId,
          },
        },
      },
      include: {
        scope: {
          select: {
            projectId: true,
          },
        },
      },
    });

    if (!subScope) {
      return res.status(404).json({ message: 'Sub-scope not found' });
    }

    // Check if work item exists in the project
    const projectWorkItem = await prisma.projectWorkItem.findUnique({
      where: {
        projectId_workItemId: {
          projectId: subScope.scope.projectId,
          workItemId,
        },
      },
    });

    if (!projectWorkItem) {
      return res.status(400).json({ message: 'Work item must be added to the project first' });
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
 * @route PUT /api/sub-scopes/:subScopeId/work-items/:workItemId
 * @access Private
 */
export const updateWorkItemQuantity = async (req: Request, res: Response) => {
  try {
    const { subScopeId, workItemId } = req.params;
    const { quantity, completed } = req.body;
    const companyId = req.user?.companyId;

    if (!companyId) {
      return res.status(400).json({ message: 'Company ID is required' });
    }

    // Check if sub-scope exists and belongs to a project in this company
    const subScope = await prisma.subScope.findFirst({
      where: {
        id: subScopeId,
        scope: {
          project: {
            companyId,
          },
        },
      },
    });

    if (!subScope) {
      return res.status(404).json({ message: 'Sub-scope not found' });
    }

    // Check if work item exists in the sub-scope
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
 * @route DELETE /api/sub-scopes/:subScopeId/work-items/:workItemId
 * @access Private
 */
export const removeWorkItemFromSubScope = async (req: Request, res: Response) => {
  try {
    const { subScopeId, workItemId } = req.params;
    const companyId = req.user?.companyId;

    if (!companyId) {
      return res.status(400).json({ message: 'Company ID is required' });
    }

    // Check if sub-scope exists and belongs to a project in this company
    const subScope = await prisma.subScope.findFirst({
      where: {
        id: subScopeId,
        scope: {
          project: {
            companyId,
          },
        },
      },
    });

    if (!subScope) {
      return res.status(404).json({ message: 'Sub-scope not found' });
    }

    // Check if work item exists in the sub-scope
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