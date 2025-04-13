// src/controllers/project.controller.ts

import { Request, Response } from 'express';
import { PrismaClient } from '@prisma/client';
import { logger } from '../utils/logger';

const prisma = new PrismaClient();

/**
 * Get all projects for the current company
 * 
 * @route GET /api/projects
 * @access Private
 */
export const getProjects = async (req: Request, res: Response) => {
  try {
    const { search, status, clientId, contractorId, sortBy = 'updatedAt', sortOrder = 'desc' } = req.query;
    const companyId = req.user?.companyId;

    if (!companyId) {
      return res.status(400).json({ message: 'Company ID is required' });
    }

    // Build filter conditions
    const where: any = {
      companyId,
      ...(status ? { status: status as string } : {}),
      ...(clientId ? { clientId: clientId as string } : {}),
      ...(contractorId ? { contractorId: contractorId as string } : {}),
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

    // Get projects with client and contractor data
    const projects = await prisma.project.findMany({
      where,
      include: {
        client: {
          select: {
            id: true,
            name: true,
            code: true,
          },
        },
        contractor: {
          select: {
            id: true,
            name: true,
            code: true,
          },
        },
        // Count scopes and expenses for each project
        _count: {
          select: {
            scopes: true,
            expenses: true,
          },
        },
      },
      orderBy: {
        [sortBy as string]: sortOrder,
      },
    });

    return res.status(200).json(projects);
  } catch (error) {
    logger.error('Error getting projects:', error);
    return res.status(500).json({ message: 'Failed to get projects' });
  }
};

/**
 * Get project by ID
 * 
 * @route GET /api/projects/:id
 * @access Private
 */
export const getProjectById = async (req: Request, res: Response) => {
  try {
    const { id } = req.params;
    const companyId = req.user?.companyId;

    if (!companyId) {
      return res.status(400).json({ message: 'Company ID is required' });
    }

    // Get project with related data
    const project = await prisma.project.findUnique({
      where: {
        id,
        companyId,
      },
      include: {
        client: true,
        contractor: true,
        scopes: {
          include: {
            subScopes: {
              include: {
                workItemQuantities: {
                  include: {
                    workItem: true,
                  },
                },
              },
            },
          },
        },
        // Update to use direct WorkItem relation instead of projectWorkItems
        workItem: true,
        // Include financial summary
        expenses: {
          select: {
            id: true,
            amount: true,
            category: true,
          },
        },
        timeEntries: {
          select: {
            id: true,
            regularHours: true,
            overtimeHours: true,
            doubleHours: true,
            employee: {
              select: {
                id: true,
                firstName: true,
                lastName: true,
                type: true,
                rate: true,
                unionClass: {
                  include: {
                    baseRates: {
                      where: {
                        effectiveDate: {
                          lte: new Date(),
                        },
                        OR: [
                          {
                            endDate: null,
                          },
                          {
                            endDate: {
                              gte: new Date(),
                            },
                          },
                        ],
                      },
                      orderBy: {
                        effectiveDate: 'desc',
                      },
                      take: 1,
                    },
                  },
                },
              },
            },
          },
        },
      },
    });

    if (!project) {
      return res.status(404).json({ message: 'Project not found' });
    }

    // Calculate financial metrics
    const completedValue = await calculateCompletedValue(project.id);
    const laborCost = calculateLaborCost(project.timeEntries);
    const expenseCost = project.expenses.reduce((sum, expense) => sum + Number(expense.amount), 0);
    const totalCost = laborCost + expenseCost;
    const profit = completedValue - totalCost;
    const profitMargin = completedValue > 0 ? (profit / completedValue) * 100 : 0;

    // Enhance project with financial data
    const projectWithFinancials = {
      ...project,
      finances: {
        contractValue: Number(project.value),
        completedValue,
        laborCost,
        expenseCost,
        totalCost,
        profit,
        profitMargin,
      },
    };

    return res.status(200).json(projectWithFinancials);
  } catch (error) {
    logger.error(`Error getting project ${req.params.id}:`, error);
    return res.status(500).json({ message: 'Failed to get project' });
  }
};

/**
 * Create a new project
 * 
 * @route POST /api/projects
 * @access Private
 */
export const createProject = async (req: Request, res: Response) => {
  try {
    const {
      name,
      code,
      description,
      address,
      city,
      state,
      zip,
      clientId,
      contractorId,
      startDate,
      endDate,
      status,
      value,
    } = req.body;
    const companyId = req.user?.companyId;

    if (!companyId) {
      return res.status(400).json({ message: 'Company ID is required' });
    }

    // Check if client exists
    const client = await prisma.client.findUnique({
      where: {
        id: clientId,
        companyId,
      },
    });

    if (!client) {
      return res.status(404).json({ message: 'Client not found' });
    }

    // Check if contractor exists if contractorId is provided
    if (contractorId) {
      const contractor = await prisma.contractor.findUnique({
        where: {
          id: contractorId,
          companyId,
        },
      });

      if (!contractor) {
        return res.status(404).json({ message: 'Contractor not found' });
      }
    }

    // Check if project code already exists for this company
    const existingProject = await prisma.project.findUnique({
      where: {
        companyId_code: {
          companyId,
          code,
        },
      },
    });

    if (existingProject) {
      return res.status(409).json({ message: 'Project code already exists' });
    }

    // Create project
    const project = await prisma.project.create({
      data: {
        name,
        code,
        description,
        address,
        city,
        state,
        zip,
        startDate: startDate ? new Date(startDate) : undefined,
        endDate: endDate ? new Date(endDate) : undefined,
        status: status || 'PLANNING',
        value: value || 0,
        companyId,
        clientId,
        contractorId, // Add contractor association here
      },
      include: {
        client: {
          select: {
            id: true,
            name: true,
            code: true,
          },
        },
        contractor: {
          select: {
            id: true,
            name: true,
            code: true,
          },
        },
      },
    });

    return res.status(201).json(project);
  } catch (error) {
    logger.error('Error creating project:', error);
    return res.status(500).json({ message: 'Failed to create project' });
  }
};

/**
 * Update a project
 * 
 * @route PUT /api/projects/:id
 * @access Private
 */
export const updateProject = async (req: Request, res: Response) => {
  try {
    const { id } = req.params;
    const {
      name,
      description,
      address,
      city,
      state,
      zip,
      clientId,
      contractorId,
      startDate,
      endDate,
      status,
      value,
    } = req.body;
    const companyId = req.user?.companyId;

    if (!companyId) {
      return res.status(400).json({ message: 'Company ID is required' });
    }

    // Check if project exists
    const existingProject = await prisma.project.findUnique({
      where: {
        id,
        companyId,
      },
    });

    if (!existingProject) {
      return res.status(404).json({ message: 'Project not found' });
    }

    // Check if client exists if clientId is provided
    if (clientId) {
      const client = await prisma.client.findUnique({
        where: {
          id: clientId,
          companyId,
        },
      });

      if (!client) {
        return res.status(404).json({ message: 'Client not found' });
      }
    }

    // Check if contractor exists if contractorId is provided
    if (contractorId) {
      const contractor = await prisma.contractor.findUnique({
        where: {
          id: contractorId,
          companyId,
        },
      });

      if (!contractor) {
        return res.status(404).json({ message: 'Contractor not found' });
      }
    }

    // Update project
    const project = await prisma.project.update({
      where: {
        id,
      },
      data: {
        name,
        description,
        address,
        city,
        state,
        zip,
        clientId,
        contractorId, // Add contractorId to ensure it's handled properly during update
        startDate: startDate ? new Date(startDate) : undefined,
        endDate: endDate ? new Date(endDate) : undefined,
        status,
        value: value !== undefined ? value : undefined,
      },
      include: {
        client: {
          select: {
            id: true,
            name: true,
            code: true,
          },
        },
        contractor: {
          select: {
            id: true,
            name: true,
            code: true,
          },
        },
      },
    });

    return res.status(200).json(project);
  } catch (error) {
    logger.error(`Error updating project ${req.params.id}:`, error);
    return res.status(500).json({ message: 'Failed to update project' });
  }
};

/**
 * Delete a project
 * 
 * @route DELETE /api/projects/:id
 * @access Private
 */
export const deleteProject = async (req: Request, res: Response) => {
  try {
    const { id } = req.params;
    const companyId = req.user?.companyId;

    if (!companyId) {
      return res.status(400).json({ message: 'Company ID is required' });
    }

    // Check if project exists
    const existingProject = await prisma.project.findUnique({
      where: {
        id,
        companyId,
      },
    });

    if (!existingProject) {
      return res.status(404).json({ message: 'Project not found' });
    }

    // Delete project (cascades to related records)
    await prisma.project.delete({
      where: {
        id,
      },
    });

    return res.status(200).json({ message: 'Project deleted successfully' });
  } catch (error) {
    logger.error(`Error deleting project ${req.params.id}:`, error);
    return res.status(500).json({ message: 'Failed to delete project' });
  }
};

/**
 * Get project scopes
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

    // Check if project exists
    const project = await prisma.project.findUnique({
      where: {
        id: projectId,
        companyId,
      },
    });

    if (!project) {
      return res.status(404).json({ message: 'Project not found' });
    }

    // Get scopes with sub-scopes and work item quantities
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
 * Create a project scope with sub-scopes
 * 
 * @route POST /api/projects/:projectId/scopes
 * @access Private
 */
export const createProjectScope = async (req: Request, res: Response) => {
  try {
    const { projectId } = req.params;
    const { name, code, description, subScopes } = req.body;
    const companyId = req.user?.companyId;

    if (!companyId) {
      return res.status(400).json({ message: 'Company ID is required' });
    }

    // Check if project exists
    const project = await prisma.project.findUnique({
      where: {
        id: projectId,
        companyId,
      },
    });

    if (!project) {
      return res.status(404).json({ message: 'Project not found' });
    }

    // Check if scope code already exists for this project
    const existingScope = await prisma.scope.findFirst({
      where: {
        projectId,
        code,
      },
    });

    if (existingScope) {
      return res.status(409).json({ message: 'Scope code already exists for this project' });
    }

    // Create scope and sub-scopes in a transaction
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
          subScopes: true,
        },
      });
    });

    return res.status(201).json(scope);
  } catch (error) {
    logger.error(`Error creating scope for project ${req.params.projectId}:`, error);
    return res.status(500).json({ message: 'Failed to create project scope' });
  }
};

/**
 * Update project completion percentages
 * 
 * @route PUT /api/projects/:projectId/completion
 * @access Private
 */
export const updateProjectCompletion = async (req: Request, res: Response) => {
  try {
    const { projectId } = req.params;
    const { subScopes } = req.body;
    const companyId = req.user?.companyId;

    if (!companyId) {
      return res.status(400).json({ message: 'Company ID is required' });
    }

    // Check if project exists
    const project = await prisma.project.findUnique({
      where: {
        id: projectId,
        companyId,
      },
    });

    if (!project) {
      return res.status(404).json({ message: 'Project not found' });
    }

    // Update sub-scopes completion in a transaction
    const result = await prisma.$transaction(async (tx) => {
      const updateResults = [];

      for (const subScope of subScopes) {
        // Check if sub-scope exists and belongs to this project
        const existingSubScope = await tx.subScope.findFirst({
          where: {
            id: subScope.id,
            scope: {
              projectId,
            },
          },
        });

        if (!existingSubScope) {
          continue;
        }

        // Update sub-scope completion percentage
        const updatedSubScope = await tx.subScope.update({
          where: {
            id: subScope.id,
          },
          data: {
            percentComplete: subScope.percentComplete,
          },
        });

        updateResults.push(updatedSubScope);

        // Update work item quantities if provided
        if (subScope.workItems && subScope.workItems.length > 0) {
          for (const workItem of subScope.workItems) {
            await tx.workItemQuantity.updateMany({
              where: {
                subScopeId: subScope.id,
                workItemId: workItem.id,
              },
              data: {
                completed: workItem.completed,
              },
            });
          }
        }
      }

      return updateResults;
    });

    return res.status(200).json({
      message: 'Project completion updated successfully',
      updatedSubScopes: result.length,
    });
  } catch (error) {
    logger.error(`Error updating completion for project ${req.params.projectId}:`, error);
    return res.status(500).json({ message: 'Failed to update project completion' });
  }
};

// Helper functions for financial calculations

/**
 * Calculate completed value for a project
 */
async function calculateCompletedValue(projectId: string): Promise<number> {
  // Get all sub-scopes with their work item quantities for this project
  const subScopes = await prisma.subScope.findMany({
    where: {
      scope: {
        projectId,
      },
    },
    include: {
      workItemQuantities: {
        include: {
          workItem: true,
        },
      },
    },
  });

  let completedValue = 0;

  // Calculate completed value for each sub-scope
  for (const subScope of subScopes) {
    for (const quantity of subScope.workItemQuantities) {
      // Get the unit price directly from the work item now
      const unitPrice = Number(quantity.workItem.unitPrice);
      const completed = Number(quantity.completed);
      completedValue += unitPrice * completed;
    }
  }

  return completedValue;
}

/**
 * Calculate labor cost from time entries
 */
function calculateLaborCost(timeEntries: any[]): number {
  return timeEntries.reduce((total, entry) => {
    const employee = entry.employee;
    let hourlyRate = 0;

    if (employee.type === 'LOCAL') {
      hourlyRate = Number(employee.rate) || 0;
    } else if (employee.type === 'UNION' && employee.unionClass?.baseRates[0]) {
      hourlyRate = Number(employee.unionClass.baseRates[0].rate) || 0;
    }

    const regularHours = Number(entry.regularHours) || 0;
    const overtimeHours = Number(entry.overtimeHours) || 0;
    const doubleHours = Number(entry.doubleHours) || 0;

    const regularCost = regularHours * hourlyRate;
    const overtimeCost = overtimeHours * hourlyRate * 1.5;
    const doubleCost = doubleHours * hourlyRate * 2;

    return total + regularCost + overtimeCost + doubleCost;
  }, 0);
}