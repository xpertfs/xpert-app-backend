// src/controllers/timesheet.controller.ts

import { Request, Response } from 'express';
import { PrismaClient, PaymentStatus } from '@prisma/client';
import { startOfWeek, endOfWeek, addDays, format, parseISO } from 'date-fns';
import { google } from 'googleapis';
import { logger } from '../utils/logger';

const prisma = new PrismaClient();

/**
 * Get time entries with filtering
 * 
 * @route GET /api/timesheets
 * @access Private
 */
export const getTimeEntries = async (req: Request, res: Response) => {
  try {
    const {
      employeeId,
      projectId,
      startDate,
      endDate,
      status,
      limit = '100',
      page = '1',
    } = req.query;
    const companyId = req.user?.companyId;

    if (!companyId) {
      return res.status(400).json({ message: 'Company ID is required' });
    }

    // Parse pagination
    const limitNum = parseInt(limit as string, 10);
    const pageNum = parseInt(page as string, 10);
    const skip = (pageNum - 1) * limitNum;

    // Build filters
    const where: any = {
      employee: {
        companyId,
      },
      ...(employeeId ? { employeeId: employeeId as string } : {}),
      ...(projectId ? { projectId: projectId as string } : {}),
      ...(status ? { paymentStatus: status as PaymentStatus } : {}),
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

    // Get time entries with pagination
    const [timeEntries, total] = await Promise.all([
      prisma.timeEntry.findMany({
        where,
        include: {
          employee: {
            select: {
              id: true,
              firstName: true,
              lastName: true,
              code: true,
              type: true,
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
        orderBy: {
          date: 'desc',
        },
        skip,
        take: limitNum,
      }),
      prisma.timeEntry.count({ where }),
    ]);

    return res.status(200).json({
      timeEntries,
      pagination: {
        total,
        page: pageNum,
        limit: limitNum,
        pages: Math.ceil(total / limitNum),
      },
    });
  } catch (error) {
    logger.error('Error getting time entries:', error);
    return res.status(500).json({ message: 'Failed to get time entries' });
  }
};

/**
 * Get weekly timesheets for employees
 * 
 * @route GET /api/timesheets/weekly
 * @access Private
 */
export const getWeeklyTimesheets = async (req: Request, res: Response) => {
  try {
    const { date, employeeId } = req.query;
    const companyId = req.user?.companyId;

    if (!companyId) {
      return res.status(400).json({ message: 'Company ID is required' });
    }

    // Parse date or use current date
    const targetDate = date ? new Date(date as string) : new Date();
    
    // Get start and end of week (Sunday to Saturday)
    const weekStart = startOfWeek(targetDate, { weekStartsOn: 0 });
    const weekEnd = endOfWeek(targetDate, { weekStartsOn: 0 });

    // Build employee filter
    const employeeWhere: any = {
      companyId,
      active: true,
    };

    if (employeeId) {
      employeeWhere.id = employeeId as string;
    }

    // Get employees
    const employees = await prisma.employee.findMany({
      where: employeeWhere,
      select: {
        id: true,
        firstName: true,
        lastName: true,
        code: true,
        type: true,
      },
    });

    // Get all time entries for the week
    const timeEntries = await prisma.timeEntry.findMany({
      where: {
        date: {
          gte: weekStart,
          lte: weekEnd,
        },
        employee: {
          companyId,
          ...(employeeId ? { id: employeeId as string } : {}),
        },
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
    });

    // Create a week structure (Sunday to Saturday)
    const daysOfWeek = Array.from({ length: 7 }, (_, i) => {
      const day = addDays(weekStart, i);
      return {
        date: day,
        dateFormatted: format(day, 'yyyy-MM-dd'),
        dayName: format(day, 'EEEE'),
      };
    });

    // Organize time entries by employee and day
    const weeklyTimesheets = employees.map((employee) => {
      // Get entries for this employee
      const employeeEntries = timeEntries.filter(
        (entry) => entry.employeeId === employee.id
      );

      // Create daily entries
      const dailyEntries = daysOfWeek.map((day) => {
        // Find entries for this day
        const dayEntries = employeeEntries.filter(
          (entry) => format(entry.date, 'yyyy-MM-dd') === day.dateFormatted
        );

        // Calculate totals
        const regularHours = dayEntries.reduce(
          (sum, entry) => sum + Number(entry.regularHours || 0),
          0
        );
        const overtimeHours = dayEntries.reduce(
          (sum, entry) => sum + Number(entry.overtimeHours || 0),
          0
        );
        const doubleHours = dayEntries.reduce(
          (sum, entry) => sum + Number(entry.doubleHours || 0),
          0
        );
        const totalHours = regularHours + overtimeHours + doubleHours;

        return {
          ...day,
          entries: dayEntries,
          totals: {
            regularHours,
            overtimeHours,
            doubleHours,
            totalHours,
          },
        };
      });

      // Calculate week totals
      const weekTotals = {
        regularHours: dailyEntries.reduce(
          (sum, day) => sum + day.totals.regularHours,
          0
        ),
        overtimeHours: dailyEntries.reduce(
          (sum, day) => sum + day.totals.overtimeHours,
          0
        ),
        doubleHours: dailyEntries.reduce(
          (sum, day) => sum + day.totals.doubleHours,
          0
        ),
        totalHours: dailyEntries.reduce(
          (sum, day) => sum + day.totals.totalHours,
          0
        ),
      };

      return {
        employee,
        weekStart: format(weekStart, 'yyyy-MM-dd'),
        weekEnd: format(weekEnd, 'yyyy-MM-dd'),
        days: dailyEntries,
        totals: weekTotals,
      };
    });

    return res.status(200).json(weeklyTimesheets);
  } catch (error) {
    logger.error('Error getting weekly timesheets:', error);
    return res.status(500).json({ message: 'Failed to get weekly timesheets' });
  }
};

/**
 * Create a new time entry
 * 
 * @route POST /api/timesheets
 * @access Private
 */
export const createTimeEntry = async (req: Request, res: Response) => {
  try {
    const {
      employeeId,
      date,
      regularHours,
      overtimeHours,
      doubleHours,
      projectId,
      notes,
    } = req.body;
    const companyId = req.user?.companyId;

    if (!companyId) {
      return res.status(400).json({ message: 'Company ID is required' });
    }

    // Check if employee exists and belongs to the company
    const employee = await prisma.employee.findFirst({
      where: {
        id: employeeId,
        companyId,
      },
    });

    if (!employee) {
      return res.status(404).json({ message: 'Employee not found' });
    }

    // Check if project exists and belongs to the company if projectId is provided
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

    // Create time entry
    const timeEntry = await prisma.timeEntry.create({
      data: {
        employeeId,
        date: new Date(date),
        regularHours: regularHours || 0,
        overtimeHours: overtimeHours || 0,
        doubleHours: doubleHours || 0,
        projectId,
        notes,
        paymentStatus: 'PENDING',
      },
      include: {
        employee: {
          select: {
            id: true,
            firstName: true,
            lastName: true,
            code: true,
            type: true,
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

    return res.status(201).json(timeEntry);
  } catch (error) {
    logger.error('Error creating time entry:', error);
    return res.status(500).json({ message: 'Failed to create time entry' });
  }
};

/**
 * Update a time entry
 * 
 * @route PUT /api/timesheets/:id
 * @access Private
 */
export const updateTimeEntry = async (req: Request, res: Response) => {
  try {
    const { id } = req.params;
    const {
      date,
      regularHours,
      overtimeHours,
      doubleHours,
      projectId,
      notes,
      paymentStatus,
    } = req.body;
    const companyId = req.user?.companyId;

    if (!companyId) {
      return res.status(400).json({ message: 'Company ID is required' });
    }

    // Check if time entry exists and belongs to the company
    const existingEntry = await prisma.timeEntry.findFirst({
      where: {
        id,
        employee: {
          companyId,
        },
      },
    });

    if (!existingEntry) {
      return res.status(404).json({ message: 'Time entry not found' });
    }

    // Check if entry is already paid
    if (
      existingEntry.paymentStatus === 'PAID' &&
      (!paymentStatus || paymentStatus !== 'PAID')
    ) {
      return res.status(400).json({
        message: 'Cannot modify paid time entries. Create a new entry instead.',
      });
    }

    // Check if project exists and belongs to the company if projectId is provided
    if (projectId && projectId !== existingEntry.projectId) {
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

    // Update time entry
    const updatedEntry = await prisma.timeEntry.update({
      where: {
        id,
      },
      data: {
        date: date ? new Date(date) : undefined,
        regularHours:
          regularHours !== undefined ? regularHours : undefined,
        overtimeHours:
          overtimeHours !== undefined ? overtimeHours : undefined,
        doubleHours:
          doubleHours !== undefined ? doubleHours : undefined,
        projectId,
        notes,
        paymentStatus,
      },
      include: {
        employee: {
          select: {
            id: true,
            firstName: true,
            lastName: true,
            code: true,
            type: true,
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

    return res.status(200).json(updatedEntry);
  } catch (error) {
    logger.error(`Error updating time entry ${req.params.id}:`, error);
    return res.status(500).json({ message: 'Failed to update time entry' });
  }
};

/**
 * Delete a time entry
 * 
 * @route DELETE /api/timesheets/:id
 * @access Private
 */
export const deleteTimeEntry = async (req: Request, res: Response) => {
  try {
    const { id } = req.params;
    const companyId = req.user?.companyId;

    if (!companyId) {
      return res.status(400).json({ message: 'Company ID is required' });
    }

    // Check if time entry exists and belongs to the company
    const existingEntry = await prisma.timeEntry.findFirst({
      where: {
        id,
        employee: {
          companyId,
        },
      },
    });

    if (!existingEntry) {
      return res.status(404).json({ message: 'Time entry not found' });
    }

    // Check if entry is already paid
    if (existingEntry.paymentStatus === 'PAID') {
      return res.status(400).json({
        message: 'Cannot delete paid time entries',
      });
    }

    // Delete time entry
    await prisma.timeEntry.delete({
      where: {
        id,
      },
    });

    return res.status(200).json({ message: 'Time entry deleted successfully' });
  } catch (error) {
    logger.error(`Error deleting time entry ${req.params.id}:`, error);
    return res.status(500).json({ message: 'Failed to delete time entry' });
  }
};

/**
 * Approve multiple time entries
 * 
 * @route POST /api/timesheets/approve
 * @access Private
 */
export const approveTimeEntries = async (req: Request, res: Response) => {
  try {
    const { timeEntryIds } = req.body;
    const companyId = req.user?.companyId;

    if (!companyId) {
      return res.status(400).json({ message: 'Company ID is required' });
    }

    if (!timeEntryIds || !Array.isArray(timeEntryIds) || timeEntryIds.length === 0) {
      return res.status(400).json({ message: 'Time entry IDs are required' });
    }

    // Update all specified time entries to APPROVED status
    const result = await prisma.timeEntry.updateMany({
      where: {
        id: {
          in: timeEntryIds,
        },
        employee: {
          companyId,
        },
        paymentStatus: 'PENDING', // Only pending entries can be approved
      },
      data: {
        paymentStatus: 'APPROVED',
      },
    });

    return res.status(200).json({
      message: 'Time entries approved successfully',
      updatedCount: result.count,
    });
  } catch (error) {
    logger.error('Error approving time entries:', error);
    return res.status(500).json({ message: 'Failed to approve time entries' });
  }
};

/**
 * Process payment for time entries
 * 
 * @route POST /api/timesheets/payments
 * @access Private
 */
export const processPayment = async (req: Request, res: Response) => {
  try {
    const { employeeId, timeEntryIds, paymentDate, reference, notes, deductions } = req.body;
    const companyId = req.user?.companyId;

    if (!companyId) {
      return res.status(400).json({ message: 'Company ID is required' });
    }

    // Check if employee exists and belongs to the company
    const employee = await prisma.employee.findFirst({
      where: {
        id: employeeId,
        companyId,
      },
      include: {
        unionClass: {
          include: {
            baseRates: {
              where: {
                effectiveDate: {
                  lte: new Date(paymentDate),
                },
                OR: [
                  {
                    endDate: null,
                  },
                  {
                    endDate: {
                      gte: new Date(paymentDate),
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

    if (!employee) {
      return res.status(404).json({ message: 'Employee not found' });
    }

    // Process payment in a transaction
    const result = await prisma.$transaction(async (tx) => {
      // Get time entries to be paid
      const timeEntries = await tx.timeEntry.findMany({
        where: {
          id: {
            in: timeEntryIds,
          },
          employeeId,
          paymentStatus: 'APPROVED', // Only approved entries can be paid
        },
      });

      if (timeEntries.length === 0) {
        throw new Error('No approved time entries found for payment');
      }

      // Calculate payment amounts
      let hourlyRate = 0;

      if (employee.type === 'LOCAL') {
        hourlyRate = Number(employee.rate) || 0;
      } else if (
        employee.type === 'UNION' &&
        employee.unionClass?.baseRates[0]
      ) {
        hourlyRate = Number(employee.unionClass.baseRates[0].rate) || 0;
      }

      const regularHours = timeEntries.reduce(
        (sum, entry) => sum + Number(entry.regularHours || 0),
        0
      );
      const overtimeHours = timeEntries.reduce(
        (sum, entry) => sum + Number(entry.overtimeHours || 0),
        0
      );
      const doubleHours = timeEntries.reduce(
        (sum, entry) => sum + Number(entry.doubleHours || 0),
        0
      );

      const regularAmount = regularHours * hourlyRate;
      const overtimeAmount = overtimeHours * hourlyRate * 1.5;
      const doubleAmount = doubleHours * hourlyRate * 2;
      const deductionsAmount = Number(deductions) || 0;
      const totalAmount = regularAmount + overtimeAmount + doubleAmount - deductionsAmount;

      // Create payment record
      const payment = await tx.payment.create({
        data: {
          employeeId,
          paymentDate: new Date(paymentDate),
          regularAmount,
          overtimeAmount,
          doubleAmount,
          deductions: deductionsAmount,
          totalAmount,
          status: 'PAID',
          reference,
          notes,
        },
      });

      // Update time entries to link them to the payment and mark as paid
      await tx.timeEntry.updateMany({
        where: {
          id: {
            in: timeEntryIds,
          },
        },
        data: {
          paymentId: payment.id,
          paymentStatus: 'PAID',
        },
      });

      return {
        payment,
        timeEntriesProcessed: timeEntries.length,
        regularHours,
        overtimeHours,
        doubleHours,
        totalHours: regularHours + overtimeHours + doubleHours,
      };
    });

    return res.status(200).json({
      message: 'Payment processed successfully',
      ...result,
    });
  } catch (error) {
    logger.error('Error processing payment:', error);
    return res.status(500).json({
      message: error instanceof Error ? error.message : 'Failed to process payment',
    });
  }
};

/**
 * Get all payments
 * 
 * @route GET /api/timesheets/payments
 * @access Private
 */
export const getPayments = async (req: Request, res: Response) => {
  try {
    const {
      employeeId,
      startDate,
      endDate,
      limit = '100',
      page = '1',
    } = req.query;
    const companyId = req.user?.companyId;

    if (!companyId) {
      return res.status(400).json({ message: 'Company ID is required' });
    }

    // Parse pagination
    const limitNum = parseInt(limit as string, 10);
    const pageNum = parseInt(page as string, 10);
    const skip = (pageNum - 1) * limitNum;

    // Build filters
    const where: any = {
      employee: {
        companyId,
      },
      ...(employeeId ? { employeeId: employeeId as string } : {}),
    };

    // Add date range filter if provided
    if (startDate || endDate) {
      where.paymentDate = {};
      if (startDate) {
        where.paymentDate.gte = new Date(startDate as string);
      }
      if (endDate) {
        where.paymentDate.lte = new Date(endDate as string);
      }
    }

    // Get payments with pagination
    const [payments, total] = await Promise.all([
      prisma.payment.findMany({
        where,
        include: {
          employee: {
            select: {
              id: true,
              firstName: true,
              lastName: true,
              code: true,
              type: true,
            },
          },
          timeEntries: {
            select: {
              id: true,
              date: true,
              regularHours: true,
              overtimeHours: true,
              doubleHours: true,
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
        orderBy: {
          paymentDate: 'desc',
        },
        skip,
        take: limitNum,
      }),
      prisma.payment.count({ where }),
    ]);

    return res.status(200).json({
      payments,
      pagination: {
        total,
        page: pageNum,
        limit: limitNum,
        pages: Math.ceil(total / limitNum),
      },
    });
  } catch (error) {
    logger.error('Error getting payments:', error);
    return res.status(500).json({ message: 'Failed to get payments' });
  }
};

/**
 * Get payment by ID
 * 
 * @route GET /api/timesheets/payments/:id
 * @access Private
 */
export const getPaymentById = async (req: Request, res: Response) => {
  try {
    const { id } = req.params;
    const companyId = req.user?.companyId;

    if (!companyId) {
      return res.status(400).json({ message: 'Company ID is required' });
    }

    // Get payment with related data
    const payment = await prisma.payment.findFirst({
      where: {
        id,
        employee: {
          companyId,
        },
      },
      include: {
        employee: {
          select: {
            id: true,
            firstName: true,
            lastName: true,
            code: true,
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
        timeEntries: {
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
      },
    });

    if (!payment) {
      return res.status(404).json({ message: 'Payment not found' });
    }

    return res.status(200).json(payment);
  } catch (error) {
    logger.error(`Error getting payment ${req.params.id}:`, error);
    return res.status(500).json({ message: 'Failed to get payment' });
  }
};

/**
 * Get Google Sheet connections
 * 
 * @route GET /api/timesheets/sheet-connections
 * @access Private
 */
export const getSheetConnections = async (req: Request, res: Response) => {
  try {
    const { projectId } = req.query;
    const companyId = req.user?.companyId;

    if (!companyId) {
      return res.status(400).json({ message: 'Company ID is required' });
    }

    // Build filters
    const where: any = {
      project: {
        companyId,
      },
      ...(projectId ? { projectId: projectId as string } : {}),
    };

    // Get sheet connections
    const connections = await prisma.sheetConnection.findMany({
      where,
      include: {
        project: {
          select: {
            id: true,
            name: true,
            code: true,
          },
        },
        syncLogs: {
          orderBy: {
            syncDate: 'desc',
          },
          take: 5,
        },
      },
      orderBy: {
        updatedAt: 'desc',
      },
    });

    return res.status(200).json(connections);
  } catch (error) {
    logger.error('Error getting sheet connections:', error);
    return res.status(500).json({ message: 'Failed to get sheet connections' });
  }
};

/**
 * Create a Google Sheet connection
 * 
 * @route POST /api/timesheets/sheet-connections
 * @access Private
 */
export const createSheetConnection = async (req: Request, res: Response) => {
  try {
    const { projectId, sheetId, sheetName, active = true } = req.body;
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

    // Check if connection already exists for this project
    const existingConnection = await prisma.sheetConnection.findUnique({
      where: {
        projectId,
      },
    });

    if (existingConnection) {
      return res.status(409).json({
        message: 'Sheet connection already exists for this project',
      });
    }

    // Create sheet connection
    const connection = await prisma.sheetConnection.create({
      data: {
        projectId,
        sheetId,
        sheetName,
        active,
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
    });

    return res.status(201).json(connection);
  } catch (error) {
    logger.error('Error creating sheet connection:', error);
    return res.status(500).json({ message: 'Failed to create sheet connection' });
  }
};

/**
 * Update a Google Sheet connection
 * 
 * @route PUT /api/timesheets/sheet-connections/:id
 * @access Private
 */
export const updateSheetConnection = async (req: Request, res: Response) => {
  try {
    const { id } = req.params;
    const { sheetId, sheetName, active } = req.body;
    const companyId = req.user?.companyId;

    if (!companyId) {
      return res.status(400).json({ message: 'Company ID is required' });
    }

    // Check if connection exists and belongs to the company
    const existingConnection = await prisma.sheetConnection.findFirst({
      where: {
        id,
        project: {
          companyId,
        },
      },
    });

    if (!existingConnection) {
      return res.status(404).json({ message: 'Sheet connection not found' });
    }

    // Update sheet connection
    const connection = await prisma.sheetConnection.update({
      where: {
        id,
      },
      data: {
        sheetId,
        sheetName,
        active,
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
    });

    return res.status(200).json(connection);
  } catch (error) {
    logger.error(`Error updating sheet connection ${req.params.id}:`, error);
    return res.status(500).json({ message: 'Failed to update sheet connection' });
  }
};

/**
 * Sync time entries from Google Sheet
 * 
 * @route POST /api/timesheets/sync/:connectionId
 * @access Private
 */
export const syncGoogleSheet = async (req: Request, res: Response) => {
  try {
    const { connectionId } = req.params;
    const companyId = req.user?.companyId;

    if (!companyId) {
      return res.status(400).json({ message: 'Company ID is required' });
    }

    // Check if connection exists and belongs to the company
    const connection = await prisma.sheetConnection.findFirst({
      where: {
        id: connectionId,
        project: {
          companyId,
        },
      },
      include: {
        project: true,
      },
    });

    if (!connection) {
      return res.status(404).json({ message: 'Sheet connection not found' });
    }

    if (!connection.active) {
      return res.status(400).json({ message: 'Sheet connection is not active' });
    }

    // In a real implementation, this would connect to Google Sheets API
    // For this example, we'll simulate a successful sync
    
    // Create a sync log
    const syncLog = await prisma.syncLog.create({
      data: {
        sheetConnectionId: connectionId,
        status: 'SUCCESS',
        recordsProcessed: 10,
        recordsSuccessful: 10,
        recordsFailed: 0,
      },
    });

    // Update last sync date
    await prisma.sheetConnection.update({
      where: {
        id: connectionId,
      },
      data: {
        lastSyncDate: new Date(),
      },
    });

    return res.status(200).json({
      message: 'Sheet sync completed successfully',
      syncLog,
    });
  } catch (error) {
    logger.error(`Error syncing sheet ${req.params.connectionId}:`, error);
    
    // Create error sync log
    try {
      await prisma.syncLog.create({
        data: {
          sheetConnectionId: req.params.connectionId,
          status: 'FAILED',
          recordsProcessed: 0,
          recordsSuccessful: 0,
          recordsFailed: 0,
          errorMessage: error instanceof Error ? error.message : 'Unknown error',
        },
      });
    } catch (logError) {
      logger.error('Failed to create sync error log:', logError);
    }

    return res.status(500).json({ message: 'Failed to sync sheet' });
  }
};