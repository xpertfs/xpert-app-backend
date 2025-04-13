// src/routes/expense.routes.ts
import { Router } from 'express';
import { 
  getExpenses, 
  getExpenseById, 
  createExpense, 
  updateExpense, 
  deleteExpense,
  getExpensesByProject,
  getExpensesByCategory
} from '../controllers/expense.controller';
import { authenticate } from '../middleware/auth';
import { validateRequest } from '../middleware/validation';
import { createExpenseSchema, updateExpenseSchema } from '../validators/expense.validator';

const router = Router();

router.use(authenticate);

router.get('/', getExpenses);
router.get('/project/:projectId', getExpensesByProject);
router.get('/category/:category', getExpensesByCategory);
router.get('/:id', getExpenseById);
router.post('/', validateRequest(createExpenseSchema), createExpense);
router.put('/:id', validateRequest(updateExpenseSchema), updateExpense);
router.delete('/:id', deleteExpense);

export default router;