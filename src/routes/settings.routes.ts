// src/routes/settings.routes.ts
import { Router } from 'express';
import { 
  getCompanySettings,
  updateCompanySettings,
  getUsers,
  createUser,
  updateUser,
  deleteUser,
  updateUserPassword
} from '../controllers/settings.controller';
import { authenticate, authorize } from '../middleware/auth';
import { validateRequest } from '../middleware/validation';
import { 
  updateCompanySchema,
  createUserSchema,
  updateUserSchema,
  updatePasswordSchema
} from '../validators/settings.validator';

const router = Router();

router.use(authenticate);

// Company settings
router.get('/company', getCompanySettings);
router.put('/company', validateRequest(updateCompanySchema), updateCompanySettings);

// User management (admin only)
router.get('/users', authorize(['ADMIN']), getUsers);
router.post('/users', authorize(['ADMIN']), validateRequest(createUserSchema), createUser);
router.put('/users/:id', authorize(['ADMIN']), validateRequest(updateUserSchema), updateUser);
router.delete('/users/:id', authorize(['ADMIN']), deleteUser);
router.put('/users/:id/password', authorize(['ADMIN']), validateRequest(updatePasswordSchema), updateUserPassword);

export default router;