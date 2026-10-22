'use strict';
const fs = require('fs');
const path = require('path');
const { sequelize } = require('../models');
const env = require('../config/env');

const BACKUP_DIR = path.resolve(__dirname, '..', env.BACKUP.DIR);

/**
 * Format Date for filename: YYYYMMDD_HHMMSS
 */
const getTimestamp = () => {
  const d = new Date();
  const pad = (n) => n.toString().padStart(2, '0');
  return `${d.getFullYear()}${pad(d.getMonth() + 1)}${pad(d.getDate())}_${pad(d.getHours())}${pad(d.getMinutes())}${pad(d.getSeconds())}`;
};

/**
 * Perform Database Backup
 */
const backupDatabase = async () => {
  console.log('====================================================');
  console.log('📦 BIZMANAGE AUTOMATED DATABASE BACKUP');
  console.log('====================================================');
  console.log(`Database:  ${env.DB.NAME}`);
  console.log(`Host:      ${env.DB.HOST}:${env.DB.PORT}`);
  console.log(`Timestamp: ${new Date().toISOString()}\n`);

  if (!fs.existsSync(BACKUP_DIR)) {
    fs.mkdirSync(BACKUP_DIR, { recursive: true });
  }

  const timestamp = getTimestamp();
  const backupFileName = `backup_${env.DB.NAME}_${timestamp}.sql`;
  const backupFilePath = path.join(BACKUP_DIR, backupFileName);

  const writeStream = fs.createWriteStream(backupFilePath, { encoding: 'utf8' });

  try {
    writeStream.write(`-- ====================================================\n`);
    writeStream.write(`-- BIZMANAGE DATABASE BACKUP\n`);
    writeStream.write(`-- Database: ${env.DB.NAME}\n`);
    writeStream.write(`-- Generated: ${new Date().toISOString()}\n`);
    writeStream.write(`-- ====================================================\n\n`);
    writeStream.write(`SET FOREIGN_KEY_CHECKS = 0;\n\n`);

    // Fetch all tables
    const [tables] = await sequelize.query('SHOW TABLES');
    const tableKey = Object.keys(tables[0])[0];
    const tableNames = tables.map((row) => row[tableKey]);

    console.log(`Found ${tableNames.length} tables to backup.`);
    let totalRows = 0;

    for (const table of tableNames) {
      // 1. Get Table Create DDL
      const [createResult] = await sequelize.query(`SHOW CREATE TABLE \`${table}\``);
      const createTableSql = createResult[0]['Create Table'];

      writeStream.write(`-- ----------------------------------------------------\n`);
      writeStream.write(`-- Table structure for \`${table}\`\n`);
      writeStream.write(`-- ----------------------------------------------------\n`);
      writeStream.write(`DROP TABLE IF EXISTS \`${table}\`;\n\n`);
      writeStream.write(`${createTableSql};\n\n`);

      // 2. Get Table Data
      const [rows] = await sequelize.query(`SELECT * FROM \`${table}\``);
      if (rows.length > 0) {
        totalRows += rows.length;
        writeStream.write(`-- Data for \`${table}\` (${rows.length} rows)\n`);

        const columns = Object.keys(rows[0]).map((c) => `\`${c}\``).join(', ');

        const valueChunks = [];
        for (const row of rows) {
          const formattedValues = Object.values(row).map((val) => {
            if (val === null) return 'NULL';
            if (typeof val === 'number') return val;
            if (typeof val === 'boolean') return val ? 1 : 0;
            if (val instanceof Date) return `'${val.toISOString().slice(0, 19).replace('T', ' ')}'`;
            if (typeof val === 'object') return `'${JSON.stringify(val).replace(/'/g, "''").replace(/\\/g, '\\\\')}'`;
            return `'${val.toString().replace(/'/g, "''").replace(/\\/g, '\\\\')}'`;
          });
          valueChunks.push(`(${formattedValues.join(', ')})`);
        }

        // Batch inserts in chunks of 50 rows
        const chunkSize = 50;
        for (let i = 0; i < valueChunks.length; i += chunkSize) {
          const chunk = valueChunks.slice(i, i + chunkSize);
          writeStream.write(`INSERT INTO \`${table}\` (${columns}) VALUES\n${chunk.join(',\n')};\n\n`);
        }
      }
    }

    writeStream.write(`SET FOREIGN_KEY_CHECKS = 1;\n`);
    writeStream.end();

    await new Promise((resolve) => writeStream.on('finish', resolve));

    const stats = fs.statSync(backupFilePath);
    const sizeKb = (stats.size / 1024).toFixed(2);

    console.log(`\n✅ Backup successfully generated:`);
    console.log(`   File: ${backupFileName}`);
    console.log(`   Size: ${sizeKb} KB`);
    console.log(`   Tables: ${tableNames.length}`);
    console.log(`   Total Records: ${totalRows}`);

    // --- Retention Policy Cleanup ---
    applyRetentionPolicy();

    return backupFilePath;
  } catch (err) {
    console.error('❌ Database Backup Failed:', err.message);
    if (fs.existsSync(backupFilePath)) {
      fs.unlinkSync(backupFilePath);
    }
    throw err;
  }
};

/**
 * Remove backups older than retention days
 */
const applyRetentionPolicy = () => {
  const retentionDays = env.BACKUP.RETENTION_DAYS;
  const cutoffTime = Date.now() - retentionDays * 24 * 60 * 60 * 1000;

  if (!fs.existsSync(BACKUP_DIR)) return;

  const files = fs.readdirSync(BACKUP_DIR);
  let deletedCount = 0;

  for (const file of files) {
    if (file.endsWith('.sql') && file.startsWith(`backup_${env.DB.NAME}_`)) {
      const filePath = path.join(BACKUP_DIR, file);
      const stat = fs.statSync(filePath);
      if (stat.mtimeMs < cutoffTime) {
        fs.unlinkSync(filePath);
        deletedCount++;
        console.log(`🧹 [Retention Policy] Purged expired backup: ${file}`);
      }
    }
  }

  if (deletedCount === 0) {
    console.log(`ℹ️ [Retention Policy] All existing backups are within the ${retentionDays}-day retention window.`);
  }
};

if (require.main === module) {
  backupDatabase().then(() => process.exit(0)).catch(() => process.exit(1));
}

module.exports = backupDatabase;
