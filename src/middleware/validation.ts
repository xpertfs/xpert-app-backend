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