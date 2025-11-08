const Review = require('../models/Review');
const Post = require('../models/Post');

exports.createReview = async (req, res) => {
  try {
    const { content, rating } = req.body;
    console.log(req.body , 'hii i am requjest body')
    const postId = req.params.postId;

    console.log(postId, 'hii i am post id --------------')
    const post = await Post.findById(postId);
    if (!post) {
      return res.status(404).json({ message: 'Post not found' });
    }

    const newReview = new Review({
      content,
      rating,
      author: req.User._id,
      post: postId
    });

    const savedReview = await newReview.save();
    post.reviews.push(savedReview._id);
    await post.save();

    res.status(201).json(savedReview);
  } catch (err) {
    console.error('Error creating review:', err);
    if (err.name === 'ValidationError') {
      return res.status(400).json({ message: err.message });
    }
    res.status(500).json({ message: 'Server error' });
  }
};

exports.getReviews = async (req, res) => {
  try {
    console.log("hello world")
    const postId = req.params.postId;
    const reviews = await Review.find({ post: postId })
      .populate('author', 'username')
      .sort({ date: -1 });

    res.status(200).json(reviews);
  } catch (err) {
    console.error('Error fetching reviews:', err);
    res.status(500).json({ message: 'Server error' });
  }
};

exports.updateReview = async (req, res) => {
  try {
    const { content, rating } = req.body;
    const reviewId = req.params.reviewId;

    const review = await Review.findById(reviewId);
    if (!review) {
      return res.status(404).json({ message: 'Review not found' });
    }

    if (review.author.toString() !== req.user.id) {
      return res.status(403).json({ message: 'Unauthorized action' });
    }

    review.content = content || review.content;
    review.rating = rating || review.rating;

    const updatedReview = await review.save();
    res.status(200).json(updatedReview);
  } catch (err) {
    console.error('Error updating review:', err);
    if (err.name === 'ValidationError') {
      return res.status(400).json({ message: err.message });
    }
    res.status(500).json({ message: 'Server error' });
  }
};

exports.deleteReview = async (req, res) => {
  try {
    const reviewId = req.params.reviewId;
    const review = await Review.findById(reviewId);

    if (!review) {
      return res.status(404).json({ message: 'Review not found' });
    }

    if (review.author.toString() !== req.user.id) {
      return res.status(403).json({ message: 'Unauthorized action' });
    }

    await Review.findByIdAndDelete(reviewId);
    
    // Remove the review from the post's reviews array
    await Post.findByIdAndUpdate(review.post, { $pull: { reviews: reviewId } });

    res.status(200).json({ message: 'Review deleted successfully' });
  } catch (err) {
    console.error('Error deleting review:', err);
    res.status(500).json({ message: 'Server error' });
  }
};

exports.likeReview = async (req, res) => {
  try {
    const reviewId = req.params.reviewId;
    const review = await Review.findById(reviewId);

    if (!review) {
      return res.status(404).json({ message: 'Review not found' });
    }

    review.likes += 1;
    await review.save();

    res.status(200).json({ likes: review.likes });
  } catch (err) {
    console.error('Error liking review:', err);
    res.status(500).json({ message: 'Server error' });
  }
};

exports.dislikeReview = async (req, res) => {
  try {
    const reviewId = req.params.reviewId;
    const review = await Review.findById(reviewId);

    if (!review) {
      return res.status(404).json({ message: 'Review not found' });
    }

    review.dislikes += 1;
    await review.save();

    res.status(200).json({ dislikes: review.dislikes });
  } catch (err) {
    console.error('Error disliking review:', err);
    res.status(500).json({ message: 'Server error' });
  }
};