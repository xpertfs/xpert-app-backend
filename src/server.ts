// src/server.ts

import app from './app';
import { PORT } from './config/env';
import prisma from './config/database';
import { logger } from './utils/logger';

// Start server
const server = app.listen(PORT, () => {
  logger.info(`Server running on port ${PORT}`);
  logger.info(`Environment: ${process.env.NODE_ENV}`);
});

// Graceful shutdown
const shutdown = async () => {
  logger.info('Shutting down server...');
  
  server.close(async () => {
    logger.info('Express server closed');
    
    try {
      await prisma.$disconnect();
      logger.info('Database connection closed');
      
      process.exit(0);
    } catch (err) {
      logger.error('Error during shutdown:', err);
      process.exit(1);
    }
  });
};

// Handle termination signals
process.on('SIGINT', shutdown);
process.on('SIGTERM', shutdown);
process.on('uncaughtException', (err) => {
  logger.error('Uncaught exception:', err);
  shutdown();
});
