// src/validators/workItem.validator.ts
import * as yup from 'yup';

export const createWorkItemSchema = yup.object({
  body: yup.object({
    code: yup.string().required('Work item code is required'),
    name: yup.string().required('Work item name is required'),
    description: yup.string(),
    unit: yup.string().required('Unit of measurement is required'),
  }),
});

export const updateWorkItemSchema = yup.object({
  body: yup.object({
    name: yup.string(),
    description: yup.string(),
    unit: yup.string(),
  }),
  params: yup.object({
    id: yup.string().required('Work item ID is required'),
  }),
});

export const projectWorkItemSchema = yup.object({
  body: yup.object({
    workItemId: yup.string().required('Work item ID is required'),
    unitPrice: yup.number().positive('Unit price must be positive').required('Unit price is required'),
  }),
  params: yup.object({
    projectId: yup.string().required('Project ID is required'),
  }),
});

export const workItemQuantitySchema = yup.object({
  body: yup.object({
    workItemId: yup.string().required('Work item ID is required'),
    quantity: yup.number().positive('Quantity must be positive').required('Quantity is required'),
    completed: yup.number().min(0, 'Completed quantity cannot be negative'),
  }),
  params: yup.object({
    subScopeId: yup.string().required('Sub-scope ID is required'),
  }),
});