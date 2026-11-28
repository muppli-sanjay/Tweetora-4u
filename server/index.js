const express = require('express');
const mongoose = require('mongoose');
const cors = require('cors');
const path = require('path');
const fs = require('fs');
const dotenv = require('dotenv');
const { sendError } = require('./utils/errors');
const { startAutoCleanup } = require('./utils/uploadCleanup');
const authRoutes = require('./routes/auth');
const userRoutes = require('./routes/users');
const postRoutes = require('./routes/posts');
const messageRoutes = require('./routes/messages');
const searchRoutes = require('./routes/search');
const notificationsRoutes = require('./routes/notifications');
const presignMedia = require('./middleware/presignMedia');

dotenv.config();

const app = express();

// 1. Single CORS setup that allows localhost AND any VS Code devtunnel
app.use(cors({
  origin: [
    'http://localhost:3000',
    process.env.CLIENT_URL,
    /\.devtunnels\.ms$/ // Automatically allows any *.devtunnels.ms subdomain
  ].filter(Boolean),
  methods: ['GET', 'POST', 'PUT', 'DELETE'],
  allowedHeaders: ['Content-Type', 'Authorization'],
  credentials: true
}));

app.use(express.json());
app.use(express.urlencoded({ extended: true }));
app.use(presignMedia); // turns stored B2 file paths into temporary signed URLs in API responses

const connectWithRetry = () => {
  mongoose.set('strictQuery', true);
  mongoose
    .connect(process.env.MONGO_URI || 'mongodb://127.0.0.1:27017/tweetora-4u', {
      serverSelectionTimeoutMS: 10000
    })
    .then(() => console.log('MongoDB Connected'))
    .catch(err => {
      console.error('MongoDB Connection Error:', err);
      setTimeout(connectWithRetry, 5000);
    });
};


connectWithRetry();

app.use('/Uploads', express.static(path.join(__dirname, 'Uploads')));
app.use('/profile_upload', express.static(path.join(__dirname, 'profile_upload')));

const uploadsDir = path.join(__dirname, 'Uploads');
if (!fs.existsSync(uploadsDir)) {
  console.log('Creating Uploads folder:', uploadsDir);
  fs.mkdirSync(uploadsDir, { recursive: true });
  fs.chmodSync(uploadsDir, 0o755);
}

app.use((req, res, next) => {
  console.log(`[${new Date().toISOString()}] ${req.method} ${req.url}`);
  next();
});

app.get('/', (req, res) => {
  res.json({ message: 'Tweetora-4u API is running' });
});

app.use('/api/auth', authRoutes);
app.use('/api/users', userRoutes);
app.use('/api/posts', postRoutes);
app.use('/api/messages', messageRoutes);
app.use('/api/search', searchRoutes);
app.use('/api/notifications', notificationsRoutes);

app.use((err, req, res, next) => {
  sendError(res, err, 'Unhandled');
});

// Automatically delete uploads that no post or profile uses (set AUTO_CLEANUP=false to turn off)
if (process.env.AUTO_CLEANUP !== 'false') {
  startAutoCleanup({ intervalHours: Number(process.env.CLEANUP_INTERVAL_HOURS) || 24 });
}

const PORT = process.env.PORT || 5000;
app.listen(PORT, () => console.log(`Server running on port ${PORT}`));
