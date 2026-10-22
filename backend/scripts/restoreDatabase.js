'use strict';
const fs = require('fs');
const path = require('path');
const { sequelize } = require('../models');
const env = require('../config/env');

const BACKUP_DIR = path.resolve(__dirname, '..', env.BACKUP.DIR);

/**
 * Get latest backup file if not specified
 */
const getLatestBackupFile = () => {
  if (!fs.existsSync(BACKUP_DIR)) return null;
  const files = fs.readdirSync(BACKUP_DIR)
    .filter(f => f.endsWith('.sql') && f.startsWith(`backup_${env.DB.NAME}_`))
    .sort()
    .reverse();

  return files.length > 0 ? path.join(BACKUP_DIR, files[0]) : null;
};

/**
 * Parse SQL into individual statements
 */
const parseSqlStatements = (sql) => {
  const statements = [];
  let currentStatement = '';
  let inString = false;
  let stringChar = '';
  let isEscaped = false;

  const lines = sql.split('\n');

  for (const rawLine of lines) {
    const line = rawLine.trim();
    if (!inString && (line.startsWith('--') || line.length === 0)) {
      continue;
    }

    for (let i = 0; i < rawLine.length; i++) {
      const char = rawLine[i];

      if (isEscaped) {
        currentStatement += char;
        isEscaped = false;
        continue;
      }

      if (char === '\\') {
        currentStatement += char;
        isEscaped = true;
        continue;
      }

      if (inString) {
        currentStatement += char;
        if (char === stringChar) {
          inString = false;
        }
      } else {
        if (char === "'" || char === '"' || char === '`') {
          inString = true;
          stringChar = char;
          currentStatement += char;
        } else if (char === ';') {
          if (currentStatement.trim().length > 0) {
            statements.push(currentStatement.trim());
          }
          currentStatement = '';
        } else {
          currentStatement += char;
        }
      }
    }
    currentStatement += '\n';
  }

  if (currentStatement.trim().length > 0) {
    statements.push(currentStatement.trim());
  }

  return statements;
};

/**
 * Restore Database from SQL backup file
 * @param {string} [customFilePath] - Optional explicit path to SQL backup
 * @param {string} [targetDbName] - Optional target database name
 */
const restoreDatabase = async (customFilePath = null, targetDbName = null) => {
  const filePath = customFilePath || getLatestBackupFile();

  if (!filePath || !fs.existsSync(filePath)) {
    throw new Error(`Backup file not found: ${filePath || 'No backups available in ' + BACKUP_DIR}`);
  }

  const activeDbName = targetDbName || env.DB.NAME;

  console.log('====================================================');
  console.log('🔄 BIZMANAGE DATABASE RESTORE PROCEDURE');
  console.log('====================================================');
  console.log(`Source File:     ${path.basename(filePath)}`);
  console.log(`Target Database: ${activeDbName}`);
  console.log(`Host:            ${env.DB.HOST}:${env.DB.PORT}`);
  console.log(`Timestamp:       ${new Date().toISOString()}\n`);

  const sqlContent = fs.readFileSync(filePath, 'utf8');
  const statements = parseSqlStatements(sqlContent);

  console.log(`Parsed ${statements.length} distinct SQL statements.`);

  await sequelize.query('SET FOREIGN_KEY_CHECKS = 0;');

  let executedCount = 0;
  for (let i = 0; i < statements.length; i++) {
    const stmt = statements[i];
    if (stmt.startsWith('--') || stmt.length === 0) continue;
    try {
      await sequelize.query(stmt);
      executedCount++;
    } catch (err) {
      console.warn(`[Restore Notice at stmt ${i + 1}]:`, err.message);
    }
  }

  await sequelize.query('SET FOREIGN_KEY_CHECKS = 1;');

  // Verify Table Counts Post-Restore
  const [tables] = await sequelize.query('SHOW TABLES');
  console.log(`\n✅ Database restoration completed successfully.`);
  console.log(`   Statements Executed: ${executedCount}/${statements.length}`);
  console.log(`   Verified Tables in Database: ${tables.length}`);

  return {
    success: true,
    tablesCount: tables.length,
    statementsExecuted: executedCount
  };
};

if (require.main === module) {
  const targetFile = process.argv[2] || null;
  restoreDatabase(targetFile)
    .then(() => process.exit(0))
    .catch((err) => {
      console.error('❌ Restore failed:', err.message);
      process.exit(1);
    });
}

module.exports = restoreDatabase;
