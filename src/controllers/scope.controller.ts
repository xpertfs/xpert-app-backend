// src/controllers/scope.controller.ts
import { Request, Response } from 'express';
import { PrismaClient } from '@prisma/client';
import { logger } from '../utils/logger';

const prisma = new PrismaClient();

/**
 * Get all scopes for a project
 * 
 * @route GET /api/projects/:projectId/scopes
 * @access Private
 */
export const getProjectScopes = async (req: Request, res: Response) => {
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

    // Get scopes with their sub-scopes
    const scopes = await prisma.scope.findMany({
      where: {
        projectId,
      },
      include: {
        subScopes: {
          include: {
            workItemQuantities: {
              include: {
                workItem: true,
              },
            },
          },
          orderBy: {
            code: 'asc',
          },
        },
      },
      orderBy: {
        code: 'asc',
      },
    });

    return res.status(200).json(scopes);
  } catch (error) {
    logger.error(`Error getting scopes for project ${req.params.projectId}:`, error);
    return res.status(500).json({ message: 'Failed to get project scopes' });
  }
};

/**
 * Get a scope by ID
 * 
 * @route GET /api/scopes/:id
 * @access Private
 */
export const getScopeById = async (req: Request, res: Response) => {
  try {
    const { id } = req.params;
    const companyId = req.user?.companyId;

    if (!companyId) {
      return res.status(400).json({ message: 'Company ID is required' });
    }

    // Get scope with its sub-scopes
    const scope = await prisma.scope.findFirst({
      where: {
        id,
        project: {
          companyId,
        },
      },
      include: {
        subScopes: {
          include: {
            workItemQuantities: {
              include: {
                workItem: true,
              },
            },
          },
          orderBy: {
            code: 'asc',
          },
        },
        project: {
          select: {
            id: true,
            name: true,
            code: true,
          },
        },
      },
    });

    if (!scope) {
      return res.status(404).json({ message: 'Scope not found' });
    }

    return res.status(200).json(scope);
  } catch (error) {
    logger.error(`Error getting scope ${req.params.id}:`, error);
    return res.status(500).json({ message: 'Failed to get scope' });
  }
};

/**
 * Create a new scope for a project
 * 
 * @route POST /api/projects/:projectId/scopes
 * @access Private
 */
export const createScope = async (req: Request, res: Response) => {
  try {
    const { projectId } = req.params;
    const { name, code, description, subScopes } = req.body;
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

    // Check if scope code already exists in this project
    const existingScope = await prisma.scope.findFirst({
      where: {
        projectId,
        code,
      },
    });

    if (existingScope) {
      return res.status(409).json({ message: 'Scope code already exists in this project' });
    }

    // Create scope with sub-scopes in a transaction
    const scope = await prisma.$transaction(async (tx) => {
      // Create scope
      const newScope = await tx.scope.create({
        data: {
          name,
          code,
          description,
          projectId,
        },
      });

      // Create sub-scopes if provided
      if (subScopes && subScopes.length > 0) {
        for (const subScope of subScopes) {
          // Check if sub-scope code already exists in this scope
          const existingSubScope = await tx.subScope.findFirst({
            where: {
              scopeId: newScope.id,
              code: subScope.code,
            },
          });

          if (existingSubScope) {
            throw new Error(`Sub-scope code "${subScope.code}" already exists in this scope`);
          }

          await tx.subScope.create({
            data: {
              name: subScope.name,
              code: subScope.code,
              description: subScope.description,
              scopeId: newScope.id,
            },
          });
        }
      }

      // Return scope with sub-scopes
      return tx.scope.findUnique({
        where: {
          id: newScope.id,
        },
        include: {
          subScopes: {
            orderBy: {
              code: 'asc',
            },
          },
        },
      });
    });

    return res.status(201).json(scope);
  } catch (error) {
    logger.error(`Error creating scope for project ${req.params.projectId}:`, error);
    
    // Handle duplicate code error
    if (error instanceof Error && error.message.includes('already exists')) {
      return res.status(409).json({ message: error.message });
    }
    
    return res.status(500).json({ message: 'Failed to create scope' });
  }
};

/**
 * Update a scope
 * 
 * @route PUT /api/scopes/:id
 * @access Private
 */
export const updateScope = async (req: Request, res: Response) => {
  try {
    const { id } = req.params;
    const { name, description } = req.body;
    const companyId = req.user?.companyId;

    if (!companyId) {
      return res.status(400).json({ message: 'Company ID is required' });
    }

    // Check if scope exists and belongs to a project in this company
    const existingScope = await prisma.scope.findFirst({
      where: {
        id,
        project: {
          companyId,
        },
      },
    });

    if (!existingScope) {
      return res.status(404).json({ message: 'Scope not found' });
    }

    // Update scope
    const scope = await prisma.scope.update({
      where: {
        id,
      },
      data: {
        name,
        description,
      },
      include: {
        subScopes: {
          orderBy: {
            code: 'asc',
          },
        },
      },
    });

    return res.status(200).json(scope);
  } catch (error) {
    logger.error(`Error updating scope ${req.params.id}:`, error);
    return res.status(500).json({ message: 'Failed to update scope' });
  }
};

/**
 * Delete a scope
 * 
 * @route DELETE /api/scopes/:id
 * @access Private
 */
export const deleteScope = async (req: Request, res: Response) => {
  try {
    const { id } = req.params;
    const companyId = req.user?.companyId;

    if (!companyId) {
      return res.status(400).json({ message: 'Company ID is required' });
    }

    // Check if scope exists and belongs to a project in this company
    const existingScope = await prisma.scope.findFirst({
      where: {
        id,
        project: {
          companyId,
        },
      },
    });

    if (!existingScope) {
      return res.status(404).json({ message: 'Scope not found' });
    }

    // Delete scope (this will cascade to sub-scopes and work item quantities)
    await prisma.scope.delete({
      where: {
        id,
      },
    });

    return res.status(200).json({ message: 'Scope deleted successfully' });
  } catch (error) {
    logger.error(`Error deleting scope ${req.params.id}:`, error);
    return res.status(500).json({ message: 'Failed to delete scope' });
  }
};

/**
 * Get a sub-scope by ID
 * 
 * @route GET /api/sub-scopes/:id
 * @access Private
 */
export const getSubScopeById = async (req: Request, res: Response) => {
  try {
    const { id } = req.params;
    const companyId = req.user?.companyId;

    if (!companyId) {
      return res.status(400).json({ message: 'Company ID is required' });
    }

    // Get sub-scope with its work item quantities
    const subScope = await prisma.subScope.findFirst({
      where: {
        id,
        scope: {
          project: {
            companyId,
          },
        },
      },
      include: {
        workItemQuantities: {
          include: {
            workItem: true,
          },
        },
        scope: {
          select: {
            id: true,
            name: true,
            code: true,
            project: {
              select: {
                id: true,
                name: true,
                code: true,
              },
            },
          },
        },
      },
    });

    if (!subScope) {
      return res.status(404).json({ message: 'Sub-scope not found' });
    }

    return res.status(200).json(subScope);
  } catch (error) {
    logger.error(`Error getting sub-scope ${req.params.id}:`, error);
    return res.status(500).json({ message: 'Failed to get sub-scope' });
  }
};

/**
 * Create a new sub-scope for a scope and auto-assign project work items
 *
 * @route POST /api/scopes/:scopeId/sub-scopes
 * @access Private
 */
export const createSubScope = async (req: Request, res: Response) => {
  const { scopeId } = req.params;
  const { name, code, description } = req.body;
  const companyId = req.user?.companyId;

  if (!companyId) {
    return res.status(400).json({ message: 'Company ID is required' });
  }

  try {
    // Use a transaction to ensure atomicity
    const result = await prisma.$transaction(async (tx) => {
      // 1. Check if scope exists and belongs to a project in this company
      const scope = await tx.scope.findFirst({
        where: {
          id: scopeId,
          project: {
            companyId,
          },
        },
        select: { // Select only needed fields
          id: true,
          projectId: true // Need projectId to find work items
        }
      });

      if (!scope) {
        // Throw an error to rollback transaction
        throw new Error('Scope not found');
      }

      // 2. Check if sub-scope code already exists in this scope
      const existingSubScope = await tx.subScope.findFirst({
        where: {
          scopeId,
          code,
        },
      });

      if (existingSubScope) {
        // Throw an error to rollback transaction
        throw new Error('Sub-scope code already exists in this scope');
      }

      // 3. Create the new sub-scope
      const newSubScope = await tx.subScope.create({
        data: {
          name,
          code,
          description,
          scopeId,
        },
      });

      // 4. Fetch all work items associated with the parent project
      const projectWorkItems = await tx.workItem.findMany({
        where: {
          projectId: scope.projectId, // Use projectId from the parent scope
        },
        select: {
          id: true, // Only need the ID
        },
      });

      // 5. Prepare data for WorkItemQuantity records
      if (projectWorkItems.length > 0) {
        const workItemQuantityData = projectWorkItems.map((workItem) => ({
          subScopeId: newSubScope.id,
          workItemId: workItem.id,
          quantity: 0, // Default quantity
          completed: 0, // Default completed
        }));

        // 6. Create WorkItemQuantity records for the new sub-scope
        await tx.workItemQuantity.createMany({
          data: workItemQuantityData,
        });
      }

      // Return the newly created subScope (or include workItemQuantities if needed)
      return newSubScope;
    }); // End of transaction

    // If transaction is successful, return the result
    return res.status(201).json(result);

  } catch (error) {
    logger.error(`Error creating sub-scope for scope ${scopeId}:`, error);

    // Handle specific errors thrown from transaction
    if (error instanceof Error) {
        if (error.message === 'Scope not found') {
            return res.status(404).json({ message: error.message });
        }
        if (error.message === 'Sub-scope code already exists in this scope') {
            return res.status(409).json({ message: error.message });
        }
    }
    // Generic error for other issues during transaction
    return res.status(500).json({ message: 'Failed to create sub-scope and assign work items' });
  }
};

/**
 * Update a sub-scope
 * 
 * @route PUT /api/sub-scopes/:id
 * @access Private
 */
export const updateSubScope = async (req: Request, res: Response) => {
  try {
    const { id } = req.params;
    const { name, description, percentComplete } = req.body;
    const companyId = req.user?.companyId;

    if (!companyId) {
      return res.status(400).json({ message: 'Company ID is required' });
    }

    // Check if sub-scope exists and belongs to a project in this company
    const existingSubScope = await prisma.subScope.findFirst({
      where: {
        id,
        scope: {
          project: {
            companyId,
          },
        },
      },
    });

    if (!existingSubScope) {
      return res.status(404).json({ message: 'Sub-scope not found' });
    }

    // Update sub-scope
    const subScope = await prisma.subScope.update({
      where: {
        id,
      },
      data: {
        name,
        description,
        percentComplete,
      },
    });

    return res.status(200).json(subScope);
  } catch (error) {
    logger.error(`Error updating sub-scope ${req.params.id}:`, error);
    return res.status(500).json({ message: 'Failed to update sub-scope' });
  }
};

/**
 * Delete a sub-scope
 * 
 * @route DELETE /api/sub-scopes/:id
 * @access Private
 */
export const deleteSubScope = async (req: Request, res: Response) => {
  try {
    const { id } = req.params;
    const companyId = req.user?.companyId;

    if (!companyId) {
      return res.status(400).json({ message: 'Company ID is required' });
    }

    // Check if sub-scope exists and belongs to a project in this company
    const existingSubScope = await prisma.subScope.findFirst({
      where: {
        id,
        scope: {
          project: {
            companyId,
          },
        },
      },
    });

    if (!existingSubScope) {
      return res.status(404).json({ message: 'Sub-scope not found' });
    }

    // Delete sub-scope (this will cascade to work item quantities)
    await prisma.subScope.delete({
      where: {
        id,
      },
    });

    return res.status(200).json({ message: 'Sub-scope deleted successfully' });
  } catch (error) {
    logger.error(`Error deleting sub-scope ${req.params.id}:`, error);
    return res.status(500).json({ message: 'Failed to delete sub-scope' });
  }
};

/**
 * Update sub-scope completion percentage
 * 
 * @route PUT /api/sub-scopes/:id/completion
 * @access Private
 */
export const updateSubScopeCompletion = async (req: Request, res: Response) => {
  try {
    const { id } = req.params;
    const { percentComplete } = req.body;
    const companyId = req.user?.companyId;

    if (!companyId) {
      return res.status(400).json({ message: 'Company ID is required' });
    }

    // Check if sub-scope exists and belongs to a project in this company
    const existingSubScope = await prisma.subScope.findFirst({
      where: {
        id,
        scope: {
          project: {
            companyId,
          },
        },
      },
    });

    if (!existingSubScope) {
      return res.status(404).json({ message: 'Sub-scope not found' });
    }

    // Validate percentComplete value
    if (percentComplete < 0 || percentComplete > 100) {
      return res.status(400).json({ message: 'Percent complete must be between 0 and 100' });
    }

    // Update sub-scope completion percentage
    const subScope = await prisma.subScope.update({
      where: {
        id,
      },
      data: {
        percentComplete,
      },
    });

    return res.status(200).json(subScope);
  } catch (error) {
    logger.error(`Error updating sub-scope completion ${req.params.id}:`, error);
    return res.status(500).json({ message: 'Failed to update sub-scope completion' });
  }
};