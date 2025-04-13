// src/routes/contractor.routes.ts
import { Router } from 'express';
import { 
  getContractors, 
  getContractorById, 
  createContractor, 
  updateContractor, 
  deleteContractor 
} from '../controllers/contractor.controller';
import { authenticate } from '../middleware/auth';
import { validateRequest } from '../middleware/validation';
import { createContractorSchema, updateContractorSchema } from '../validators/contractor.validator';

const router = Router();

router.use(authenticate);

router.get('/', getContractors);
router.get('/:id', getContractorById);
router.post('/', validateRequest(createContractorSchema), createContractor);
router.put('/:id', validateRequest(updateContractorSchema), updateContractor);
router.delete('/:id', deleteContractor);

export default router;