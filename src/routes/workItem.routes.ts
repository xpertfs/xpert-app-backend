// src/routes/workItem.routes.ts
import { Router } from 'express';
import { 
  getWorkItems, 
  getWorkItemById, 
  createWorkItem, 
  updateWorkItem, 
  deleteWorkItem,
  addWorkItemToSubScope,
  updateWorkItemQuantity,
  removeWorkItemFromSubScope,
  getSubScopeWorkItems
} from '../controllers/workItem.controller';
import { authenticate } from '../middleware/auth';
import { validateRequest } from '../middleware/validation';
import { 
  createWorkItemSchema, 
  updateWorkItemSchema,
  workItemQuantitySchema
} from '../validators/workItem.validator';

const router = Router();

router.use(authenticate);

// Project work item routes
router.get('/:projectId/work-items', getWorkItems);
router.get('/:projectId/work-items/:id', getWorkItemById);
router.post('/:projectId/work-items', validateRequest(createWorkItemSchema), createWorkItem);
router.put('/:projectId/work-items/:id', validateRequest(updateWorkItemSchema), updateWorkItem);
router.delete('/:projectId/work-items/:id', deleteWorkItem);

// Sub-scope work item routes
router.get('/:projectId/scopes/:scopeId/sub-scopes/:subScopeId/work-items', getSubScopeWorkItems);
router.post(
  '/:projectId/scopes/:scopeId/sub-scopes/:subScopeId/work-items', 
  validateRequest(workItemQuantitySchema), 
  addWorkItemToSubScope
);
router.put(
  '/:projectId/scopes/:scopeId/sub-scopes/:subScopeId/work-items/:workItemId', 
  validateRequest(workItemQuantitySchema), 
  updateWorkItemQuantity
);
router.delete(
  '/projects/:projectId/scopes/:scopeId/sub-scopes/:subScopeId/work-items/:workItemId', 
  removeWorkItemFromSubScope
);

export default router;