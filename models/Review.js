const mongoose = require('mongoose');

const ReviewSchema = new mongoose.Schema({
  content: {
    type: String,
    required: true,
    validate: {
      validator: function(v) {
        const wordCount = v.trim().split(/\s+/).length;
        return wordCount >= 20 && wordCount <= 200;
      },
      message: props => `Review must be between 20 and 200 words. Current word count: ${props.value.trim().split(/\s+/).length}`
    }
  },
  rating: {
    type: Number,
    required: true,
    min: 1,
    max: 5
  },
  author: { type: mongoose.Schema.Types.ObjectId, ref: 'User', required: true },
  post: { type: mongoose.Schema.Types.ObjectId, ref: 'Post', required: true },
  date: { type: Date, default: Date.now },
  likes: { type: Number, default: 0 },
  dislikes: { type: Number, default: 0 }
});

module.exports = mongoose.model('Review', ReviewSchema);