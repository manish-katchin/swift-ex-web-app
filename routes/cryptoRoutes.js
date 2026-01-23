const express = require('express');
const router = express.Router();
const cryptoController = require('../controllers/cryptoController');

router.get('/coins', cryptoController.getCoins);
router.get('/coin/:id', cryptoController.getCoinDetail);
router.get('/chart/:id', cryptoController.getCoinChart);
router.get('/health', cryptoController.getHealth);

module.exports = router;
