import dotenv from 'dotenv';
import path from 'path';

// Load environment variables
dotenv.config({
  path: path.resolve(process.cwd(), `.env${process.env.NODE_ENV ? `.${process.env.NODE_ENV}` : ''}`),
});

// Server configuration
export const PORT = process.env.PORT || 3001;
export const NODE_ENV = process.env.NODE_ENV || 'development';

// JWT configuration
export const JWT_SECRET = process.env.JWT_SECRET || 'your_default_secret_key_for_development';
export const JWT_EXPIRES_IN = process.env.JWT_EXPIRES_IN || '7d';

// Google API configuration
export const GOOGLE_APPLICATION_CREDENTIALS = process.env.GOOGLE_APPLICATION_CREDENTIALS;
