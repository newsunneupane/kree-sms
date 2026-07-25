const express = require('express');
const router = express.Router();
const { User, CreditRequest, PendingRegistration, SmsLog, SystemSetting } = require('../models');
const { sequelize } = require('../models');

router.all('/admin.php', async (req, res, next) => {
  try {
    const input = req.method === 'GET' ? req.query : req.body;
    const action = input.action || '';
    const admin_id = parseInt(input.admin_id, 10);

    if (!admin_id) {
      return res.json({ success: false, message: 'Admin ID required.' });
    }

    const admin = await User.findByPk(admin_id);
    if (!admin || admin.role !== 'admin') {
      return res.json({ success: false, message: 'Access Denied. Admins only.' });
    }

    if (action === 'get_gateway_balance') {
      const gw = await SystemSetting.findByPk('aakash_api_balance');
      const un = await SystemSetting.findByPk('unallocated_system_balance');
      return res.json({
        success: true,
        gateway_balance: gw ? parseInt(gw.value, 10) : 0,
        unallocated_balance: un ? parseInt(un.value, 10) : 0,
      });
    }

    if (action === 'get_requests') {
      const requests = await CreditRequest.findAll({
        include: [{ model: User, attributes: ['name', 'email'] }],
        order: [['id', 'DESC']],
      });
      const data = requests.map(r => ({
        id: r.id, user_id: r.user_id, requested_credits: r.requested_credits,
        payment_reference: r.payment_reference, status: r.status, created_at: r.created_at,
        name: r.User?.name, email: r.User?.email,
      }));
      return res.json({ success: true, data });
    }

    if (action === 'get_users') {
      const users = await User.findAll({
        attributes: ['id', 'name', 'email', 'role', 'sms_balance', 'created_at'],
        order: [['id', 'DESC']],
      });
      return res.json({ success: true, users });
    }

    if (action === 'get_pending_registrations') {
      const pending = await PendingRegistration.findAll({
        where: { status: 'pending_admin_approval' },
        attributes: ['id', 'name', 'email', 'created_at'],
        order: [['id', 'DESC']],
      });
      return res.json({ success: true, pending_users: pending });
    }

    if (action === 'add_gateway_credit') {
      const amount = parseInt(input.credits, 10);
      if (!amount || amount <= 0) {
        return res.json({ success: false, message: 'Valid credit amount required.' });
      }
      const setting = await SystemSetting.findByPk('unallocated_system_balance');
      if (setting) {
        setting.value = String(parseInt(setting.value, 10) + amount);
        await setting.save();
      } else {
        await SystemSetting.create({ key: 'unallocated_system_balance', value: String(amount) });
      }
      return res.json({ success: true, message: `Added ${amount} credits to Unallocated System Stock Pool.` });
    }

    if (action === 'approve_request') {
      const t = await sequelize.transaction();
      try {
        const reqId = parseInt(input.request_id, 10);
        const creditReq = await CreditRequest.findByPk(reqId, { lock: t.LOCK.UPDATE, transaction: t });
        if (!creditReq || creditReq.status !== 'pending') {
          await t.rollback();
          return res.json({ success: false, message: 'Request not found or already processed.' });
        }
        const targetUser = await User.scope(null).findByPk(creditReq.user_id, { transaction: t });
        targetUser.sms_balance += creditReq.requested_credits;
        await targetUser.save({ transaction: t });

        const unalloc = await SystemSetting.findByPk('unallocated_system_balance', { transaction: t });
        if (unalloc) {
          unalloc.value = String(parseInt(unalloc.value, 10) - creditReq.requested_credits);
          await unalloc.save({ transaction: t });
        }
        creditReq.status = 'approved';
        await creditReq.save({ transaction: t });
        await SmsLog.create({
          user_id: creditReq.user_id, sms_type: 'credit_allocation', recipient: 'SYSTEM',
          message: `Allocated ${creditReq.requested_credits} credits via request ID: ${reqId}`,
          status: 'success', gateway_response: 'Admin approval complete.',
        }, { transaction: t });
        await t.commit();
        return res.json({ success: true, message: 'Order verified and processed successfully!' });
      } catch (err) {
        await t.rollback();
        throw err;
      }
    }

    if (action === 'approve_new_user') {
      const t = await sequelize.transaction();
      try {
        const regId = parseInt(input.registration_id, 10);
        const pending = await PendingRegistration.findByPk(regId, { lock: t.LOCK.UPDATE, transaction: t });
        if (!pending || pending.status !== 'pending_admin_approval') {
          await t.rollback();
          return res.json({ success: false, message: 'Staged account not found or already settled.' });
        }
        await User.create({
          name: pending.name, email: pending.email, password: pending.password,
          role: 'user', sms_balance: 0,
        }, { hooks: false, transaction: t });
        await pending.destroy({ transaction: t });
        await t.commit();
        return res.json({ success: true, message: 'User approved and registered.' });
      } catch (err) {
        await t.rollback();
        throw err;
      }
    }

    return res.json({ success: false, message: 'Unknown admin action.' });
  } catch (error) {
    next(error);
  }
});

module.exports = router;