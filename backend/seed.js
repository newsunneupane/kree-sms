const { User, SystemSetting } = require('./models');

async function seedAdmin() {
  const adminEmail = 'admin@kreesms.com';
  const existing = await User.findOne({ where: { email: adminEmail } });
  if (!existing) {
    await User.create({
      name: 'Admin',
      email: adminEmail,
      password: 'Admin@123',
      role: 'admin',
      sms_balance: 100,
    });
    console.log('[Seed] Admin user created (admin@kreesms.com / Admin@123)');
  }

  await SystemSetting.findOrCreate({ where: { key: 'aakash_api_balance' }, defaults: { value: '0' } });
  await SystemSetting.findOrCreate({ where: { key: 'unallocated_system_balance' }, defaults: { value: '0' } });
  console.log('[Seed] System settings initialized.');
}

async function runSeed() {
  const { sequelize } = require('./models');
  await sequelize.authenticate();
  await sequelize.sync();
  await seedAdmin();
  process.exit(0);
}

if (require.main === module) {
  runSeed().catch(err => {
    console.error('[Seed] Error:', err);
    process.exit(1);
  });
}

module.exports = { seedAdmin };