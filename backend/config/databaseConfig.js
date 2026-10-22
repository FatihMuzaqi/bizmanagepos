const env = require('./env');

module.exports = {
  development: {
    username: env.DB.USER,
    password: env.DB.PASSWORD,
    database: env.DB.NAME,
    host: env.DB.HOST,
    port: env.DB.PORT,
    dialect: env.DB.DIALECT,
    logging: env.DB.LOGGING,
    pool: {
      max: 10,
      min: 0,
      acquire: 30000,
      idle: 10000
    },
    define: {
      timestamps: true,
      underscored: true,
      freezeTableName: true
    }
  },
  test: {
    username: env.DB.USER,
    password: env.DB.PASSWORD,
    database: `${env.DB.NAME}_test`,
    host: env.DB.HOST,
    port: env.DB.PORT,
    dialect: env.DB.DIALECT,
    logging: false
  },
  production: {
    username: env.DB.USER,
    password: env.DB.PASSWORD,
    database: env.DB.NAME,
    host: env.DB.HOST,
    port: env.DB.PORT,
    dialect: env.DB.DIALECT,
    logging: false,
    pool: {
      max: 20,
      min: 5,
      acquire: 60000,
      idle: 10000
    },
    define: {
      timestamps: true,
      underscored: true,
      freezeTableName: true
    }
  }
};
