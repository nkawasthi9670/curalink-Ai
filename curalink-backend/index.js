require('dotenv').config();
const express = require('express');
const cors = require('cors');
const mongoose = require('mongoose');

const chatRoutes = require('./src/routes/chat');

const app = express();
app.use(cors({
  origin: [
    'http://localhost:3000',
    'https://curalink-ai-weld.vercel.app'
  ],
  credentials: true
}));
app.use(express.json());

// Routes

app.use('/api/chat', chatRoutes);

app.get('/health', (req, res) => res.json({ status: 'ok' }));

// Connect MongoDB then start server
mongoose
  .connect(process.env.MONGO_URI || 'mongodb://localhost:27017/curalink')
  .then(() => {
    console.log('MongoDB connected');
    const PORT = process.env.PORT || 5000;
    app.listen(PORT, () => console.log(`Server running on port ${PORT}`));
  })
  .catch((err) => {
    console.error('MongoDB connection error:', err.message);
    process.exit(1);
  });