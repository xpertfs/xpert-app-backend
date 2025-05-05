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
    name: yup.string().required('Name is required'),
    baseRates: yup.array().of(
      yup.object({
        regularRate: yup.number().required('Regular rate is required').min(0, 'Rate must be positive'),
        overtimeRate: yup.number().required('Overtime rate is required').min(0, 'Rate must be positive'),
        benefitsRate: yup.number().required('Benefits rate is required').min(0, 'Rate must be positive'),
        effectiveDate: yup.date().required('Effective date is required'),
        endDate: yup.date().nullable(),
      })
    ).min(1, 'At least one base rate is required'),
  }),
});

export const updateUnionClassSchema = yup.object({
  body: yup.object({
    name: yup.string(),
    baseRates: yup.array().of(
      yup.object({
        regularRate: yup.number().min(0, 'Rate must be positive'),
        overtimeRate: yup.number().min(0, 'Rate must be positive'),
        benefitsRate: yup.number().min(0, 'Rate must be positive'),
        effectiveDate: yup.date(),
        endDate: yup.date().nullable(),
      })
    ),
  }),
  params: yup.object({
    id: yup.string().required('Union class ID is required'),
  }),
});

export const createUnionRateSchema = yup.object({
  body: yup.object({
    regularRate: yup.number().required('Regular rate is required').min(0, 'Rate must be positive'),
    overtimeRate: yup.number().required('Overtime rate is required').min(0, 'Rate must be positive'),
    benefitsRate: yup.number().required('Benefits rate is required').min(0, 'Rate must be positive'),
    effectiveDate: yup.date().required('Effective date is required'),
    endDate: yup.date().nullable(),
  }),
  params: yup.object({
    classId: yup.string().required('Union class ID is required'),
  }),
});

export const updateUnionRateSchema = yup.object({
  body: yup.object({
    regularRate: yup.number().min(0, 'Rate must be positive'),
    overtimeRate: yup.number().min(0, 'Rate must be positive'),
    benefitsRate: yup.number().min(0, 'Rate must be positive'),
    effectiveDate: yup.date(),
    endDate: yup.date().nullable(),
  }),
  params: yup.object({
    classId: yup.string().required('Union class ID is required'),
    rateId: yup.string().required('Rate ID is required'),
  }),
});