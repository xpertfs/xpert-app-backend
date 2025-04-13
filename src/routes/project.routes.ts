// src/routes/project.routes.ts
import { Router } from 'express';
import { 
  getProjects, 
  getProjectById, 
  createProject, 
  updateProject, 
  deleteProject,
  getProjectScopes,
  createProjectScope,
  updateProjectCompletion
} from '../controllers/project.controller';
import { authenticate } from '../middleware/auth';
import { validateRequest } from '../middleware/validation';
import { 
  createProjectSchema, 
  updateProjectSchema,
  createScopeSchema
} from '../validators/project.validator';

const router = Router();

router.use(authenticate);

router.get('/', getProjects);
router.get('/:id', getProjectById);
router.post('/', validateRequest(createProjectSchema), createProject);
router.put('/:id', validateRequest(updateProjectSchema), updateProject);
router.delete('/:id', deleteProject);

// Scope routes
router.get('/:projectId/scopes', getProjectScopes);
router.post('/:projectId/scopes', validateRequest(createScopeSchema), createProjectScope);

// Progress tracking
router.put('/:projectId/completion', updateProjectCompletion);

export default router;