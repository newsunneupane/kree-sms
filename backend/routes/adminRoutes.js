const express = require('express');
const router = express.Router();
const {
  getRequests, getGatewayBalance, addGatewayCredit, approveRequest,
  getPendingRegistrations, approveNewUser, getUsers,
} = require('../controllers/adminController');
const { approveRequestValidation } = require('../validators/schemas');
const validate = require('../middleware/validate');

router.get('/users', getUsers);
router.get('/requests', getRequests);
router.get('/gateway-balance', getGatewayBalance);
router.get('/pending-registrations', getPendingRegistrations);
router.post('/add-credit', addGatewayCredit);
router.post('/approve-request', approveRequest);
router.post('/approve-user', approveNewUser);

module.exports = router;