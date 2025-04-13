// src/validators/contractor.validator.ts
import * as yup from 'yup';

export const createContractorSchema = yup.object({
  body: yup.object({
    name: yup.string().required('Contractor name is required'),
    code: yup.string().required('Contractor code is required'),
    address: yup.string(),
    city: yup.string(),
    state: yup.string(),
    zip: yup.string(),
    phone: yup.string(),
    email: yup.string().email('Invalid email'),
    contactName: yup.string(),
  }),
});

export const updateContractorSchema = yup.object({
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
    id: yup.string().required('Contractor ID is required'),
  }),
});