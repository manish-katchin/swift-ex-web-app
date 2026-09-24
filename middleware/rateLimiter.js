const rateLimit = require('express-rate-limit');

const cryptoLimiter = rateLimit({
    windowMs: 60 * 1000,
    max: 120,
    standardHeaders: true,
    legacyHeaders: false,
    validate: { xForwardedForHeader: false },
    message: {
        success: false,
        error: 'Too many requests, please try again later.'
    }
});

const coinDetailLimiter = rateLimit({
    windowMs: 60 * 1000,
    max: 60,
    standardHeaders: true,
    legacyHeaders: false,
    validate: { xForwardedForHeader: false },
    message: {
        success: false,
        error: 'Too many requests for coin details, please try again later.'
    }
});

module.exports = {
    cryptoLimiter,
    coinDetailLimiter
};
