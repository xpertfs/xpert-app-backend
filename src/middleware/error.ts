// src/middleware/error.ts

import { Request, Response, NextFunction } from 'express';
import { PrismaClientKnownRequestError, PrismaClientValidationError } from '@prisma/client/runtime/library';
import { logger } from '../utils/logger';

/**
 * Error handling middleware
 */
export const errorHandler = (
  err: Error,
  req: Request,
  res: Response,
  next: NextFunction
) => {
  logger.error(`Error: ${err.message}`);
  logger.error(err.stack || 'No stack trace');

  // Handle Prisma errors
  if (err instanceof PrismaClientKnownRequestError) {
    return handlePrismaError(err, res);
  }

  if (err instanceof PrismaClientValidationError) {
    return res.status(400).json({
      message: 'Validation error',
      details: err.message,
    });
  }

  // Default error handler
  const statusCode = res.statusCode !== 200 ? res.statusCode : 500;
  
  return res.status(statusCode).json({
    message: err.message || 'Internal server error',
    stack: process.env.NODE_ENV === 'production' ? undefined : err.stack,
  });
};

/**
 * Handle specific Prisma error codes
 */
const handlePrismaError = (
  err: PrismaClientKnownRequestError,
  res: Response
) => {
  switch (err.code) {
    case 'P2002': {
      // Unique constraint violation
      const field = err.meta?.target as string[];
      return res.status(409).json({
        message: `The ${field.join(', ')} already exists`,
        code: err.code,
      });
    }
    case 'P2003': {
      // Foreign key constraint failed
      const field = err.meta?.field_name as string;
      return res.status(400).json({
        message: `Foreign key constraint failed on the field: ${field}`,
        code: err.code,
      });
    }
    case 'P2025': {
      // Record not found
      return res.status(404).json({
        message: 'Record not found',
        details: err.meta?.cause,
        code: err.code,
      });
    }
    default:
      return res.status(500).json({
        message: 'Database error',
        code: err.code,
        details: process.env.NODE_ENV === 'production' ? undefined : err.message,
      });
  }
};

/**
 * Handle 404 errors for undefined routes
 */
export const notFoundHandler = (
  req: Request,
  res: Response,
  next: NextFunction
) => {
  logger.warn(`Route not found: ${req.method} ${req.originalUrl}`);
  
  res.status(404).json({
    message: `Route ${req.method} ${req.originalUrl} not found`,
  });
};