import { Router } from 'express';
import authRoutes from './auth.routes';
import projectRoutes from './project.routes';
import clientRoutes from './client.routes';
import contractorRoutes from './contractor.routes';
import employeeRoutes from './employee.routes';
import expenseRoutes from './expense.routes';
import materialRoutes from './material.routes';
import reportRoutes from './report.routes';
import settingsRoutes from './settings.routes';
import timesheetRoutes from './timesheet.routes';

const router = Router();

router.use('/auth', authRoutes);
router.use('/projects', projectRoutes);
router.use('/clients', clientRoutes);
router.use('/contractors', contractorRoutes);
router.use('/employees', employeeRoutes);
router.use('/expenses', expenseRoutes);
router.use('/materials', materialRoutes);
router.use('/reports', reportRoutes);
router.use('/settings', settingsRoutes);
router.use('/timesheets', timesheetRoutes);

export default router;