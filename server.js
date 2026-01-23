const express = require('express');
const mongoose = require('mongoose');
const connectDB = require('./config/db');
const { redisClient } = require('./config/redis');
const cors = require('cors');
const bodyParser = require('body-parser');
const authRoutes = require('./routes/authRoutes');
const postRoutes = require('./routes/postRoutes');
const fileRoutes = require('./routes/fileRoutes');
const reviewRoutes = require('./routes/reviewRoutes');
const subscriberRoutes = require('./routes/subscriberRoutes');
const cryptoRoutes = require('./routes/cryptoRoutes');
const reportRoutes = require('./routes/reportRoutes');
const { startCryptoJob } = require('./scripts/cryptoCron');
const app = express();

mongoose.set('strictQuery', false);
connectDB();

redisClient.connect().then(() => {
  console.log('Redis connected');
  startCryptoJob();
}).catch((err) => {
  console.error('Redis connection failed:', err.message);
});

app.use(cors({
  origin: 'http://localhost:3000',
  methods: ['GET', 'POST', 'PUT', 'DELETE'],
  credentials: true
}));

app.use(bodyParser.json());

app.use('/auth', authRoutes);
app.use('/blogs', postRoutes);
app.use('/files', fileRoutes);
app.use('/api/posts', reviewRoutes);
app.use('/subscribe', subscriberRoutes);
app.use('/crypto', cryptoRoutes);
app.use('/users/reports', reportRoutes);

const PORT = process.env.PORT || 5000;
app.listen(PORT, () => {
  console.log(`Server running on port ${PORT}`);
});
