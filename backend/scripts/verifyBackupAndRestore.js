'use strict';
const backupDatabase = require('./backupDatabase');
const restoreDatabase = require('./restoreDatabase');
const { sequelize } = require('../models');

/**
 * Automated Drill: Verifies both Backup creation and Restoration integrity
 */
const verifyBackupAndRestoreDrill = async () => {
  console.log('====================================================');
  console.log('🧪 RUNNING PRODUCTION BACKUP & RESTORE DRILL TEST');
  console.log('====================================================\n');

  try {
    // 1. Get initial row count across critical tables
    const [initialUsers] = await sequelize.query('SELECT COUNT(*) as count FROM users');
    const [initialBiz] = await sequelize.query('SELECT COUNT(*) as count FROM businesses');
    const [initialTx] = await sequelize.query('SELECT COUNT(*) as count FROM transactions');
    console.log(`[Baseline Audit] Users: ${initialUsers[0].count}, Businesses: ${initialBiz[0].count}, Transactions: ${initialTx[0].count}`);

    // 2. Perform Backup
    console.log('\nStep 1: Creating snapshot backup...');
    const backupFilePath = await backupDatabase();

    // 3. Perform Restore Drill
    console.log('\nStep 2: Executing restore procedure using snapshot...');
    const restoreResult = await restoreDatabase(backupFilePath);

    // 4. Verify post-restore counts
    const [postUsers] = await sequelize.query('SELECT COUNT(*) as count FROM users');
    const [postBiz] = await sequelize.query('SELECT COUNT(*) as count FROM businesses');
    const [postTx] = await sequelize.query('SELECT COUNT(*) as count FROM transactions');
    console.log(`\n[Post-Restore Audit] Users: ${postUsers[0].count}, Businesses: ${postBiz[0].count}, Transactions: ${postTx[0].count}`);

    if (
      Number(initialUsers[0].count) === Number(postUsers[0].count) &&
      Number(initialBiz[0].count) === Number(postBiz[0].count) &&
      Number(initialTx[0].count) === Number(postTx[0].count)
    ) {
      console.log('\n🎉 [DRILL VERIFIED] Backup & Restore procedure verified with 100% data integrity!');
    } else {
      throw new Error('Data count mismatch detected between pre-backup and post-restore state!');
    }

  } catch (err) {
    console.error('\n❌ Backup & Restore Drill Failed:', err.message);
    process.exit(1);
  }
};

if (require.main === module) {
  verifyBackupAndRestoreDrill().then(() => process.exit(0));
}

module.exports = verifyBackupAndRestoreDrill;
