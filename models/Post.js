const mongoose = require('mongoose');

const PostSchema = new mongoose.Schema({
  title: {
    type: String,
    required: [true, 'Title is required'],
    trim: true
  },
  slug: {
    type: String,
    unique: true,
    lowercase: true,
    trim: true,
    match: [/^[a-z0-9-]+$/, 'Please enter a valid slug']
  },
  content: {
    type: String,
    required: [true, 'Content is required'],
    trim: true
  },
  tags: {
    type: [String],
    default: []
  },
  date: {
    type: Date,
    default: Date.now
  },
  author: {
    type: mongoose.Schema.Types.ObjectId,
    ref: 'User',
    required: [true, 'Author is required']
  },
  excerpt: {
    type: String,
    required: [true, 'Excerpt is required'],
    trim: true
  },
  imageUrl: {
    type: String,
    trim: true
  },
  reviews: [{
    type: mongoose.Schema.Types.ObjectId,
    ref: 'Review'
  }],
  likes: {
    type: Number,
    default: 0,
    min: [0, 'Likes cannot be negative']
  },
  dislikes: {
    type: Number,
    default: 0,
    min: [0, 'Dislikes cannot be negative']
  }
});

PostSchema.index({ slug: 1 });

module.exports = mongoose.model('Post', PostSchema);