const { sequelize } = require('./models');

async function migrate() {
  try {
    await sequelize.authenticate();
    console.log('[Migrate] Database connected.');

    await sequelize.sync({ alter: true });
    console.log('[Migrate] Tables synced (alter mode).');

    process.exit(0);
  } catch (err) {
    console.error('[Migrate] Error:', err);
    process.exit(1);
  }
}

migrate();