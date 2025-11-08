const express = require('express');
const router = express.Router();
const postController = require('../controllers/postController');
const { verifyToken } = require('../middleware/authMiddleware');

router.get('/', postController.getPosts);
router.get('/:id', postController.getPost);
router.post('/', verifyToken, postController.createPost);
router.put('/:id', verifyToken, postController.updatePost);
router.delete('/:id', verifyToken, postController.deletePost);



module.exports = router;
