const Post = require('../models/Post');
const slugify = require('slugify');

exports.getPosts = async (req, res) => {
  try {
    let query = {};
    if (req.query.tags) {
      const tags = req.query.tags.split(',').map(tag => tag.trim());
      query.tags = { $in: tags };
    }

    if (req.query.search) {
      const searchRegex = new RegExp(req.query.search, 'i');
      query.$or = [
        { title: searchRegex },
        { content: searchRegex },
        { excerpt: searchRegex }
      ];
    }
    const page = parseInt(req.query.page) || 1;
    const limit = parseInt(req.query.limit) || 10;
    const skip = (page - 1) * limit;

    const posts = await Post.find(query)
      .populate('author', 'username')
      .sort({ date: -1 })
      .skip(skip)
      .limit(limit);

    const totalPosts = await Post.countDocuments(query);
    const totalPages = Math.ceil(totalPosts / limit);

    res.status(200).json({
      posts,
      pagination: {
        totalPosts,
        currentPage: page,
        totalPages,
        hasNextPage: page < totalPages,
        hasPreviousPage: page > 1
      }
    });
  } catch (err) {
    console.error('Error fetching posts:', { message: err.message, stack: err.stack });
    res.status(500).json({
      message: 'Server error',
      error: process.env.NODE_ENV === 'development' ? err.message : undefined
    });
  }
};

exports.getPost = async (req, res) => {
  try {
    const { id } = req.params;

    if (!id) {
      return res.status(400).json({ message: 'Post ID is required' });
    }
    const isObjectId = /^[0-9a-fA-F]{24}$/.test(id);

    let query;
    if (isObjectId) {
      query = { _id: id };
    } else {
      query = { slug: id };
    }

    const post = await Post.findOne(query).populate('author', 'username');

    if (!post) {
      return res.status(404).json({ message: 'Post not found' });
    }

    res.status(200).json({
      message: 'Post retrieved successfully',
      post
    });
  } catch (err) {
    console.error('Error fetching post:', {
      id: req.params.id,
      message: err.message,
      stack: err.stack
    });
    res.status(500).json({
      message: 'Server error',
      error: process.env.NODE_ENV === 'development' ? err.message : undefined
    });
  }
};
exports.createPost = async (req, res) => {
  try {
    const { title, content, tags, excerpt, imageUrl } = req.body;
    if (!title || !content || !excerpt) {
      return res.status(400).json({
        message: 'Title, content, and excerpt are required'
      });
    }
    if (!req.user || !req.user.id) {
      return res.status(401).json({ message: 'User authentication required' });
    }

    const baseSlug = slugify(title, { lower: true, strict: true, trim: true });

    const existingPost = await Post.findOne({ slug: baseSlug });
    if (existingPost) {
      return res.status(400).json({
        message: 'A post with this title already exists. Please use a different title.'
      });
    }
    const newPost = new Post({
      title,
      slug: baseSlug,
      content,
      tags: Array.isArray(tags) ? tags : (tags ? [tags] : []),
      excerpt,
      imageUrl: imageUrl || null,
      author: req.user.id
    });

    const post = await newPost.save();
    await post.populate('author', 'username');

    res.status(201).json({
      message: 'Post created successfully',
      post
    });
  } catch (err) {
    console.error('Error creating post:', { message: err.message, stack: err.stack });
    res.status(500).json({
      message: 'Server error',
      error: process.env.NODE_ENV === 'development' ? err.message : undefined
    });
  }
};

exports.updatePost = async (req, res) => {
  try {
    const { id } = req.params;
    const { content, tags, excerpt, imageUrl } = req.body;

    if (!id) {
      return res.status(400).json({ message: 'Post ID is required' });
    }

    if (!req.user || !req.user.id) {
      return res.status(401).json({ message: 'User authentication required' });
    }

    const isObjectId = /^[0-9a-fA-F]{24}$/.test(id);
    const query = isObjectId ? { _id: id } : { slug: id };

    const post = await Post.findOne(query);

    if (!post) {
      return res.status(404).json({ message: 'Post not found' });
    }

    if (post.author.toString() !== req.user.id) {
      return res.status(403).json({ message: 'Unauthorized action' });
    }
    if (content !== undefined) post.content = content;
    if (tags !== undefined) post.tags = Array.isArray(tags) ? tags : (tags ? [tags] : []);
    if (excerpt !== undefined) post.excerpt = excerpt;
    if (imageUrl !== undefined) post.imageUrl = imageUrl;

    const updatedPost = await post.save();
    await updatedPost.populate('author', 'username');

    res.status(200).json({
      message: 'Post updated successfully',
      post: updatedPost
    });
  } catch (err) {
    console.error('Error updating post:', { message: err.message, stack: err.stack });
    res.status(500).json({
      message: 'Server error',
      error: process.env.NODE_ENV === 'development' ? err.message : undefined
    });
  }
};

exports.deletePost = async (req, res) => {
  try {
    const { id } = req.params;

    if (!id) {
      return res.status(400).json({ message: 'Post ID is required' });
    }

    if (!req.user || !req.user.id) {
      return res.status(401).json({ message: 'User authentication required' });
    }

    const isObjectId = /^[0-9a-fA-F]{24}$/.test(id);

    let query;
    if (isObjectId) {
      query = { _id: id };
    } else {
      query = { slug: id };
    }

    const post = await Post.findOne(query);

    if (!post) {
      return res.status(404).json({ message: 'Post not found' });
    }

    // Authorization check
    if (post.author.toString() !== req.user.id) {
      return res.status(403).json({ message: 'Unauthorized action' });
    }

    await post.deleteOne();

    res.status(200).json({
      message: 'Post deleted successfully',
      deletedPost: {
        id: post._id,
        title: post.title,
        slug: post.slug
      }
    });
  } catch (err) {
    console.error('Error deleting post:', { message: err.message, stack: err.stack });
    res.status(500).json({
      message: 'Server error',
      error: process.env.NODE_ENV === 'development' ? err.message : undefined
    });
  }
};