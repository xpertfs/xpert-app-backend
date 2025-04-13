// src/controllers/report.controller.ts

import { Request, Response } from 'express';
import { PrismaClient } from '@prisma/client';
import { startOfMonth, endOfMonth, subMonths, format } from 'date-fns';
import { logger } from '../utils/logger';

const prisma = new PrismaClient();

/**
 * Get project financial summary
 * 
 * @route GET /api/reports/project/:projectId/financial
 * @access Private
 */
export const getProjectFinancialSummary = async (req: Request, res: Response) => {
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
      select: {
        id: true,
        name: true,
        code: true,
        value: true,
        status: true,
      },
    });

    if (!project) {
      return res.status(404).json({ message: 'Project not found' });
    }

    // Get all expenses for this project
    const expenses = await prisma.expense.findMany({
      where: {
        projectId,
      },
      select: {
        id: true,
        amount: true,
        category: true,
        date: true,
      },
    });

    // Get all time entries for this project
    const timeEntries = await prisma.timeEntry.findMany({
      where: {
        projectId,
      },
      select: {
        id: true,
        date: true,
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
    });

    // Calculate labor cost by employee type
    const laborCostByType = {
      LOCAL: 0,
      UNION: 0,
    };

    timeEntries.forEach((entry) => {
      const { employee } = entry;
      let hourlyRate = 0;

      if (employee.type === 'LOCAL') {
        hourlyRate = Number(employee.rate) || 0;
        const cost = calculateEntryCost(entry, hourlyRate);
        laborCostByType.LOCAL += cost;
      } else if (employee.type === 'UNION' && employee.unionClass?.baseRates[0]) {
        hourlyRate = Number(employee.unionClass.baseRates[0].rate) || 0;
        const cost = calculateEntryCost(entry, hourlyRate);
        laborCostByType.UNION += cost;
      }
    });

    // Calculate expense cost by category
    const expenseCostByCategory: Record<string, number> = {};
    expenses.forEach((expense) => {
      const category = expense.category;
      if (!expenseCostByCategory[category]) {
        expenseCostByCategory[category] = 0;
      }
      expenseCostByCategory[category] += Number(expense.amount);
    });

    // Calculate project completion percentage
    const completedValue = await calculateCompletedValue(projectId);
    const contractValue = Number(project.value);
    const completionPercentage = contractValue > 0 ? (completedValue / contractValue) * 100 : 0;

    // Calculate total costs and profit
    const totalLaborCost = Object.values(laborCostByType).reduce((sum, cost) => sum + cost, 0);
    const totalExpenseCost = Object.values(expenseCostByCategory).reduce((sum, cost) => sum + cost, 0);
    const totalCost = totalLaborCost + totalExpenseCost;
    const profit = completedValue - totalCost;
    const profitMargin = completedValue > 0 ? (profit / completedValue) * 100 : 0;

    // Prepare summary object
    const financialSummary = {
      project: {
        id: project.id,
        name: project.name,
        code: project.code,
        status: project.status,
      },
      contractValue,
      completedValue,
      completionPercentage,
      costs: {
        labor: {
          total: totalLaborCost,
          byType: laborCostByType,
        },
        expenses: {
          total: totalExpenseCost,
          byCategory: expenseCostByCategory,
        },
        total: totalCost,
      },
      profit,
      profitMargin,
    };

    return res.status(200).json(financialSummary);
  } catch (error) {
    logger.error(`Error getting financial summary for project ${req.params.projectId}:`, error);
    return res.status(500).json({ message: 'Failed to get project financial summary' });
  }
};

/**
 * Get labor cost breakdown for a project
 * 
 * @route GET /api/reports/project/:projectId/labor
 * @access Private
 */
export const getLaborCostBreakdown = async (req: Request, res: Response) => {
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

    // Get all time entries for this project
    const timeEntries = await prisma.timeEntry.findMany({
      where: {
        projectId,
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
                customRates: true,
              },
            },
          },
        },
      },
      orderBy: {
        date: 'asc',
      },
    });

    // Process time entries by employee and month
    const employeeCosts: Record<string, any> = {};
    const monthlyCosts: Record<string, number> = {};

    timeEntries.forEach((entry) => {
      const { employee, date } = entry;
      const monthKey = format(new Date(date), 'yyyy-MM');
      let hourlyRate = 0;

      // Determine hourly rate
      if (employee.type === 'LOCAL') {
        hourlyRate = Number(employee.rate) || 0;
      } else if (employee.type === 'UNION' && employee.unionClass?.baseRates[0]) {
        hourlyRate = Number(employee.unionClass.baseRates[0].rate) || 0;
      }

      // Calculate cost for this entry
      const cost = calculateEntryCost(entry, hourlyRate);

      // Add to employee costs
      if (!employeeCosts[employee.id]) {
        employeeCosts[employee.id] = {
          employee: {
            id: employee.id,
            name: `${employee.firstName} ${employee.lastName}`,
            code: employee.code,
            type: employee.type,
          },
          regularHours: 0,
          overtimeHours: 0,
          doubleHours: 0,
          totalHours: 0,
          totalCost: 0,
        };
      }

      employeeCosts[employee.id].regularHours += Number(entry.regularHours) || 0;
      employeeCosts[employee.id].overtimeHours += Number(entry.overtimeHours) || 0;
      employeeCosts[employee.id].doubleHours += Number(entry.doubleHours) || 0;
      employeeCosts[employee.id].totalHours +=
        (Number(entry.regularHours) || 0) +
        (Number(entry.overtimeHours) || 0) +
        (Number(entry.doubleHours) || 0);
      employeeCosts[employee.id].totalCost += cost;

      // Add to monthly costs
      if (!monthlyCosts[monthKey]) {
        monthlyCosts[monthKey] = 0;
      }
      monthlyCosts[monthKey] += cost;
    });

    // Convert to arrays and sort
    const employeeCostsArray = Object.values(employeeCosts).sort((a, b) => b.totalCost - a.totalCost);
    const monthlyCostsArray = Object.entries(monthlyCosts)
      .map(([month, cost]) => ({ month, cost }))
      .sort((a, b) => a.month.localeCompare(b.month));

    // Calculate totals
    const totalRegularHours = employeeCostsArray.reduce((sum, e) => sum + e.regularHours, 0);
    const totalOvertimeHours = employeeCostsArray.reduce((sum, e) => sum + e.overtimeHours, 0);
    const totalDoubleHours = employeeCostsArray.reduce((sum, e) => sum + e.doubleHours, 0);
    const totalHours = totalRegularHours + totalOvertimeHours + totalDoubleHours;
    const totalCost = employeeCostsArray.reduce((sum, e) => sum + e.totalCost, 0);

    // Prepare response
    const laborBreakdown = {
      project: {
        id: project.id,
        name: project.name,
        code: project.code,
      },
      summary: {
        totalRegularHours,
        totalOvertimeHours,
        totalDoubleHours,
        totalHours,
        totalCost,
      },
      employeeCosts: employeeCostsArray,
      monthlyCosts: monthlyCostsArray,
    };

    return res.status(200).json(laborBreakdown);
  } catch (error) {
    logger.error(`Error getting labor breakdown for project ${req.params.projectId}:`, error);
    return res.status(500).json({ message: 'Failed to get labor cost breakdown' });
  }
};

/**
 * Get expense breakdown for a project
 * 
 * @route GET /api/reports/project/:projectId/expenses
 * @access Private
 */
export const getExpenseBreakdown = async (req: Request, res: Response) => {
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

    // Get all expenses for this project
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

    // Process expenses by category and vendor
    const expensesByCategory: Record<string, any> = {};
    const expensesByVendor: Record<string, any> = {};
    const monthlyExpenses: Record<string, number> = {};

    expenses.forEach((expense) => {
      const category = expense.category;
      const vendorId = expense.vendorId || 'unknown';
      const monthKey = format(new Date(expense.date), 'yyyy-MM');
      const amount = Number(expense.amount);

      // Add to category expenses
      if (!expensesByCategory[category]) {
        expensesByCategory[category] = {
          category,
          count: 0,
          totalAmount: 0,
        };
      }
      expensesByCategory[category].count += 1;
      expensesByCategory[category].totalAmount += amount;

      // Add to vendor expenses
      if (expense.vendorId) {
        if (!expensesByVendor[vendorId]) {
          expensesByVendor[vendorId] = {
            vendor: expense.vendor,
            count: 0,
            totalAmount: 0,
          };
        }
        expensesByVendor[vendorId].count += 1;
        expensesByVendor[vendorId].totalAmount += amount;
      }

      // Add to monthly expenses
      if (!monthlyExpenses[monthKey]) {
        monthlyExpenses[monthKey] = 0;
      }
      monthlyExpenses[monthKey] += amount;
    });

    // Convert to arrays and sort
    const categoriesArray = Object.values(expensesByCategory).sort(
      (a, b) => b.totalAmount - a.totalAmount
    );
    const vendorsArray = Object.values(expensesByVendor).sort(
      (a, b) => b.totalAmount - a.totalAmount
    );
    const monthlyArray = Object.entries(monthlyExpenses)
      .map(([month, amount]) => ({ month, amount }))
      .sort((a, b) => a.month.localeCompare(b.month));

    // Calculate total
    const totalAmount = expenses.reduce((sum, expense) => sum + Number(expense.amount), 0);

    // Prepare response
    const expenseBreakdown = {
      project: {
        id: project.id,
        name: project.name,
        code: project.code,
      },
      summary: {
        totalExpenses: expenses.length,
        totalAmount,
      },
      byCategory: categoriesArray,
      byVendor: vendorsArray,
      byMonth: monthlyArray,
      recentExpenses: expenses.slice(0, 10).map((expense) => ({
        id: expense.id,
        date: expense.date,
        description: expense.description,
        category: expense.category,
        amount: expense.amount,
        vendor: expense.vendor,
      })),
    };

    return res.status(200).json(expenseBreakdown);
  } catch (error) {
    logger.error(`Error getting expense breakdown for project ${req.params.projectId}:`, error);
    return res.status(500).json({ message: 'Failed to get expense breakdown' });
  }
};

/**
 * Get monthly trends report
 * 
 * @route GET /api/reports/trends/monthly
 * @access Private
 */
export const getMonthlyTrends = async (req: Request, res: Response) => {
  try {
    const { months = '12' } = req.query;
    const companyId = req.user?.companyId;

    if (!companyId) {
      return res.status(400).json({ message: 'Company ID is required' });
    }

    // Parse number of months to include
    const numMonths = parseInt(months as string, 10) || 12;
    
    // Generate array of month ranges
    const monthRanges = [];
    const currentDate = new Date();
    
    for (let i = 0; i < numMonths; i++) {
      const date = subMonths(currentDate, i);
      const start = startOfMonth(date);
      const end = endOfMonth(date);
      const monthKey = format(date, 'yyyy-MM');
      
      monthRanges.push({
        key: monthKey,
        name: format(date, 'MMMM yyyy'),
        start,
        end,
      });
    }
    
    // Reverse so months are in chronological order
    monthRanges.reverse();

    // Get expenses, time entries, and completed projects for each month
    const monthlyData = await Promise.all(
      monthRanges.map(async (month) => {
        // Get expenses for this month
        const expenses = await prisma.expense.findMany({
          where: {
            date: {
              gte: month.start,
              lte: month.end,
            },
            company: {
              id: companyId,
            },
          },
          select: {
            amount: true,
            category: true,
          },
        });

        // Get time entries for this month
        const timeEntries = await prisma.timeEntry.findMany({
          where: {
            date: {
              gte: month.start,
              lte: month.end,
            },
            employee: {
              companyId,
            },
          },
          include: {
            employee: {
              select: {
                type: true,
                rate: true,
                unionClass: {
                  include: {
                    baseRates: {
                      where: {
                        effectiveDate: {
                          lte: month.end,
                        },
                        OR: [
                          {
                            endDate: null,
                          },
                          {
                            endDate: {
                              gte: month.start,
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
        });

        // Get projects completed this month
        const completedProjects = await prisma.project.findMany({
          where: {
            companyId,
            status: 'COMPLETED',
            updatedAt: {
              gte: month.start,
              lte: month.end,
            },
          },
          select: {
            id: true,
            name: true,
            value: true,
          },
        });

        // Calculate expense total by category
        const expensesByCategory: Record<string, number> = {};
        let totalExpenses = 0;
        
        expenses.forEach((expense) => {
          const category = expense.category;
          const amount = Number(expense.amount);
          
          if (!expensesByCategory[category]) {
            expensesByCategory[category] = 0;
          }
          
          expensesByCategory[category] += amount;
          totalExpenses += amount;
        });

        // Calculate labor costs
        let totalLaborCost = 0;
        let laborHours = 0;
        
        timeEntries.forEach((entry) => {
          const { employee } = entry;
          let hourlyRate = 0;

          if (employee.type === 'LOCAL') {
            hourlyRate = Number(employee.rate) || 0;
          } else if (employee.type === 'UNION' && employee.unionClass?.baseRates[0]) {
            hourlyRate = Number(employee.unionClass.baseRates[0].rate) || 0;
          }

          const cost = calculateEntryCost(entry, hourlyRate);
          totalLaborCost += cost;
          
          laborHours +=
            (Number(entry.regularHours) || 0) +
            (Number(entry.overtimeHours) || 0) +
            (Number(entry.doubleHours) || 0);
        });

        // Calculate project completion value
        const projectValue = completedProjects.reduce(
          (sum, project) => sum + Number(project.value),
          0
        );

        return {
          month: month.key,
          name: month.name,
          expenses: {
            total: totalExpenses,
            byCategory: expensesByCategory,
          },
          labor: {
            cost: totalLaborCost,
            hours: laborHours,
          },
          projects: {
            completed: completedProjects.length,
            value: projectValue,
          },
          totalCost: totalExpenses + totalLaborCost,
        };
      })
    );

    return res.status(200).json(monthlyData);
  } catch (error) {
    logger.error('Error getting monthly trends:', error);
    return res.status(500).json({ message: 'Failed to get monthly trends' });
  }
};

/**
 * Get profit analysis for a project
 * 
 * @route GET /api/reports/project/:projectId/profit
 * @access Private
 */
export const getProfitAnalysis = async (req: Request, res: Response) => {
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
      select: {
        id: true,
        name: true,
        code: true,
        value: true,
        status: true,
      },
    });

    if (!project) {
      return res.status(404).json({ message: 'Project not found' });
    }

    // Get completed value for this project
    const completedValue = await calculateCompletedValue(projectId);
    const contractValue = Number(project.value);
    const completionPercentage = contractValue > 0 ? (completedValue / contractValue) * 100 : 0;

    // Get all expenses for this project grouped by month
    const expenses = await prisma.expense.findMany({
      where: {
        projectId,
      },
      select: {
        id: true,
        amount: true,
        category: true,
        date: true,
      },
      orderBy: {
        date: 'asc',
      },
    });

    // Get all time entries for this project grouped by month
    const timeEntries = await prisma.timeEntry.findMany({
      where: {
        projectId,
      },
      select: {
        id: true,
        date: true,
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
      orderBy: {
        date: 'asc',
      },
    });

    // Organize data by month
    const monthlyData: Record<string, any> = {};

    // Process expenses
    expenses.forEach((expense) => {
      const monthKey = format(new Date(expense.date), 'yyyy-MM');
      if (!monthlyData[monthKey]) {
        monthlyData[monthKey] = {
          month: monthKey,
          name: format(new Date(expense.date), 'MMMM yyyy'),
          expenseCost: 0,
          laborCost: 0,
          totalCost: 0,
        };
      }
      monthlyData[monthKey].expenseCost += Number(expense.amount);
    });

    // Process time entries
    timeEntries.forEach((entry) => {
      const monthKey = format(new Date(entry.date), 'yyyy-MM');
      if (!monthlyData[monthKey]) {
        monthlyData[monthKey] = {
          month: monthKey,
          name: format(new Date(entry.date), 'MMMM yyyy'),
          expenseCost: 0,
          laborCost: 0,
          totalCost: 0,
        };
      }

      const { employee } = entry;
      let hourlyRate = 0;

      if (employee.type === 'LOCAL') {
        hourlyRate = Number(employee.rate) || 0;
      } else if (employee.type === 'UNION' && employee.unionClass?.baseRates[0]) {
        hourlyRate = Number(employee.unionClass.baseRates[0].rate) || 0;
      }

      const cost = calculateEntryCost(entry, hourlyRate);
      monthlyData[monthKey].laborCost += cost;
    });

    // Calculate total cost and cumulative cost
    let cumulativeCost = 0;
    const monthlyDataArray = Object.values(monthlyData)
      .map((month: any) => {
        month.totalCost = month.expenseCost + month.laborCost;
        cumulativeCost += month.totalCost;
        month.cumulativeCost = cumulativeCost;
        return month;
      })
      .sort((a: any, b: any) => a.month.localeCompare(b.month));

    // Calculate profit metrics
    const totalLaborCost = monthlyDataArray.reduce((sum, month: any) => sum + month.laborCost, 0);
    const totalExpenseCost = monthlyDataArray.reduce((sum, month: any) => sum + month.expenseCost, 0);
    const totalCost = totalLaborCost + totalExpenseCost;
    
    const actualProfit = completedValue - totalCost;
    const actualProfitMargin = completedValue > 0 ? (actualProfit / completedValue) * 100 : 0;
    
    const projectedProfit = contractValue - (totalCost / (completionPercentage / 100));
    const projectedProfitMargin = contractValue > 0 ? (projectedProfit / contractValue) * 100 : 0;

    // Prepare response
    const profitAnalysis = {
      project: {
        id: project.id,
        name: project.name,
        code: project.code,
        status: project.status,
      },
      contractValue,
      completedValue,
      completionPercentage,
      costs: {
        labor: totalLaborCost,
        expenses: totalExpenseCost,
        total: totalCost,
      },
      profit: {
        actual: actualProfit,
        actualMargin: actualProfitMargin,
        projected: projectedProfit,
        projectedMargin: projectedProfitMargin,
      },
      monthlyData: monthlyDataArray,
    };

    return res.status(200).json(profitAnalysis);
  } catch (error) {
    logger.error(`Error getting profit analysis for project ${req.params.projectId}:`, error);
    return res.status(500).json({ message: 'Failed to get profit analysis' });
  }
};

/**
 * Get completion report for a project
 * 
 * @route GET /api/reports/project/:projectId/completion
 * @access Private
 */
export const getCompletionReport = async (req: Request, res: Response) => {
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
      include: {
        client: true,
      },
    });

    if (!project) {
      return res.status(404).json({ message: 'Project not found' });
    }

    // Get all scopes with sub-scopes for this project
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

    // Calculate completion metrics for each scope
    const scopesWithCompletion = scopes.map((scope) => {
      let scopeTotalQuantity = 0;
      let scopeCompletedQuantity = 0;
      
      // Calculate completion for each sub-scope
      const subScopesWithCompletion = scope.subScopes.map((subScope) => {
        let subScopeTotalQuantity = 0;
        let subScopeCompletedQuantity = 0;
        
        // Calculate work item completions
        const workItems = subScope.workItemQuantities.map((wiq) => {
          const total = Number(wiq.quantity);
          const completed = Number(wiq.completed);
          const completion = total > 0 ? (completed / total) * 100 : 0;
          
          subScopeTotalQuantity += total;
          subScopeCompletedQuantity += completed;
          
          return {
            id: wiq.workItemId,
            code: wiq.workItem.code,
            name: wiq.workItem.name,
            unit: wiq.workItem.unit,
            quantity: total,
            completed,
            completion,
          };
        });
        
        scopeTotalQuantity += subScopeTotalQuantity;
        scopeCompletedQuantity += subScopeCompletedQuantity;
        
        return {
          id: subScope.id,
          code: subScope.code,
          name: subScope.name,
          percentComplete: Number(subScope.percentComplete),
          totalQuantity: subScopeTotalQuantity,
          completedQuantity: subScopeCompletedQuantity,
          completion: subScopeTotalQuantity > 0 
            ? (subScopeCompletedQuantity / subScopeTotalQuantity) * 100 
            : 0,
          workItems,
        };
      });
      
      return {
        id: scope.id,
        code: scope.code,
        name: scope.name,
        totalQuantity: scopeTotalQuantity,
        completedQuantity: scopeCompletedQuantity,
        completion: scopeTotalQuantity > 0 
          ? (scopeCompletedQuantity / scopeTotalQuantity) * 100 
          : 0,
        subScopes: subScopesWithCompletion,
      };
    });

    // Calculate overall project completion
    const totalQuantity = scopesWithCompletion.reduce((sum, scope) => sum + scope.totalQuantity, 0);
    const completedQuantity = scopesWithCompletion.reduce((sum, scope) => sum + scope.completedQuantity, 0);
    const overallCompletion = totalQuantity > 0 ? (completedQuantity / totalQuantity) * 100 : 0;

    // Get completed value
    const completedValue = await calculateCompletedValue(projectId);
    const contractValue = Number(project.value);
    const valueCompletion = contractValue > 0 ? (completedValue / contractValue) * 100 : 0;

    // Prepare response
    const completionReport = {
      project: {
        id: project.id,
        name: project.name,
        code: project.code,
        client: {
          id: project.client.id,
          name: project.client.name,
        },
        value: contractValue,
      },
      summary: {
        quantityCompletion: overallCompletion,
        valueCompletion,
        completedValue,
      },
      scopes: scopesWithCompletion,
    };

    return res.status(200).json(completionReport);
  } catch (error) {
    logger.error(`Error getting completion report for project ${req.params.projectId}:`, error);
    return res.status(500).json({ message: 'Failed to get completion report' });
  }
};

// Helper functions

/**
 * Calculate the cost of a time entry
 */
function calculateEntryCost(entry: any, hourlyRate: number): number {
  const regularHours = Number(entry.regularHours) || 0;
  const overtimeHours = Number(entry.overtimeHours) || 0;
  const doubleHours = Number(entry.doubleHours) || 0;

  const regularCost = regularHours * hourlyRate;
  const overtimeCost = overtimeHours * hourlyRate * 1.5;
  const doubleCost = doubleHours * hourlyRate * 2;

  return regularCost + overtimeCost + doubleCost;
}

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
      scope: {
        include: {
          project: {
            include: {
              projectWorkItems: {
                include: {
                  workItem: true,
                },
              },
            },
          },
        },
      },
    },
  });

  let completedValue = 0;

  // Calculate completed value for each sub-scope
  for (const subScope of subScopes) {
    for (const quantity of subScope.workItemQuantities) {
      // Find the unit price for this work item
      const projectWorkItem = subScope.scope.project.projectWorkItems.find(
        (pwi) => pwi.workItemId === quantity.workItemId
      );

      if (projectWorkItem) {
        const unitPrice = Number(projectWorkItem.unitPrice);
        const completed = Number(quantity.completed);
        completedValue += unitPrice * completed;
      }
    }
  }

  return completedValue;
}