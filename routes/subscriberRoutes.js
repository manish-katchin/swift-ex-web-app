const express = require('express');
const router = express.Router();
const subscriberService = require('../controllers/subscriberController');

// POST route 
router.post('/', async (req, res) => {
  const { email } = req.body;
  if (!email) {
    return res.status(400).json({ success: false, message: 'Email is required' });
  }

  const result = await subscriberService.addSubscriber(email);
  res.status(result.success ? 201 : 400).json(result);
});

// GET route 
router.get('/', async (req, res) => {
  const result = await subscriberService.getSubscribers();
  res.status(result.success ? 200 : 500).json(result);
});

module.exports = router;
