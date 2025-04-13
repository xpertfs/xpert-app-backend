// src/routes/workItem.routes.ts
import { Router } from 'express';
import { 
  getWorkItems, 
  getWorkItemById, 
  createWorkItem, 
  updateWorkItem, 
  deleteWorkItem,
  addWorkItemToProject,
  updateProjectWorkItem,
  removeWorkItemFromProject,
  addWorkItemToSubScope,
  updateWorkItemQuantity,
  removeWorkItemFromSubScope
} from '../controllers/workItem.controller';
import { authenticate } from '../middleware/auth';
import { validateRequest } from '../middleware/validation';
import { 
  createWorkItemSchema, 
  updateWorkItemSchema,
  projectWorkItemSchema,
  workItemQuantitySchema
} from '../validators/workItem.validator';

const router = Router();

router.use(authenticate);

// Work item routes
router.get('/', getWorkItems);
router.get('/:id', getWorkItemById);
router.post('/', validateRequest(createWorkItemSchema), createWorkItem);
router.put('/:id', validateRequest(updateWorkItemSchema), updateWorkItem);
router.delete('/:id', deleteWorkItem);

// Project work item routes (defined here for clarity but could also be in project routes)
router.post('/projects/:projectId/work-items', validateRequest(projectWorkItemSchema), addWorkItemToProject);
router.put('/projects/:projectId/work-items/:workItemId', validateRequest(projectWorkItemSchema), updateProjectWorkItem);
router.delete('/projects/:projectId/work-items/:workItemId', removeWorkItemFromProject);

// Sub-scope work item routes (defined here for clarity but could also be in scope routes)
router.post('/sub-scopes/:subScopeId/work-items', validateRequest(workItemQuantitySchema), addWorkItemToSubScope);
router.put('/sub-scopes/:subScopeId/work-items/:workItemId', validateRequest(workItemQuantitySchema), updateWorkItemQuantity);
router.delete('/sub-scopes/:subScopeId/work-items/:workItemId', removeWorkItemFromSubScope);

export default router;