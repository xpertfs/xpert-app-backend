// src/routes/client.routes.ts
import { Router } from 'express';
import { 
  getClients, 
  getClientById, 
  createClient, 
  updateClient, 
  deleteClient 
} from '../controllers/client.controller';
import { authenticate } from '../middleware/auth';
import { validateRequest } from '../middleware/validation';
import { createClientSchema, updateClientSchema } from '../validators/client.validator';

const router = Router();

router.use(authenticate);

router.get('/', getClients);
router.get('/:id', getClientById);
router.post('/', validateRequest(createClientSchema), createClient);
router.put('/:id', validateRequest(updateClientSchema), updateClient);
router.delete('/:id', deleteClient);

export default router;