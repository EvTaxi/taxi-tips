const express = require('express');
const http = require('http');
const socketIo = require('socket.io');
const { MongoClient } = require('mongodb');
const cors = require('cors');
const path = require('path');
require('dotenv').config();

const app = express();
const server = http.createServer(app);
const io = socketIo(server, {
  cors: {
    origin: "*",
    methods: ["GET", "POST"]
  }
});

// Middleware
app.use(cors());
app.use(express.json());
app.use(express.static('public'));

// MongoDB Connection
let db;
const mongoClient = new MongoClient(process.env.MONGODB_URI);

// Connect to MongoDB
async function connectDB() {
  try {
    await mongoClient.connect();
    db = mongoClient.db('taxi-tips');
    console.log('Connected to MongoDB');
    
    // Create necessary collections if they don't exist
    await db.createCollection('tips');
    await db.createCollection('leaderboard');
    
    // Create indexes
    await db.collection('tips').createIndex({ timestamp: -1 });
    await db.collection('leaderboard').createIndex({ total: -1 });
  } catch (err) {
    console.error('MongoDB connection error:', err);
  }
}

// Socket.IO Connection Handler
io.on('connection', (socket) => {
  console.log('Client connected');
  
  socket.on('disconnect', () => {
    console.log('Client disconnected');
  });
});

// API Routes
app.post('/webhook/square', async (req, res) => {
  try {
    const payment = req.body;
    
    if (payment.type === 'payment.created') {
      const tipData = {
        amount: payment.data.payment.amount_money.amount / 100,
        name: payment.data.payment.customer?.given_name || 'Anonymous',
        message: payment.data.payment.note || '',
        timestamp: new Date()
      };
      
      // Save to MongoDB
      await db.collection('tips').insertOne(tipData);
      
      // Broadcast to all connected clients
      io.emit('new-tip', tipData);
      
      // Update leaderboard
      await updateLeaderboard(tipData);
    }
    
    res.sendStatus(200);
  } catch (error) {
    console.error('Webhook error:', error);
    res.sendStatus(500);
  }
});

// Get top tippers
app.get('/api/top-tippers', async (req, res) => {
  try {
    const topTippers = await db.collection('leaderboard')
      .find()
      .sort({ total: -1 })
      .limit(10)
      .toArray();
    
    res.json(topTippers);
  } catch (error) {
    res.status(500).json({ error: 'Failed to fetch top tippers' });
  }
});

// Get recent tips
app.get('/api/recent-tips', async (req, res) => {
  try {
    const recentTips = await db.collection('tips')
      .find()
      .sort({ timestamp: -1 })
      .limit(10)
      .toArray();
    
    res.json(recentTips);
  } catch (error) {
    res.status(500).json({ error: 'Failed to fetch recent tips' });
  }
});

// Update leaderboard
async function updateLeaderboard(tipData) {
  try {
    await db.collection('leaderboard').updateOne(
      { name: tipData.name },
      {
        $inc: { total: tipData.amount },
        $setOnInsert: { firstTip: new Date() }
      },
      { upsert: true }
    );
  } catch (error) {
    console.error('Leaderboard update error:', error);
  }
}

// Serve main page
app.get('/', (req, res) => {
  res.sendFile(path.join(__dirname, '../public/index.html'));
});

// Start server
const PORT = process.env.PORT || 3000;
async function startServer() {
  await connectDB();
  server.listen(PORT, () => {
    console.log(`Server running on port ${PORT}`);
  });
}

startServer();

// Add this after your existing require statements
app.get('/config', (req, res) => {
    res.json({
        appId: process.env.SQUARE_APP_ID,
        locationId: process.env.SQUARE_LOCATION_ID
    });
});