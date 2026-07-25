const express = require('express');
const router = express.Router();
const { CreditRequest } = require('../models');

router.get('/getuser_history.php', async (req, res, next) => {
  try {
    const user_id = parseInt(req.query.user_id, 10);
    if (!user_id) {
      return res.status(400).json({ success: false, message: 'Unauthorized access request.' });
    }
    const purchases = await CreditRequest.findAll({
      where: { user_id },
      order: [['id', 'DESC']],
    });
    res.json({ success: true, data: purchases });
  } catch (error) {
    next(error);
  }
});

module.exports = router;