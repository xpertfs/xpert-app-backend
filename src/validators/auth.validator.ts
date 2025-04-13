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