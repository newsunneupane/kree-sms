const { body } = require('express-validator');

const registerValidation = [
  body('name').trim().notEmpty().withMessage('Name is required.'),
  body('email').trim().isEmail().withMessage('Valid email is required.'),
  body('password').isLength({ min: 6 }).withMessage('Password must be at least 6 characters.'),
];

const loginValidation = [
  body('email').trim().isEmail().withMessage('Valid email is required.'),
  body('password').notEmpty().withMessage('Password is required.'),
];

const sendSmsValidation = [
  body('user_id').isInt().withMessage('User ID is required.'),
  body('sms_type').isIn(['single', 'bulk', 'dynamic']).withMessage('Invalid SMS type.'),
  body('to').if(body('sms_type').equals('single')).trim().notEmpty().withMessage('Recipient number is required.'),
  body('message').if(body('sms_type').equals('single')).trim().notEmpty().withMessage('Message is required.'),
];

const buyCreditsValidation = [
  body('user_id').isInt().withMessage('User ID is required.'),
  body('credits').isInt({ min: 1 }).withMessage('Credits must be a positive number.'),
  body('reference').trim().notEmpty().withMessage('Payment reference is required.'),
];

const addContactValidation = [
  body('user_id').isInt().withMessage('User ID is required.'),
  body('firstname').trim().notEmpty().withMessage('First name is required.'),
  body('mobile').trim().notEmpty().withMessage('Mobile number is required.'),
];

const approveRequestValidation = [
  body('admin_id').isInt().withMessage('Admin ID is required.'),
  body('request_id').isInt().withMessage('Request ID is required.'),
];

module.exports = {
  registerValidation,
  loginValidation,
  sendSmsValidation,
  buyCreditsValidation,
  addContactValidation,
  approveRequestValidation,
};