// src/validators/material.validator.ts
import * as yup from 'yup';

export const createMaterialSchema = yup.object({
  body: yup.object({
    code: yup.string().required('Material code is required'),
    name: yup.string().required('Material name is required'),
    description: yup.string(),
    unit: yup.string().required('Unit is required'),
    category: yup.string(),
  }),
});

export const updateMaterialSchema = yup.object({
  body: yup.object({
    name: yup.string(),
    description: yup.string(),
    unit: yup.string(),
    category: yup.string(),
  }),
  params: yup.object({
    id: yup.string().required('Material ID is required'),
  }),
});

export const createVendorSchema = yup.object({
  body: yup.object({
    code: yup.string().required('Vendor code is required'),
    name: yup.string().required('Vendor name is required'),
    address: yup.string(),
    city: yup.string(),
    state: yup.string(),
    zip: yup.string(),
    phone: yup.string(),
    email: yup.string().email('Invalid email'),
    contactName: yup.string(),
  }),
});

export const updateVendorSchema = yup.object({
  body: yup.object({
    name: yup.string(),
    address: yup.string(),
    city: yup.string(),
    state: yup.string(),
    zip: yup.string(),
    phone: yup.string(),
    email: yup.string().email('Invalid email'),
    contactName: yup.string(),
  }),
  params: yup.object({
    id: yup.string().required('Vendor ID is required'),
  }),
});

export const vendorPriceSchema = yup.object({
  body: yup.object({
    vendorId: yup.string().required('Vendor ID is required'),
    price: yup.number().positive('Price must be positive').required('Price is required'),
    effectiveDate: yup.date().required('Effective date is required'),
    endDate: yup.date(),
    notes: yup.string(),
  }),
});