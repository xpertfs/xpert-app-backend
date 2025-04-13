// src/routes/employee.routes.ts
import { Router } from 'express';
import { 
  getEmployees, 
  getEmployeeById, 
  createEmployee, 
  updateEmployee, 
  deleteEmployee,
  getUnionClasses,
  createUnionClass,
  updateUnionClass,
  deleteUnionClass,
  getUnionRates,
  createUnionRate,
  updateUnionRate
} from '../controllers/employee.controller';
import { authenticate } from '../middleware/auth';
import { validateRequest } from '../middleware/validation';
import { 
  createEmployeeSchema, 
  updateEmployeeSchema,
  createUnionClassSchema,
  updateUnionClassSchema,
  createUnionRateSchema,
  updateUnionRateSchema
} from '../validators/employee.validator';

const router = Router();

router.use(authenticate);

// Employee routes
router.get('/', getEmployees);
router.get('/:id', getEmployeeById);
router.post('/', validateRequest(createEmployeeSchema), createEmployee);
router.put('/:id', validateRequest(updateEmployeeSchema), updateEmployee);
router.delete('/:id', deleteEmployee);

// Union class routes
router.get('/union-classes', getUnionClasses);
router.post('/union-classes', validateRequest(createUnionClassSchema), createUnionClass);
router.put('/union-classes/:id', validateRequest(updateUnionClassSchema), updateUnionClass);
router.delete('/union-classes/:id', deleteUnionClass);

// Union rate routes
router.get('/union-classes/:classId/rates', getUnionRates);
router.post('/union-classes/:classId/rates', validateRequest(createUnionRateSchema), createUnionRate);
router.put('/union-classes/:classId/rates/:rateId', validateRequest(updateUnionRateSchema), updateUnionRate);

export default router;