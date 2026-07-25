const { User, PendingRegistration, CreditRequest, SmsLog, SystemSetting } = require('../models');
const { sequelize } = require('../models');

exports.getRequests = async (req, res, next) => {
  try {
    const requests = await CreditRequest.findAll({
      include: [{ model: User, attributes: ['name', 'email'] }],
      order: [['id', 'DESC']],
    });
    const data = requests.map(r => ({
      id: r.id,
      user_id: r.user_id,
      requested_credits: r.requested_credits,
      payment_reference: r.payment_reference,
      status: r.status,
      created_at: r.created_at,
      name: r.User?.name,
      email: r.User?.email,
    }));
    res.json({ success: true, data });
  } catch (error) {
    next(error);
  }
};

exports.getGatewayBalance = async (req, res, next) => {
  try {
    const gatewaySetting = await SystemSetting.findByPk('aakash_api_balance');
    const unallocatedSetting = await SystemSetting.findByPk('unallocated_system_balance');

    res.json({
      success: true,
      gateway_balance: gatewaySetting ? parseInt(gatewaySetting.value, 10) : 0,
      unallocated_balance: unallocatedSetting ? parseInt(unallocatedSetting.value, 10) : 0,
    });
  } catch (error) {
    next(error);
  }
};

exports.addGatewayCredit = async (req, res, next) => {
  try {
    const { credits } = req.body;
    const amount = parseInt(credits, 10);
    if (!amount || amount <= 0) {
      return res.status(400).json({ success: false, message: 'Valid credit amount required.' });
    }

    const setting = await SystemSetting.findByPk('unallocated_system_balance');
    if (setting) {
      setting.value = String(parseInt(setting.value, 10) + amount);
      await setting.save();
    } else {
      await SystemSetting.create({ key: 'unallocated_system_balance', value: String(amount) });
    }

    res.json({ success: true, message: `Added ${amount} credits to Unallocated System Stock Pool.` });
  } catch (error) {
    next(error);
  }
};

exports.approveRequest = async (req, res, next) => {
  const t = await sequelize.transaction();
  try {
    const { request_id } = req.body;

    const creditReq = await CreditRequest.findByPk(request_id, {
      lock: t.LOCK.UPDATE,
      transaction: t,
    });

    if (!creditReq || creditReq.status !== 'pending') {
      await t.rollback();
      return res.status(400).json({ success: false, message: 'Request not found or already processed.' });
    }

    const user = await User.scope(null).findByPk(creditReq.user_id, { transaction: t });
    user.sms_balance += creditReq.requested_credits;
    await user.save({ transaction: t });

    const unallocSetting = await SystemSetting.findByPk('unallocated_system_balance', { transaction: t });
    if (unallocSetting) {
      unallocSetting.value = String(parseInt(unallocSetting.value, 10) - creditReq.requested_credits);
      await unallocSetting.save({ transaction: t });
    }

    creditReq.status = 'approved';
    await creditReq.save({ transaction: t });

    await SmsLog.create({
      user_id: creditReq.user_id,
      sms_type: 'credit_allocation',
      recipient: 'SYSTEM',
      message: `Allocated ${creditReq.requested_credits} credits via request ID: ${request_id}`,
      status: 'success',
      gateway_response: 'Admin approval complete.',
    }, { transaction: t });

    await t.commit();
    res.json({ success: true, message: 'Request approved. Credits transferred.' });
  } catch (error) {
    await t.rollback();
    next(error);
  }
};

exports.getUsers = async (req, res, next) => {
  try {
    const users = await User.findAll({
      attributes: ['id', 'name', 'email', 'role', 'sms_balance', 'created_at'],
      order: [['id', 'DESC']],
    });
    res.json({ success: true, users });
  } catch (error) {
    next(error);
  }
};

exports.getPendingRegistrations = async (req, res, next) => {
  try {
    const pending = await PendingRegistration.findAll({
      where: { status: 'pending_admin_approval' },
      attributes: ['id', 'name', 'email', 'created_at'],
      order: [['id', 'DESC']],
    });
    res.json({ success: true, pending_users: pending });
  } catch (error) {
    next(error);
  }
};

exports.approveNewUser = async (req, res, next) => {
  const t = await sequelize.transaction();
  try {
    const { registration_id } = req.body;

    const pending = await PendingRegistration.findByPk(registration_id, {
      lock: t.LOCK.UPDATE,
      transaction: t,
    });

    if (!pending || pending.status !== 'pending_admin_approval') {
      await t.rollback();
      return res.status(400).json({ success: false, message: 'Registration not found or already processed.' });
    }

    await User.create({
      name: pending.name,
      email: pending.email,
      password: pending.password,
      role: 'user',
      sms_balance: 0,
    }, { hooks: false, transaction: t });

    await pending.destroy({ transaction: t });
    await t.commit();

    res.json({ success: true, message: 'User approved and registered.' });
  } catch (error) {
    await t.rollback();
    next(error);
  }
};