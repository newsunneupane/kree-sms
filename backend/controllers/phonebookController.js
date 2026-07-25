const { Contact, Group, ContactGroupRelation } = require('../models');
const { sequelize } = require('../models');

exports.getPhonebook = async (req, res, next) => {
  try {
    const { user_id } = req.query;
    const page = parseInt(req.query.page, 10) || 1;
    const limit = parseInt(req.query.limit, 10) || 25;
    const offset = (page - 1) * limit;

    const groups = await Group.findAll({
      where: { user_id },
      order: [['group_name', 'ASC']],
    });

    const totalContacts = await Contact.count({ where: { user_id } });

    const contacts = await Contact.findAll({
      where: { user_id },
      include: [{
        model: Group,
        through: { attributes: [] },
        attributes: ['group_name'],
      }],
      order: [['id', 'DESC']],
      limit,
      offset,
    });

    const formattedContacts = contacts.map(c => ({
      id: c.id,
      firstname: c.firstname,
      lastname: c.lastname,
      mobile: c.mobile,
      group_name: c.Groups.length > 0
        ? c.Groups.map(g => g.group_name).join(', ')
        : 'Unassigned Pool',
    }));

    res.json({
      success: true,
      groups,
      contacts: formattedContacts,
      total_contacts: totalContacts,
    });
  } catch (error) {
    next(error);
  }
};

exports.addContact = async (req, res, next) => {
  try {
    const { user_id, firstname, lastname, mobile } = req.body;
    await Contact.create({ user_id, firstname, lastname, mobile });
    res.json({ success: true, message: 'Contact added!' });
  } catch (error) {
    next(error);
  }
};

exports.addBulkContacts = async (req, res, next) => {
  try {
    const { user_id, contacts } = req.body;
    if (!contacts || contacts.length === 0) {
      return res.status(400).json({ success: false, message: 'No contacts to import.' });
    }

    const validContacts = contacts.filter(c => c.firstname?.trim() && c.mobile?.trim());
    if (validContacts.length === 0) {
      return res.status(400).json({ success: false, message: 'No valid contacts found in data.' });
    }

    const bulkData = validContacts.map(c => ({
      user_id,
      firstname: c.firstname.trim(),
      lastname: (c.lastname || '').trim(),
      mobile: c.mobile.trim(),
    }));

    await Contact.bulkCreate(bulkData);
    res.json({ success: true, message: `Imported ${validContacts.length} contacts.` });
  } catch (error) {
    next(error);
  }
};

exports.addGroupWithRelations = async (req, res, next) => {
  const t = await sequelize.transaction();
  try {
    const { user_id, group_name, description, contact_ids } = req.body;

    if (!group_name?.trim()) {
      await t.rollback();
      return res.status(400).json({ success: false, message: 'Group name is required.' });
    }
    if (!contact_ids || contact_ids.length === 0) {
      await t.rollback();
      return res.status(400).json({ success: false, message: 'Select at least one contact.' });
    }

    const group = await Group.create({ user_id, group_name, description }, { transaction: t });

    const relations = contact_ids.map(cid => ({
      contact_id: parseInt(cid, 10),
      group_id: group.id,
    }));
    await ContactGroupRelation.bulkCreate(relations, { ignoreDuplicates: true, transaction: t });

    await t.commit();
    res.json({ success: true, message: 'Group created and populated!' });
  } catch (error) {
    await t.rollback();
    next(error);
  }
};

exports.getGroupContacts = async (req, res, next) => {
  try {
    const { group_id, user_id } = req.query;

    if (!group_id) {
      return res.status(400).json({ success: false, message: 'Group ID required.' });
    }

    const contacts = await Contact.findAll({
      include: [{
        model: Group,
        through: { attributes: [] },
        where: { id: parseInt(group_id, 10) },
        required: true,
      }],
      where: { user_id: parseInt(user_id, 10) },
      order: [['firstname', 'ASC']],
    });

    res.json({
      success: true,
      members: contacts.map(c => ({
        id: c.id,
        firstname: c.firstname,
        lastname: c.lastname,
        mobile: c.mobile,
      })),
    });
  } catch (error) {
    next(error);
  }
};