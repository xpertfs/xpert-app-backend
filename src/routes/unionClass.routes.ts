import { Router } from 'express';
import { unionClassController } from '../controllers/unionClass.controller';
import { authenticate } from '../middleware/auth';

const router = Router();

// Apply authentication middleware to all routes
router.use(authenticate);

// Union Class routes
router.post('/', unionClassController.createUnionClass);
router.get('/', unionClassController.getUnionClasses);
router.get('/:id', unionClassController.getUnionClassById);
router.put('/:id', unionClassController.updateUnionClass);
router.delete('/:id', unionClassController.deleteUnionClass);

// Rate routes
router.post('/:id/base-rates', unionClassController.createBaseRate);
router.delete('/:id/base-rates/:rateId', unionClassController.deleteBaseRate);
router.post('/:id/custom-rates', unionClassController.createCustomRate);
router.delete('/:id/custom-rates/:rateId', unionClassController.deleteCustomRate);

export default router; 