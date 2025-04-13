// src/validators/client.validator.ts
import * as yup from 'yup';

export const createClientSchema = yup.object({
  body: yup.object({
    name: yup.string().required('Client name is required'),
    code: yup.string().required('Client code is required'),
    address: yup.string(),
    city: yup.string(),
    state: yup.string(),
    zip: yup.string(),
    phone: yup.string(),
    email: yup.string().email('Invalid email'),
    contactName: yup.string(),
  }),
});

export const updateClientSchema = yup.object({
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
    id: yup.string().required('Client ID is required'),
  }),
});