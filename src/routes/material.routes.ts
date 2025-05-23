// src/routes/material.routes.ts
import { Router } from 'express';
import { 
  getMaterials, 
  getMaterialById, 
  createMaterial, 
  updateMaterial, 
  deleteMaterial,
  getVendors,
  getVendorById,
  createVendor,
  updateVendor,
  deleteVendor,
  getVendorPrices,
  createVendorPrice,
  updateVendorPrice,
  deleteVendorPrice,
  getBestPrice
} from '../controllers/material.controller';
import { authenticate } from '../middleware/auth';
import { validateRequest } from '../middleware/validation';
import { 
  createMaterialSchema, 
  updateMaterialSchema,
  createVendorSchema,
  updateVendorSchema,
  vendorPriceSchema
} from '../validators/material.validator';

const router = Router();

router.use(authenticate);

// Vendor routes
router.get('/vendors', getVendors);
router.get('/vendors/:id', getVendorById);
router.post('/vendors', validateRequest(createVendorSchema), createVendor);
router.put('/vendors/:id', validateRequest(updateVendorSchema), updateVendor);
router.delete('/vendors/:id', deleteVendor);

// Vendor price routes
router.get('/:materialId/prices', getVendorPrices);
router.post('/:materialId/prices', validateRequest(vendorPriceSchema), createVendorPrice);
router.put('/:materialId/prices/:priceId', validateRequest(vendorPriceSchema), updateVendorPrice);
router.delete('/:materialId/prices/:priceId', deleteVendorPrice);

// Best price route
router.get('/:materialId/best-price', getBestPrice);

// Material routes
router.get('/', getMaterials);
router.post('/', validateRequest(createMaterialSchema), createMaterial);
router.put('/:id', validateRequest(updateMaterialSchema), updateMaterial);
router.delete('/:id', deleteMaterial);

export default router;