const app = require('./app');
const env = require('./config/env');
const { testConnection, sequelize } = require('./config/database');

const startServer = async () => {
  try {
    // 1. Verify Database Connection
    await testConnection();

    // 2. Start Express HTTP Server
    const server = app.listen(env.PORT, () => {
      console.log(`====================================================`);
      console.log(`🚀 BizManage Backend is running on port: ${env.PORT}`);
      console.log(`📡 Environment: ${env.NODE_ENV}`);
      console.log(`🔗 Health Check: http://localhost:${env.PORT}/api/v1/health`);
      console.log(`====================================================`);
    });

    // 3. Graceful Shutdown Handlers
    const handleShutdown = async (signal) => {
      console.log(`\n[Server] Received ${signal}. Initiating graceful shutdown...`);
      server.close(async () => {
        console.log('[Server] HTTP server closed.');
        try {
          await sequelize.close();
          console.log('[Database] Database connection pool closed.');
          process.exit(0);
        } catch (err) {
          console.error('[Database] Error closing database connection:', err);
          process.exit(1);
        }
      });
    };

    process.on('SIGTERM', () => handleShutdown('SIGTERM'));
    process.on('SIGINT', () => handleShutdown('SIGINT'));

  } catch (error) {
    console.error('[Server] Fatal Error during server bootstrap:', error.message);
    process.exit(1);
  }
};

startServer();
