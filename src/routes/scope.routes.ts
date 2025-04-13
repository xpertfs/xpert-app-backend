// src/routes/scope.routes.ts
import { Router } from 'express';
import { 
  getProjectScopes, 
  getScopeById, 
  createScope, 
  updateScope, 
  deleteScope,
  getSubScopeById,
  createSubScope,
  updateSubScope,
  deleteSubScope,
  updateSubScopeCompletion
} from '../controllers/scope.controller';
import { authenticate } from '../middleware/auth';
import { validateRequest } from '../middleware/validation';
import { 
  createScopeSchema, 
  updateScopeSchema,
  createSubScopeSchema,
  updateSubScopeSchema,
  updateSubScopeCompletionSchema
} from '../validators/scope.validator';

const router = Router();

router.use(authenticate);

// Project scope routes (some of these could be moved to project routes)
router.get('/projects/:projectId/scopes', getProjectScopes);
router.post('/projects/:projectId/scopes', validateRequest(createScopeSchema), createScope);

// Scope routes
router.get('/scopes/:id', getScopeById);
router.put('/scopes/:id', validateRequest(updateScopeSchema), updateScope);
router.delete('/scopes/:id', deleteScope);

// Sub-scope routes
router.get('/sub-scopes/:id', getSubScopeById);
router.post('/scopes/:scopeId/sub-scopes', validateRequest(createSubScopeSchema), createSubScope);
router.put('/sub-scopes/:id', validateRequest(updateSubScopeSchema), updateSubScope);
router.delete('/sub-scopes/:id', deleteSubScope);
router.put('/sub-scopes/:id/completion', validateRequest(updateSubScopeCompletionSchema), updateSubScopeCompletion);

export default router;