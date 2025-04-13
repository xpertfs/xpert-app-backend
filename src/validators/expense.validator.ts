// src/validators/expense.validator.ts
import * as yup from 'yup';

export const createExpenseSchema = yup.object({
  body: yup.object({
    date: yup.date().required('Date is required'),
    amount: yup.number().positive('Amount must be positive').required('Amount is required'),
    description: yup.string().required('Description is required'),
    category: yup
      .string()
      .oneOf(['MATERIAL', 'TOOL', 'RENTAL', 'OPERATIONAL', 'LABOR', 'OTHER'])
      .required('Category is required'),
    projectId: yup.string(),
    vendorId: yup.string(),
    reference: yup.string(),
    recurring: yup.boolean(),
  }),
});

export const updateExpenseSchema = yup.object({
  body: yup.object({
    date: yup.date(),
    amount: yup.number().positive('Amount must be positive'),
    description: yup.string(),
    category: yup.string().oneOf(['MATERIAL', 'TOOL', 'RENTAL', 'OPERATIONAL', 'LABOR', 'OTHER']),
    projectId: yup.string(),
    vendorId: yup.string(),
    reference: yup.string(),
    recurring: yup.boolean(),
  }),
  params: yup.object({
    id: yup.string().required('Expense ID is required'),
  }),
});