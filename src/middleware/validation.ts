// src/middleware/validation.ts

import { Request, Response, NextFunction } from 'express';
import { AnySchema, ValidationError } from 'yup';
import { logger } from '../utils/logger';

/**
 * Validate request data against a Yup schema
 * 
 * @param schema - Yup validation schema
 * @returns Express middleware function
 */
export const validateRequest = (schema: AnySchema) => {
  return async (req: Request, res: Response, next: NextFunction) => {
    try {
      // Validate request data against schema
      const validatedData = await schema.validate(
        {
          body: req.body,
          query: req.query,
          params: req.params,
        },
        { abortEarly: false }
      );

      // Replace request data with validated data
      req.body = validatedData.body;
      req.query = validatedData.query;
      req.params = validatedData.params;

      next();
    } catch (error) {
      if (error instanceof ValidationError) {
        logger.warn('Validation error:', error.errors);
        
        // Format validation errors into a user-friendly object
        const errors = error.inner.reduce<Record<string, string>>((acc, err) => {
          if (err.path) {
            // Remove the 'body.' prefix from the path if present
            const path = err.path.replace(/^body\./, '');
            acc[path] = err.message;
          }
          return acc;
        }, {});
        
        return res.status(400).json({
          message: 'Validation failed',
          errors,
        });
      }
      
      logger.error('Unexpected validation error:', error);
      return res.status(500).json({ message: 'Internal server error' });
    }
  };
};

// src/validators/auth.validator.ts

import * as yup from 'yup';

export const loginSchema = yup.object({
  body: yup.object({
    email: yup.string().email('Invalid email').required('Email is required'),
    password: yup.string().required('Password is required'),
  }),
});

export const registerSchema = yup.object({
  body: yup.object({
    email: yup.string().email('Invalid email').required('Email is required'),
    password: yup
      .string()
      .min(8, 'Password must be at least 8 characters')
      .required('Password is required'),
    firstName: yup.string().required('First name is required'),
    lastName: yup.string().required('Last name is required'),
    companyName: yup.string().required('Company name is required'),
    role: yup.string().oneOf(['ADMIN', 'PROJECT_MANAGER', 'FOREMAN', 'ACCOUNTANT', 'EMPLOYEE']),
  }),
});

export const forgotPasswordSchema = yup.object({
  body: yup.object({
    email: yup.string().email('Invalid email').required('Email is required'),
  }),
});

export const resetPasswordSchema = yup.object({
  body: yup.object({
    token: yup.string().required('Token is required'),
    password: yup
      .string()
      .min(8, 'Password must be at least 8 characters')
      .required('Password is required'),
  }),
});

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

// src/validators/timesheet.validator.ts

import * as yup from 'yup';

export const createTimeEntrySchema = yup.object({
  body: yup.object({
    employeeId: yup.string().required('Employee ID is required'),
    date: yup.date().required('Date is required'),
    regularHours: yup.number().min(0, 'Regular hours cannot be negative'),
    overtimeHours: yup.number().min(0, 'Overtime hours cannot be negative'),
    doubleHours: yup.number().min(0, 'Double time hours cannot be negative'),
    projectId: yup.string(),
    notes: yup.string(),
  }),
});

export const updateTimeEntrySchema = yup.object({
  body: yup.object({
    date: yup.date(),
    regularHours: yup.number().min(0, 'Regular hours cannot be negative'),
    overtimeHours: yup.number().min(0, 'Overtime hours cannot be negative'),
    doubleHours: yup.number().min(0, 'Double time hours cannot be negative'),
    projectId: yup.string(),
    notes: yup.string(),
    paymentStatus: yup.string().oneOf(['PENDING', 'APPROVED', 'PAID', 'CANCELLED']),
  }),
  params: yup.object({
    id: yup.string().required('Time entry ID is required'),
  }),
});

export const processPaymentSchema = yup.object({
  body: yup.object({
    employeeId: yup.string().required('Employee ID is required'),
    timeEntryIds: yup.array().of(yup.string()).required('Time entry IDs are required'),
    paymentDate: yup.date().required('Payment date is required'),
    reference: yup.string(),
    notes: yup.string(),
    deductions: yup.number().min(0, 'Deductions cannot be negative'),
  }),
});

export const sheetConnectionSchema = yup.object({
  body: yup.object({
    projectId: yup.string().required('Project ID is required'),
    sheetId: yup.string().required('Google Sheet ID is required'),
    sheetName: yup.string(),
    active: yup.boolean(),
  }),
});

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