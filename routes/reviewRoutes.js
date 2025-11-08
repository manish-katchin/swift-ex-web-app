const express = require('express');
const router = express.Router();
const reviewController = require('../controllers/reviewController');
const { verifyToken } = require('../middleware/authMiddleware');

router.post('/:postId/reviews', reviewController.createReview);
router.get('/:postId/reviews', reviewController.getReviews);
router.put('/reviews/:reviewId',  reviewController.updateReview);
router.delete('/reviews/:reviewId', verifyToken, reviewController.deleteReview);
router.post('/reviews/:reviewId/like',  reviewController.likeReview);
router.post('/reviews/:reviewId/dislike',  reviewController.dislikeReview);

module.exports = router;