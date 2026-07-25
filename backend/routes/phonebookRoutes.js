const express = require('express');
const router = express.Router();
const {
  getPhonebook, addContact, addBulkContacts,
  addGroupWithRelations, getGroupContacts,
} = require('../controllers/phonebookController');
const { addContactValidation } = require('../validators/schemas');
const validate = require('../middleware/validate');

router.get('/get-phonebook', getPhonebook);
router.get('/get-group-contacts', getGroupContacts);
router.post('/add-contact', addContact);
router.post('/add-bulk-contacts', addBulkContacts);
router.post('/add-group-with-relations', addGroupWithRelations);

module.exports = router;