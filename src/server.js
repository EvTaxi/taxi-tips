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

// Square credentials route
app.get('/config', (req, res) => {
    res.json({
        appId: process.env.SQUARE_APP_ID,
        locationId: process.env.SQUARE_LOCATION_ID
    });
});

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
        throw err;
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
        console.log('Received webhook:', req.body);

        const payment = req.body;
        
        if (!payment || !payment.data || !payment.data.payment) {
            console.log('Invalid payment data');
            return res.status(400).json({ error: 'Invalid payment data' });
        }

        const tipData = {
            amount: (payment.data.payment.amount_money.amount || 0) / 100,
            name: (payment.data.payment.customer?.given_name || 'Anonymous'),
            message: (payment.data.payment.note || ''),
            timestamp: new Date()
        };
        
        console.log('Processing tip:', tipData);
        
        // Save to MongoDB
        await db.collection('tips').insertOne(tipData);
        
        // Broadcast to all connected clients
        io.emit('new-tip', tipData);
        
        // Update leaderboard
        await updateLeaderboard(tipData);
        
        res.status(200).json({ success: true });
    } catch (error) {
        console.error('Webhook error:', error);
        res.status(500).json({ error: error.message });
    }
});

// Process Square payment
app.post('/process-payment', async (req, res) => {
    try {
        const { sourceId, amount, message } = req.body;
        
        // Validate input
        if (!sourceId || !amount) {
            return res.status(400).json({ error: 'Missing required payment information' });
        }

        // Here you would typically process the payment with Square
        // For now, we'll simulate a successful payment
        const paymentData = {
            type: 'payment.created',
            data: {
                payment: {
                    amount_money: {
                        amount: amount * 100 // Convert to cents
                    },
                    customer: {
                        given_name: 'Customer' // You could make this customizable
                    },
                    note: message
                }
            }
        };

        // Process like a webhook
        const tipData = {
            amount: amount,
            name: 'Customer',
            message: message,
            timestamp: new Date()
        };

        await db.collection('tips').insertOne(tipData);
        io.emit('new-tip', tipData);
        await updateLeaderboard(tipData);

        res.json({ success: true });
    } catch (error) {
        console.error('Payment processing error:', error);
        res.status(500).json({ error: 'Payment processing failed' });
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
        console.error('Error fetching top tippers:', error);
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
        console.error('Error fetching recent tips:', error);
        res.status(500).json({ error: 'Failed to fetch recent tips' });
    }
});

// Get daily stats
app.get('/api/daily-stats', async (req, res) => {
    try {
        const today = new Date();
        today.setHours(0, 0, 0, 0);

        const stats = await db.collection('tips').aggregate([
            {
                $match: {
                    timestamp: { $gte: today }
                }
            },
            {
                $group: {
                    _id: null,
                    totalAmount: { $sum: '$amount' },
                    tipCount: { $sum: 1 },
                    highestTip: { $max: '$amount' }
                }
            }
        ]).toArray();

        res.json(stats[0] || { totalAmount: 0, tipCount: 0, highestTip: 0 });
    } catch (error) {
        console.error('Error fetching daily stats:', error);
        res.status(500).json({ error: 'Failed to fetch daily stats' });
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
        throw error;
    }
}

// Serve main page
app.get('/', (req, res) => {
    res.sendFile(path.join(__dirname, '../public/index.html'));
});

// Error handling middleware
app.use((err, req, res, next) => {
    console.error('Server error:', err);
    res.status(500).json({ error: 'Internal server error' });
});

// Start server
const PORT = process.env.PORT || 3000;
async function startServer() {
    try {
        await connectDB();
        server.listen(PORT, () => {
            console.log(`Server running on port ${PORT}`);
        });
        
        // Graceful shutdown
        process.on('SIGTERM', () => {
            console.log('Received SIGTERM signal');
            server.close(async () => {
                console.log('Server closed');
                await mongoClient.close();
                process.exit(0);
            });
        });
    } catch (error) {
        console.error('Failed to start server:', error);
        process.exit(1);
    }
}

// Handle server errors
server.on('error', (error) => {
    if (error.code === 'EADDRINUSE') {
        console.log(`Port ${PORT} is busy, trying ${PORT + 1}`);
        server.listen(PORT + 1);
    } else {
        console.error('Server error:', error);
    }
});

startServer();