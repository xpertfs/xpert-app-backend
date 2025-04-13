// src/validators/settings.validator.ts
import * as yup from 'yup';

export const updateCompanySchema = yup.object({
  body: yup.object({
    name: yup.string(),
    address: yup.string(),
    city: yup.string(),
    state: yup.string(),
    zip: yup.string(),
    phone: yup.string(),
    email: yup.string().email('Invalid email'),
    logo: yup.string(),
  }),
});

export const createUserSchema = yup.object({
  body: yup.object({
    email: yup.string().email('Invalid email').required('Email is required'),
    password: yup
      .string()
      .min(8, 'Password must be at least 8 characters')
      .required('Password is required'),
    firstName: yup.string().required('First name is required'),
    lastName: yup.string().required('Last name is required'),
    role: yup
      .string()
      .oneOf(['ADMIN', 'PROJECT_MANAGER', 'FOREMAN', 'ACCOUNTANT', 'EMPLOYEE'])
      .required('Role is required'),
  }),
});

export const updateUserSchema = yup.object({
  body: yup.object({
    firstName: yup.string(),
    lastName: yup.string(),
    email: yup.string().email('Invalid email'),
    role: yup.string().oneOf(['ADMIN', 'PROJECT_MANAGER', 'FOREMAN', 'ACCOUNTANT', 'EMPLOYEE']),
    active: yup.boolean(),
  }),
  params: yup.object({
    id: yup.string().required('User ID is required'),
  }),
});

export const updatePasswordSchema = yup.object({
  body: yup.object({
    password: yup
      .string()
      .min(8, 'Password must be at least 8 characters')
      .required('Password is required'),
  }),
  params: yup.object({
    id: yup.string().required('User ID is required'),
  }),
});