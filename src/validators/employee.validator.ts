// src/validators/employee.validator.ts
import * as yup from 'yup';

export const createEmployeeSchema = yup.object({
  body: yup.object({
    firstName: yup.string().required('First name is required'),
    lastName: yup.string().required('Last name is required'),
    code: yup.string().required('Employee code is required'),
    email: yup.string().email('Invalid email'),
    phone: yup.string(),
    type: yup.string().oneOf(['LOCAL', 'UNION']).required('Employee type is required'),
    rate: yup.number().when('type', {
      is: 'LOCAL',
      then: (schema) => schema.required('Hourly rate is required for local employees'),
      otherwise: (schema) => schema,
    }),
    unionClassId: yup.string().when('type', {
      is: 'UNION',
      then: (schema) => schema.required('Union class is required for union employees'),
      otherwise: (schema) => schema,
    }),
    hireDate: yup.date(),
    active: yup.boolean(),
  }),
});

export const updateEmployeeSchema = yup.object({
  body: yup.object({
    firstName: yup.string(),
    lastName: yup.string(),
    email: yup.string().email('Invalid email'),
    phone: yup.string(),
    rate: yup.number(),
    unionClassId: yup.string(),
    hireDate: yup.date(),
    terminationDate: yup.date(),
    active: yup.boolean(),
  }),
  params: yup.object({
    id: yup.string().required('Employee ID is required'),
  }),
});

export const createUnionClassSchema = yup.object({
  body: yup.object({
    code: yup.string().required('Class code is required'),
    name: yup.string().required('Class name is required'),
    description: yup.string(),
    baseRate: yup.number().required('Base rate is required'),
  }),
});

export const updateUnionClassSchema = yup.object({
  body: yup.object({
    name: yup.string(),
    description: yup.string(),
  }),
  params: yup.object({
    id: yup.string().required('Union class ID is required'),
  }),
});

export const createUnionRateSchema = yup.object({
  body: yup.object({
    rate: yup.number().required('Rate is required'),
    effectiveDate: yup.date().required('Effective date is required'),
    name: yup.string().when('isCustomRate', {
      is: true,
      then: (schema) => schema.required('Name is required for custom rates'),
      otherwise: (schema) => schema,
    }),
    percentage: yup.boolean(),
    isCustomRate: yup.boolean(),
  }),
  params: yup.object({
    classId: yup.string().required('Union class ID is required'),
  }),
});

export const updateUnionRateSchema = yup.object({
  body: yup.object({
    rate: yup.number(),
    effectiveDate: yup.date(),
    endDate: yup.date(),
    name: yup.string(),
    percentage: yup.boolean(),
  }),
  params: yup.object({
    classId: yup.string().required('Union class ID is required'),
    rateId: yup.string().required('Rate ID is required'),
  }),
});