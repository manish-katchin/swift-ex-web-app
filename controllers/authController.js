const jwt = require('jsonwebtoken');
const bcrypt = require('bcryptjs');
const User = require('../models/User');

const disposableEmailDomains = [
  'mailinator.com',
  'tempmail.com',
  '10minutemail.com',
  'guerrillamail.com',
  'throwawaymail.com'
];

const isDisposableEmail = (email) => {
  const domain = email.split('@')[1]?.toLowerCase();
  return disposableEmailDomains.includes(domain);
};

exports.loginUser = async (req, res) => {
  try {
    const { email, password } = req.body;
    if (!email || !password) {
      return res.status(400).json({ message: 'Email and password are required' });
    }

    if (isDisposableEmail(email)) {
      return res.status(400).json({ message: 'Disposable email addresses are not allowed' });
    }

    if (!process.env.JWT_SECRET) {
      console.error('JWT_SECRET is not configured');
      return res.status(500).json({ message: 'Server configuration error' });
    }

    const user = await User.findOne({ email }).select('+password');
    if (!user) {
      return res.status(401).json({ message: 'Invalid email or password' });
    }

    const isPasswordValid = await bcrypt.compare(password, user.password);
    if (!isPasswordValid) {
      return res.status(401).json({ message: 'Invalid email or password' });
    }

    const token = jwt.sign(
      { id: user._id, username: user.username, role: user.role },
      process.env.JWT_SECRET,
      { expiresIn: '1d' }
    );

    return res.status(200).json({
      message: 'Login successful',
      token,
      user: { id: user._id, username: user.username, email: user.email, role: user.role }
    });
  } catch (error) {
    console.error('Login error:', { message: error.message, stack: error.stack });
    return res.status(500).json({
      message: 'Internal server error',
      error: process.env.NODE_ENV === 'development' ? error.message : undefined
    });
  }
};

exports.registerAdmin = async (req, res) => {
  try {
    const { username, email, password, role } = req.body;
    if (!username || !email || !password) {
      return res.status(400).json({ message: 'Username, email, and password are required' });
    }

    if (isDisposableEmail(email)) {
      return res.status(400).json({ message: 'Disposable email addresses are not allowed' });
    }

    if (!req.user || req.user.role !== 'superadmin') {
      return res.status(403).json({ message: 'Only superadmin can create admins' });
    }

    if (role && !['admin', 'user'].includes(role)) {
      return res.status(400).json({ message: 'Invalid role. Only admin or user roles allowed' });
    }

    const existingUser = await User.findOne({ $or: [{ email }, { username }] });
    if (existingUser) {
      return res.status(400).json({ message: 'Username or email already exists' });
    }

    const hashedPassword = await bcrypt.hash(password, 10);
    const user = await User.create({
      username,
      email,
      password: hashedPassword,
      role: role || 'admin'
    });

    return res.status(201).json({
      message: 'Admin created successfully',
      user: { id: user._id, username: user.username, email: user.email, role: user.role }
    });
  } catch (error) {
    console.error('Admin registration error:', { message: error.message, stack: error.stack });
    return res.status(500).json({
      message: 'Internal server error',
      error: process.env.NODE_ENV === 'development' ? error.message : undefined
    });
  }
};

exports.setupSuperAdmin = async (req, res) => {
  try {
    const { username, email, password } = req.body;
    if (!username || !email || !password) {
      return res.status(400).json({ message: 'Username, email, and password are required' });
    }

    if (isDisposableEmail(email)) {
      return res.status(400).json({ message: 'Disposable email addresses are not allowed' });
    }

    const superAdminExists = await User.findOne({ role: 'superadmin' });
    if (superAdminExists) {
      return res.status(403).json({ message: 'Superadmin already exists' });
    }

    const hashedPassword = await bcrypt.hash(password, 10);
    const user = await User.create({
      username,
      email,
      password: hashedPassword,
      role: 'superadmin'
    });

    const token = jwt.sign(
      { id: user._id, username: user.username, role: user.role },
      process.env.JWT_SECRET,
      { expiresIn: '1d' }
    );

    return res.status(201).json({
      message: 'Superadmin created successfully',
      token,
      user: { id: user._id, username: user.username, email: user.email, role: user.role }
    });
  } catch (error) {
    console.error('Superadmin setup error:', { message: error.message, stack: error.stack });
    return res.status(500).json({
      message: 'Internal server error',
      error: process.env.NODE_ENV === 'development' ? error.message : undefined
    });
  }
};