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