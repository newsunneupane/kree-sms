const express = require('express');
const router = express.Router();
const { Contact, Group, ContactGroupRelation } = require('../models');
const { sequelize } = require('../models');
const { Op } = require('sequelize');

router.all('/phonebook.php', async (req, res, next) => {
  try {
    const input = req.method === 'GET' ? req.query : req.body;
    const action = input.action || req.query.action || '';
    const user_id = parseInt(input.user_id || req.query.user_id, 10);

    if (!user_id) {
      return res.json({ success: false, message: 'Unauthorized access request.' });
    }

    if (action === 'get_phonebook') {
      const page = parseInt(input.page || req.query.page, 10) || 1;
      const limit = parseInt(input.limit || req.query.limit, 10) || 25;
      const offset = (page - 1) * limit;

      const groups = await Group.findAll({ where: { user_id }, order: [['group_name', 'ASC']] });
      const totalContacts = await Contact.count({ where: { user_id } });
      const contacts = await Contact.findAll({
        where: { user_id },
        include: [{ model: Group, through: { attributes: [] }, attributes: ['group_name'] }],
        order: [['id', 'DESC']],
        limit, offset,
      });

      const formatted = contacts.map(c => ({
        id: c.id, firstname: c.firstname, lastname: c.lastname, mobile: c.mobile,
        group_name: c.Groups.length > 0 ? c.Groups.map(g => g.group_name).join(', ') : 'Unassigned Pool',
      }));

      return res.json({ success: true, groups, contacts: formatted, total_contacts: totalContacts });
    }

    if (action === 'add_contact') {
      const { firstname, lastname, mobile } = input;
      if (!firstname?.trim() || !mobile?.trim()) {
        return res.json({ success: false, message: 'First name and mobile number required.' });
      }
      await Contact.create({ user_id, firstname: firstname.trim(), lastname: (lastname || '').trim(), mobile: mobile.trim() });
      return res.json({ success: true, message: 'Contact added to directory!' });
    }

    if (action === 'add_bulk_contacts') {
      const incoming = input.contacts || [];
      if (!incoming.length) {
        return res.json({ success: false, message: 'No parsed upload records detected.' });
      }
      const valid = incoming.filter(c => c.firstname?.trim() && c.mobile?.trim());
      if (!valid.length) {
        return res.json({ success: false, message: 'No valid contacts found.' });
      }
      await Contact.bulkCreate(valid.map(c => ({
        user_id, firstname: c.firstname.trim(), lastname: (c.lastname || '').trim(), mobile: c.mobile.trim(),
      })));
      return res.json({ success: true, message: 'Successfully injected bulk contacts!' });
    }

    if (action === 'add_group_with_relations') {
      const { group_name, description, contact_ids } = input;
      if (!group_name?.trim()) {
        return res.json({ success: false, message: 'Group name cannot be blank.' });
      }
      if (!contact_ids || !contact_ids.length) {
        return res.json({ success: false, message: 'Please select at least one contact.' });
      }
      const t = await sequelize.transaction();
      try {
        const group = await Group.create({ user_id, group_name, description }, { transaction: t });
        const relations = contact_ids.map(cid => ({ contact_id: parseInt(cid, 10), group_id: group.id }));
        await ContactGroupRelation.bulkCreate(relations, { ignoreDuplicates: true, transaction: t });
        await t.commit();
        return res.json({ success: true, message: 'Group assembled and populated smoothly!' });
      } catch (err) {
        await t.rollback();
        throw err;
      }
    }

    if (action === 'get_group_contacts') {
      const groupId = parseInt(input.group_id || req.query.group_id, 10);
      if (!groupId) {
        return res.json({ success: false, message: 'Missing group ID.' });
      }
      const members = await Contact.findAll({
        include: [{
          model: Group, through: { attributes: [] }, where: { id: groupId }, required: true,
        }],
        where: { user_id },
        order: [['firstname', 'ASC']],
      });
      return res.json({
        success: true,
        members: members.map(c => ({ id: c.id, firstname: c.firstname, lastname: c.lastname, mobile: c.mobile })),
      });
    }

    return res.json({ success: false, message: 'Unknown phonebook action.' });
  } catch (error) {
    next(error);
  }
});

module.exports = router;