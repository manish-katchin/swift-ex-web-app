const express = require('express');
const bodyParser = require('body-parser');
// const morgan = require('morgan');
const authRoutes = require('./routes/authRoutes');
const postRoutes = require('./routes/postRoutes');
const cors = require('cors');
const bodyParser = require('body-parser');
const app = express();

// Middleware
// app.use(morgan('dev'));  
app.use(bodyParser.json());

// Routes
app.use('/api/auth', authRoutes);
app.use('/api/posts', postRoutes);
app.use(cors({
  origin: 'http://localhost:5174', 
  methods: ['GET', 'POST', 'PUT', 'DELETE'], 
  credentials: true 
}));

app.use(bodyParser.json());


// Default route to handle undefined routes
app.use((req, res, next) => {
  res.status(404).json({ message: 'Endpoint not found' });
});

// Error handling middleware
app.use((err, req, res, next) => {
  console.error(err.stack);
  res.status(500).json({ message: 'Internal Server Error' });
});

module.exports = app;
