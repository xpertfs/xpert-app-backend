// src/routes/timesheet.routes.ts
import { Router } from 'express';
import { 
  getTimeEntries, 
  createTimeEntry, 
  updateTimeEntry, 
  deleteTimeEntry,
  approveTimeEntries,
  processPayment,
  getPayments,
  getPaymentById,
  getWeeklyTimesheets,
  syncGoogleSheet,
  getSheetConnections,
  createSheetConnection,
  updateSheetConnection
} from '../controllers/timesheet.controller';
import { authenticate } from '../middleware/auth';
import { validateRequest } from '../middleware/validation';
import { 
  createTimeEntrySchema, 
  updateTimeEntrySchema,
  processPaymentSchema,
  sheetConnectionSchema
} from '../validators/timesheet.validator';

const router = Router();

router.use(authenticate);

// Time entry routes
router.get('/', getTimeEntries);
router.post('/', validateRequest(createTimeEntrySchema), createTimeEntry);
router.put('/:id', validateRequest(updateTimeEntrySchema), updateTimeEntry);
router.delete('/:id', deleteTimeEntry);
router.post('/approve', approveTimeEntries);

// Weekly timesheet view
router.get('/weekly', getWeeklyTimesheets);

// Payment routes
router.post('/payments', validateRequest(processPaymentSchema), processPayment);
router.get('/payments', getPayments);
router.get('/payments/:id', getPaymentById);

// Google Sheet sync routes
router.get('/sheet-connections', getSheetConnections);
router.post('/sheet-connections', validateRequest(sheetConnectionSchema), createSheetConnection);
router.put('/sheet-connections/:id', validateRequest(sheetConnectionSchema), updateSheetConnection);
router.post('/sync/:connectionId', syncGoogleSheet);

export default router;
