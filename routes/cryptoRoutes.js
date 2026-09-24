const express = require('express');
const router = express.Router();
const cryptoController = require('../controllers/cryptoController');
const { cryptoLimiter, coinDetailLimiter } = require('../middleware/rateLimiter');

router.use(cryptoLimiter);

router.get('/coins', cryptoController.getCoins);
router.get('/coin/:id', coinDetailLimiter, cryptoController.getCoinDetail);
router.get('/chart/:id', coinDetailLimiter, cryptoController.getCoinChart);
router.get('/health', cryptoController.getHealth);

module.exports = router;
