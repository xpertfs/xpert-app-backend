// src/controllers/employee.controller.ts

import { Request, Response } from 'express';
import { PrismaClient, EmployeeType } from '@prisma/client';
import { logger } from '../utils/logger';

const prisma = new PrismaClient();

/**
 * Get all employees for the current company
 * 
 * @route GET /api/employees
 * @access Private
 */
export const getEmployees = async (req: Request, res: Response) => {
  try {
    const { search, type, active, sort = 'lastName', order = 'asc' } = req.query;
    const companyId = req.user?.companyId;

    if (!companyId) {
      return res.status(400).json({ message: 'Company ID is required' });
    }

    // Build filter conditions
    const where: any = {
      companyId,
      ...(type ? { type: type as EmployeeType } : {}),
      ...(active !== undefined ? { active: active === 'true' } : {}),
      ...(search
        ? {
            OR: [
              { firstName: { contains: search as string, mode: 'insensitive' } },
              { lastName: { contains: search as string, mode: 'insensitive' } },
              { email: { contains: search as string, mode: 'insensitive' } },
            ],
          }
        : {}),
    };

    // Get employees with related data
    const employees = await prisma.employee.findMany({
      where,
      include: {
        unionClass: {
          select: {
            id: true,
            name: true,
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
      orderBy: {
        [sort as string]: order === 'desc' ? 'desc' : 'asc',
      },
    });

    // Enhance employee data with current rate
    const enhancedEmployees = employees.map(employee => {
      let currentRate = employee.rate;
      
      if (employee.type === 'UNION' && employee.unionClass?.baseRates[0]) {
        currentRate = employee.unionClass.baseRates[0].regularRate;
      }
      
      return {
        ...employee,
        currentRate,
      };
    });

    return res.status(200).json(enhancedEmployees);
  } catch (error) {
    logger.error('Error getting employees:', error);
    return res.status(500).json({ message: 'Failed to get employees' });
  }
};

/**
 * Get employee by ID
 * 
 * @route GET /api/employees/:id
 * @access Private
 */
export const getEmployeeById = async (req: Request, res: Response) => {
  try {
    const { id } = req.params;
    const companyId = req.user?.companyId;

    if (!companyId) {
      return res.status(400).json({ message: 'Company ID is required' });
    }

    // Get employee with related data
    const employee = await prisma.employee.findFirst({
      where: {
        id,
        companyId,
      },
      include: {
        unionClass: {
          include: {
            baseRates: {
              orderBy: {
                effectiveDate: 'desc',
              },
            },
            customRates: {
              orderBy: {
                effectiveDate: 'desc',
              },
            },
          },
        },
        timeEntries: {
          take: 10,
          orderBy: {
            date: 'desc',
          },
          include: {
            project: {
              select: {
                id: true,
                name: true,
                code: true,
              },
            },
          },
        },
        payments: {
          take: 10,
          orderBy: {
            paymentDate: 'desc',
          },
        },
      },
    });

    if (!employee) {
      return res.status(404).json({ message: 'Employee not found' });
    }

    return res.status(200).json(employee);
  } catch (error) {
    logger.error(`Error getting employee ${req.params.id}:`, error);
    return res.status(500).json({ message: 'Failed to get employee' });
  }
};

/**
 * Create a new employee
 * 
 * @route POST /api/employees
 * @access Private
 */
export const createEmployee = async (req: Request, res: Response) => {
  try {
    const {
      firstName,
      lastName,
      code,
      email,
      phone,
      type,
      rate,
      unionClassId,
      hireDate,
      active = true,
    } = req.body;
    const companyId = req.user?.companyId;

    if (!companyId) {
      return res.status(400).json({ message: 'Company ID is required' });
    }

    // Validate employee type and required fields
    if (type === 'LOCAL' && rate === undefined) {
      return res.status(400).json({ message: 'Rate is required for local employees' });
    }

    if (type === 'UNION' && !unionClassId) {
      return res.status(400).json({ message: 'Union class is required for union employees' });
    }

    // Check if unionClass exists if unionClassId is provided
    if (unionClassId) {
      const unionClass = await prisma.unionClass.findUnique({
        where: {
          id: unionClassId,
          companyId,
        },
      });

      if (!unionClass) {
        return res.status(404).json({ message: 'Union class not found' });
      }
    }

    // Check if employee code already exists for this company
    const existingEmployee = await prisma.employee.findUnique({
      where: {
        companyId_code: {
          companyId,
          code,
        },
      },
    });

    if (existingEmployee) {
      return res.status(409).json({ message: 'Employee code already exists' });
    }

    // Create employee
    const employee = await prisma.employee.create({
      data: {
        firstName,
        lastName,
        code,
        email,
        phone,
        type,
        rate: type === 'LOCAL' ? rate : null,
        unionClassId: type === 'UNION' ? unionClassId : null,
        hireDate: hireDate ? new Date(hireDate) : new Date(),
        active,
        companyId,
      },
      include: {
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
    });

    return res.status(201).json(employee);
  } catch (error) {
    logger.error('Error creating employee:', error);
    return res.status(500).json({ message: 'Failed to create employee' });
  }
};

/**
 * Update an employee
 * 
 * @route PUT /api/employees/:id
 * @access Private
 */
export const updateEmployee = async (req: Request, res: Response) => {
  try {
    const { id } = req.params;
    const {
      firstName,
      lastName,
      email,
      phone,
      rate,
      unionClassId,
      hireDate,
      terminationDate,
      active,
    } = req.body;
    const companyId = req.user?.companyId;

    if (!companyId) {
      return res.status(400).json({ message: 'Company ID is required' });
    }

    // Check if employee exists and belongs to this company
    const existingEmployee = await prisma.employee.findUnique({
      where: {
        id,
        companyId,
      },
    });

    if (!existingEmployee) {
      return res.status(404).json({ message: 'Employee not found' });
    }

    // Check if unionClass exists if unionClassId is provided and employee is UNION type
    if (unionClassId && existingEmployee.type === 'UNION') {
      const unionClass = await prisma.unionClass.findUnique({
        where: {
          id: unionClassId,
          companyId,
        },
      });

      if (!unionClass) {
        return res.status(404).json({ message: 'Union class not found' });
      }
    }

    // Update employee
    const employee = await prisma.employee.update({
      where: {
        id,
      },
      data: {
        firstName,
        lastName,
        email,
        phone,
        rate: existingEmployee.type === 'LOCAL' ? rate : undefined,
        unionClassId: existingEmployee.type === 'UNION' ? unionClassId : undefined,
        hireDate: hireDate ? new Date(hireDate) : undefined,
        terminationDate: terminationDate ? new Date(terminationDate) : undefined,
        active,
      },
      include: {
        unionClass: true,
      },
    });

    return res.status(200).json(employee);
  } catch (error) {
    logger.error(`Error updating employee ${req.params.id}:`, error);
    return res.status(500).json({ message: 'Failed to update employee' });
  }
};

/**
 * Delete an employee
 * 
 * @route DELETE /api/employees/:id
 * @access Private
 */
export const deleteEmployee = async (req: Request, res: Response) => {
  try {
    const { id } = req.params;
    const companyId = req.user?.companyId;

    if (!companyId) {
      return res.status(400).json({ message: 'Company ID is required' });
    }

    // Check if employee exists and belongs to this company
    const existingEmployee = await prisma.employee.findUnique({
      where: {
        id,
        companyId,
      },
    });

    if (!existingEmployee) {
      return res.status(404).json({ message: 'Employee not found' });
    }

    // Check if employee has associated time entries or payments
    const timeEntryCount = await prisma.timeEntry.count({
      where: {
        employeeId: id,
      },
    });

    const paymentCount = await prisma.payment.count({
      where: {
        employeeId: id,
      },
    });

    if (timeEntryCount > 0 || paymentCount > 0) {
      // Instead of deleting, mark as inactive
      await prisma.employee.update({
        where: {
          id,
        },
        data: {
          active: false,
          terminationDate: new Date(),
        },
      });

      return res.status(200).json({
        message: 'Employee has associated data and cannot be deleted. Marked as inactive instead.',
      });
    }

    // Delete employee if no associated data
    await prisma.employee.delete({
      where: {
        id,
      },
    });

    return res.status(200).json({ message: 'Employee deleted successfully' });
  } catch (error) {
    logger.error(`Error deleting employee ${req.params.id}:`, error);
    return res.status(500).json({ message: 'Failed to delete employee' });
  }
};

/**
 * Get all union classes for the current company
 * 
 * @route GET /api/employees/union-classes
 * @access Private
 */
export const getUnionClasses = async (req: Request, res: Response) => {
  try {
    const companyId = req.user?.companyId;

    if (!companyId) {
      return res.status(400).json({ message: 'Company ID is required' });
    }

    // Get union classes with base rates
    const unionClasses = await prisma.unionClass.findMany({
      where: {
        companyId,
      },
      include: {
        baseRates: {
          orderBy: {
            effectiveDate: 'desc',
          },
        },
        _count: {
          select: {
            employees: true,
          },
        },
      },
      orderBy: {
        name: 'asc',
      },
    });

    return res.status(200).json(unionClasses);
  } catch (error) {
    logger.error('Error getting union classes:', error);
    return res.status(500).json({ message: 'Failed to get union classes' });
  }
};

/**
 * Create a new union class with initial base rate
 * 
 * @route POST /api/employees/union-classes
 * @access Private
 */
export const createUnionClass = async (req: Request, res: Response) => {
  try {
    const { name, baseRates } = req.body;
    const companyId = req.user?.companyId;

    if (!companyId) {
      return res.status(400).json({ message: 'Company ID is required' });
    }

    // Create union class with initial base rate
    const unionClass = await prisma.$transaction(async (tx) => {
      // Create union class
      const newClass = await tx.unionClass.create({
        data: {
          name,
          companyId,
        },
      });

      // Create initial base rate
      await tx.unionClassBaseRate.create({
        data: {
          unionClassId: newClass.id,
          regularRate: parseFloat(baseRates[0].regularRate),
          overtimeRate: parseFloat(baseRates[0].overtimeRate),
          benefitsRate: parseFloat(baseRates[0].benefitsRate),
          effectiveDate: new Date(baseRates[0].effectiveDate),
          endDate: baseRates[0].endDate ? new Date(baseRates[0].endDate) : null,
        },
      });

      // Return union class with base rates
      return tx.unionClass.findUnique({
        where: {
          id: newClass.id,
        },
        include: {
          baseRates: {
            orderBy: {
              effectiveDate: 'desc',
            },
          },
        },
      });
    });

    return res.status(201).json(unionClass);
  } catch (error) {
    logger.error('Error creating union class:', error);
    return res.status(500).json({ message: 'Failed to create union class' });
  }
};

/**
 * Update a union class
 * 
 * @route PUT /api/employees/union-classes/:id
 * @access Private
 */
export const updateUnionClass = async (req: Request, res: Response) => {
  try {
    const { id } = req.params;
    const { name, baseRates } = req.body;
    const companyId = req.user?.companyId;

    if (!companyId) {
      return res.status(400).json({ message: 'Company ID is required' });
    }

    // Check if union class exists and belongs to this company
    const existingClass = await prisma.unionClass.findUnique({
      where: {
        id: parseInt(id),
        companyId,
      },
    });

    if (!existingClass) {
      return res.status(404).json({ message: 'Union class not found' });
    }

    // Update union class and add new base rate if provided
    const unionClass = await prisma.$transaction(async (tx) => {
      // Update union class
      const updatedClass = await tx.unionClass.update({
        where: {
          id: parseInt(id),
        },
        data: {
          name,
        },
      });

      // Add new base rate if provided
      if (baseRates && baseRates.length > 0) {
        const newRate = baseRates[0];
        await tx.unionClassBaseRate.create({
          data: {
            unionClassId: parseInt(id),
            regularRate: parseFloat(newRate.regularRate),
            overtimeRate: parseFloat(newRate.overtimeRate),
            benefitsRate: parseFloat(newRate.benefitsRate),
            effectiveDate: new Date(newRate.effectiveDate),
            endDate: newRate.endDate ? new Date(newRate.endDate) : null,
          },
        });

        // Update end date of previous base rate
        await tx.unionClassBaseRate.updateMany({
          where: {
            unionClassId: parseInt(id),
            effectiveDate: {
              lt: new Date(newRate.effectiveDate),
            },
            endDate: null,
          },
          data: {
            endDate: new Date(newRate.effectiveDate),
          },
        });
      }

      // Return updated union class with base rates
      return tx.unionClass.findUnique({
        where: {
          id: parseInt(id),
        },
        include: {
          baseRates: {
            orderBy: {
              effectiveDate: 'desc',
            },
          },
        },
      });
    });

    return res.status(200).json(unionClass);
  } catch (error) {
    logger.error(`Error updating union class ${req.params.id}:`, error);
    return res.status(500).json({ message: 'Failed to update union class' });
  }
};

/**
 * Delete a union class
 * 
 * @route DELETE /api/employees/union-classes/:id
 * @access Private
 */
export const deleteUnionClass = async (req: Request, res: Response) => {
  try {
    const { id } = req.params;
    const companyId = req.user?.companyId;

    if (!companyId) {
      return res.status(400).json({ message: 'Company ID is required' });
    }

    // Check if union class exists and belongs to this company
    const existingClass = await prisma.unionClass.findUnique({
      where: {
        id,
        companyId,
      },
    });

    if (!existingClass) {
      return res.status(404).json({ message: 'Union class not found' });
    }

    // Check if union class has associated employees
    const employeeCount = await prisma.employee.count({
      where: {
        unionClassId: id,
      },
    });

    if (employeeCount > 0) {
      return res.status(400).json({
        message: 'Cannot delete union class with associated employees',
        count: employeeCount,
      });
    }

    // Delete union class (will cascade to rates)
    await prisma.unionClass.delete({
      where: {
        id,
      },
    });

    return res.status(200).json({ message: 'Union class deleted successfully' });
  } catch (error) {
    logger.error(`Error deleting union class ${req.params.id}:`, error);
    return res.status(500).json({ message: 'Failed to delete union class' });
  }
};

/**
 * Get all rates for a union class
 * 
 * @route GET /api/employees/union-classes/:classId/rates
 * @access Private
 */
export const getUnionRates = async (req: Request, res: Response) => {
  try {
    const { classId } = req.params;
    const companyId = req.user?.companyId;

    if (!companyId) {
      return res.status(400).json({ message: 'Company ID is required' });
    }

    // Check if union class exists and belongs to this company
    const existingClass = await prisma.unionClass.findUnique({
      where: {
        id: classId,
        companyId,
      },
    });

    if (!existingClass) {
      return res.status(404).json({ message: 'Union class not found' });
    }

    // Get base rates
    const baseRates = await prisma.unionClassBaseRate.findMany({
      where: {
        unionClassId: classId,
      },
      orderBy: {
        effectiveDate: 'desc',
      },
    });

    // Get custom rates
    const customRates = await prisma.unionClassCustomRate.findMany({
      where: {
        unionClassId: classId,
      },
      orderBy: {
        effectiveDate: 'desc',
      },
    });

    return res.status(200).json({
      baseRates,
      customRates,
    });
  } catch (error) {
    logger.error(`Error getting union rates for class ${req.params.classId}:`, error);
    return res.status(500).json({ message: 'Failed to get union rates' });
  }
};

/**
 * Create a new rate for a union class
 * 
 * @route POST /api/employees/union-classes/:classId/rates
 * @access Private
 */
export const createUnionRate = async (req: Request, res: Response) => {
  try {
    const { classId } = req.params;
    const { regularRate, overtimeRate, benefitsRate, effectiveDate, endDate } = req.body;
    const companyId = req.user?.companyId;

    if (!companyId) {
      return res.status(400).json({ message: 'Company ID is required' });
    }

    // Check if union class exists and belongs to this company
    const existingClass = await prisma.unionClass.findUnique({
      where: {
        id: parseInt(classId),
        companyId,
      },
    });

    if (!existingClass) {
      return res.status(404).json({ message: 'Union class not found' });
    }

    // Create new base rate
    const baseRate = await prisma.$transaction(async (tx) => {
      // Create new base rate
      const newRate = await tx.unionClassBaseRate.create({
        data: {
          unionClassId: parseInt(classId),
          regularRate: parseFloat(regularRate),
          overtimeRate: parseFloat(overtimeRate),
          benefitsRate: parseFloat(benefitsRate),
          effectiveDate: new Date(effectiveDate),
          endDate: endDate ? new Date(endDate) : null,
        },
      });

      // Update end date of previous base rate
      await tx.unionClassBaseRate.updateMany({
        where: {
          unionClassId: parseInt(classId),
          effectiveDate: {
            lt: new Date(effectiveDate),
          },
          endDate: null,
        },
        data: {
          endDate: new Date(effectiveDate),
        },
      });

      return newRate;
    });

    return res.status(201).json(baseRate);
  } catch (error) {
    logger.error(`Error creating union rate for class ${req.params.classId}:`, error);
    return res.status(500).json({ message: 'Failed to create union rate' });
  }
};

/**
 * Update a union rate
 * 
 * @route PUT /api/employees/union-classes/:classId/rates/:rateId
 * @access Private
 */
export const updateUnionRate = async (req: Request, res: Response) => {
  try {
    const { classId, rateId } = req.params;
    const { regularRate, overtimeRate, benefitsRate, effectiveDate, endDate } = req.body;
    const companyId = req.user?.companyId;

    if (!companyId) {
      return res.status(400).json({ message: 'Company ID is required' });
    }

    // Check if union class exists and belongs to this company
    const existingClass = await prisma.unionClass.findUnique({
      where: {
        id: parseInt(classId),
        companyId,
      },
    });

    if (!existingClass) {
      return res.status(404).json({ message: 'Union class not found' });
    }

    // Update base rate
    const updatedRate = await prisma.unionClassBaseRate.update({
      where: {
        id: parseInt(rateId),
        unionClassId: parseInt(classId),
      },
      data: {
        regularRate: parseFloat(regularRate),
        overtimeRate: parseFloat(overtimeRate),
        benefitsRate: parseFloat(benefitsRate),
        effectiveDate: effectiveDate ? new Date(effectiveDate) : undefined,
        endDate: endDate ? new Date(endDate) : undefined,
      },
    });

    return res.status(200).json(updatedRate);
  } catch (error) {
    logger.error(`Error updating union rate ${req.params.rateId}:`, error);
    return res.status(500).json({ message: 'Failed to update union rate' });
  }
};