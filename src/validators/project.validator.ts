// src/validators/project.validator.ts
import * as yup from 'yup';

export const createProjectSchema = yup.object({
  body: yup.object({
    name: yup.string().required('Project name is required'),
    code: yup.string().required('Project code is required'),
    description: yup.string(),
    address: yup.string(),
    city: yup.string(),
    state: yup.string(),
    zip: yup.string(),
    clientId: yup.string().required('Client ID is required'),
    startDate: yup.date(),
    endDate: yup.date(),
    status: yup.string().oneOf(['PLANNING', 'IN_PROGRESS', 'ON_HOLD', 'COMPLETED', 'CANCELLED']),
    value: yup.number().positive('Project value must be positive'),
  }),
});

export const updateProjectSchema = yup.object({
  body: yup.object({
    name: yup.string(),
    description: yup.string(),
    address: yup.string(),
    city: yup.string(),
    state: yup.string(),
    zip: yup.string(),
    clientId: yup.string(),
    startDate: yup.date(),
    endDate: yup.date(),
    status: yup.string().oneOf(['PLANNING', 'IN_PROGRESS', 'ON_HOLD', 'COMPLETED', 'CANCELLED']),
    value: yup.number().positive('Project value must be positive'),
  }),
  params: yup.object({
    id: yup.string().required('Project ID is required'),
  }),
});

export const createScopeSchema = yup.object({
  body: yup.object({
    name: yup.string().required('Scope name is required'),
    code: yup.string().required('Scope code is required'),
    description: yup.string(),
    subScopes: yup.array().of(
      yup.object({
        name: yup.string().required('Sub-scope name is required'),
        code: yup.string().required('Sub-scope code is required'),
        description: yup.string(),
      })
    ),
  }),
  params: yup.object({
    projectId: yup.string().required('Project ID is required'),
  }),
});