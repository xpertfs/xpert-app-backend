// src/routes/report.routes.ts
import { Router } from 'express';
import { 
  getProjectFinancialSummary,
  getLaborCostBreakdown,
  getExpenseBreakdown,
  getMonthlyTrends,
  getProfitAnalysis,
  getCompletionReport
} from '../controllers/report.controller';
import { authenticate } from '../middleware/auth';

const router = Router();

router.use(authenticate);

router.get('/project/:projectId/financial', getProjectFinancialSummary);
router.get('/project/:projectId/labor', getLaborCostBreakdown);
router.get('/project/:projectId/expenses', getExpenseBreakdown);
router.get('/project/:projectId/profit', getProfitAnalysis);
router.get('/project/:projectId/completion', getCompletionReport);
router.get('/trends/monthly', getMonthlyTrends);

export default router;