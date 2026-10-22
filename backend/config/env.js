/**
 * ============================================================================
 * ENVIRONMENT LOADER & CONFIG ADAPTER (config/env.js)
 * ============================================================================
 *
 * ❓ Mengapa file ini ada dan tidak langsung memakai .env?
 * 1. File `.env` (di root) adalah tempat data teks rahasia (raw key-value).
 * 2. File ini (`config/env.js`) adalah ADAPTER / LOADER JavaScript yang:
 *    - Membaca file `.env` menggunakan `dotenv.config()`.
 *    - Melakukan type-casting (string -> integer/boolean) karena nilai di `.env`
 *      selalu berupa string. (Contoh: "false" di JS bernilai truthy jika tidak di-parse!).
 *    - Menyediakan fallback default values jika variabel di `.env` belum diisi.
 *    - Mengelompokkan config ke dalam namespace objek (env.DB, env.JWT, env.CORS).
 *    - Melakukan validasi keamanan saat berjalan di mode production.
 * ============================================================================
 */
"use strict";
require("dotenv").config();

const nodeEnv = process.env.NODE_ENV || "development";
const isProduction = nodeEnv === "production";

// Support both DATABASE_* and DB_* environment variable formats
const dbHost = process.env.DATABASE_HOST || process.env.DB_HOST || "127.0.0.1";
const dbPort = parseInt(
  process.env.DATABASE_PORT || process.env.DB_PORT || "3306",
  10,
);
const dbUser = process.env.DATABASE_USER || process.env.DB_USER || "root";
const dbPassword =
  process.env.DATABASE_PASSWORD !== undefined
    ? process.env.DATABASE_PASSWORD
    : process.env.DB_PASSWORD || "";
const dbName =
  process.env.DATABASE_NAME || process.env.DB_NAME || "bizmanage_db";
const dbDialect =
  process.env.DATABASE_DIALECT || process.env.DB_DIALECT || "mysql";
const dbLogging =
  process.env.DATABASE_LOGGING === "true" || process.env.DB_LOGGING === "true";

const jwtAccessSecret =
  process.env.JWT_ACCESS_SECRET ||
  "bizmanage_access_default_secret_key_change_me";
const jwtRefreshSecret =
  process.env.JWT_REFRESH_SECRET ||
  "bizmanage_refresh_default_secret_key_change_me";

// Production safety validations
if (isProduction) {
  if (
    jwtAccessSecret.includes("default_secret") ||
    jwtRefreshSecret.includes("default_secret")
  ) {
    console.error(
      "⚠️ [CRITICAL SECURITY WARNING] Default JWT Secrets detected in production mode! Please set unique JWT_ACCESS_SECRET and JWT_REFRESH_SECRET in your environment variables.",
    );
  }
}

const env = {
  NODE_ENV: nodeEnv,
  IS_PRODUCTION: isProduction,
  PORT: parseInt(process.env.PORT || "5000", 10),

  DB: {
    HOST: dbHost,
    PORT: dbPort,
    USER: dbUser,
    PASSWORD: dbPassword,
    NAME: dbName,
    DIALECT: dbDialect,
    LOGGING: dbLogging,
    POOL_MAX: parseInt(process.env.DATABASE_POOL_MAX || "20", 10),
    POOL_MIN: parseInt(process.env.DATABASE_POOL_MIN || "5", 10),
    POOL_ACQUIRE: parseInt(process.env.DATABASE_POOL_ACQUIRE || "60000", 10),
    POOL_IDLE: parseInt(process.env.DATABASE_POOL_IDLE || "10000", 10),
  },

  JWT: {
    ACCESS_SECRET: jwtAccessSecret,
    ACCESS_EXPIRES_IN: process.env.JWT_ACCESS_EXPIRES_IN || "15m",
    REFRESH_SECRET: jwtRefreshSecret,
    REFRESH_EXPIRES_IN: process.env.JWT_REFRESH_EXPIRES_IN || "30d",
  },

  CORS: {
    ORIGIN:
      process.env.CORS_ORIGIN ||
      (isProduction ? "https://app.yourdomain.com" : "*"),
  },

  BACKUP: {
    RETENTION_DAYS: parseInt(process.env.BACKUP_RETENTION_DAYS || "7", 10),
    DIR: process.env.BACKUP_DIR || "./backups",
  },

  RATE_LIMIT: {
    WINDOW_MS: parseInt(process.env.RATE_LIMIT_WINDOW_MS || "900000", 10), // 15 mins
    MAX_REQUESTS: parseInt(process.env.RATE_LIMIT_MAX_REQUESTS || "1000", 10),
  },

  MIDTRANS: {
    IS_PRODUCTION: process.env.MIDTRANS_IS_PRODUCTION === "true",
    CLIENT_KEY: process.env.MIDTRANS_CLIENT_KEY,
    SERVER_KEY: process.env.MIDTRANS_SERVER_KEY,
  },
};

module.exports = env;
