const app = require('./app');
const config = require('./config');
const logger = require('./config/logger');
const db = require('./db');
const seed = require('./db/seed');

async function startServer() {
  try {
    // Initialize Database and run migrations
    await db.initDb();

    // Auto-seed if database is empty
    const userCheck = await db.query('SELECT COUNT(*) FROM users');
    if (userCheck.rows.length === 0 || parseInt(userCheck.rows[0].count || 0) === 0) {
      logger.info('Empty database detected. Running initial data seeder...');
      await seed();
    }

    const server = app.listen(config.PORT, () => {
      logger.info(`🚀 EVE Healthcare Server listening on port ${config.PORT}`);
      logger.info(`📖 Interactive API Documentation: http://localhost:${config.PORT}/docs`);
      logger.info(`🩺 Health Check: http://localhost:${config.PORT}/health`);
    });

    // Graceful Shutdown
    const shutdown = async () => {
      logger.info('Shutting down EVE Healthcare Server gracefully...');
      server.close(() => {
        logger.info('HTTP server closed.');
        process.exit(0);
      });
    };

    process.on('SIGTERM', shutdown);
    process.on('SIGINT', shutdown);
  } catch (err) {
    logger.error(`Failed to start server: ${err.message}`, { stack: err.stack });
    process.exit(1);
  }
}

if (require.main === module) {
  startServer();
}

module.exports = startServer;
