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
router.get('/materials/:materialId/prices', getVendorPrices);
router.post('/materials/:materialId/prices', validateRequest(vendorPriceSchema), createVendorPrice);
router.put('/materials/:materialId/prices/:priceId', validateRequest(vendorPriceSchema), updateVendorPrice);
router.delete('/materials/:materialId/prices/:priceId', deleteVendorPrice);

// Best price route
router.get('/materials/:materialId/best-price', getBestPrice);

// Material routes
router.get('/materials', getMaterials);
router.post('/materials', validateRequest(createMaterialSchema), createMaterial);
router.put('/materials/:id', validateRequest(updateMaterialSchema), updateMaterial);
router.delete('/materials/:id', deleteMaterial);

export default router;