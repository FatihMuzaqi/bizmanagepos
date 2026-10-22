const { Sequelize } = require('sequelize');
const dbConfig = require('./databaseConfig');
const env = require('./env');

const currentConfig = dbConfig[env.NODE_ENV] || dbConfig.development;

const sequelize = new Sequelize(
  currentConfig.database,
  currentConfig.username,
  currentConfig.password,
  {
    host: currentConfig.host,
    port: currentConfig.port,
    dialect: currentConfig.dialect,
    logging: currentConfig.logging,
    pool: currentConfig.pool,
    define: currentConfig.define,
    timezone: '+07:00' // WIB timezone
  }
);

/**
 * Test database connection
 * @returns {Promise<boolean>}
 */
const testConnection = async () => {
  try {
    await sequelize.authenticate();
    console.log(`[Database] MySQL connection established successfully to ${currentConfig.database} on ${currentConfig.host}:${currentConfig.port}`);
    return true;
  } catch (error) {
    console.error('[Database] Unable to connect to MySQL database:', error.message);
    throw error;
  }
};

module.exports = {
  sequelize,
  testConnection
};
