// src/validators/scope.validator.ts
import * as yup from 'yup';

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

export const updateScopeSchema = yup.object({
  body: yup.object({
    name: yup.string(),
    description: yup.string(),
  }),
  params: yup.object({
    id: yup.string().required('Scope ID is required'),
  }),
});

export const createSubScopeSchema = yup.object({
  body: yup.object({
    name: yup.string().required('Sub-scope name is required'),
    code: yup.string().required('Sub-scope code is required'),
    description: yup.string(),
  }),
  params: yup.object({
    scopeId: yup.string().required('Scope ID is required'),
  }),
});

export const updateSubScopeSchema = yup.object({
  body: yup.object({
    name: yup.string(),
    description: yup.string(),
    percentComplete: yup
      .number()
      .min(0, 'Percent complete cannot be negative')
      .max(100, 'Percent complete cannot exceed 100'),
  }),
  params: yup.object({
    id: yup.string().required('Sub-scope ID is required'),
  }),
});

export const updateSubScopeCompletionSchema = yup.object({
  body: yup.object({
    percentComplete: yup
      .number()
      .required('Percent complete is required')
      .min(0, 'Percent complete cannot be negative')
      .max(100, 'Percent complete cannot exceed 100'),
  }),
  params: yup.object({
    id: yup.string().required('Sub-scope ID is required'),
  }),
});