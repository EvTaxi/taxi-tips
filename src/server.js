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
    cors: { origin: "*", methods: ["GET", "POST"] }
});

// Middleware
app.use(cors());
app.use(express.json());
app.use(express.static('public'));

// MongoDB Setup
const mongoOptions = {
    useNewUrlParser: true,
    useUnifiedTopology: true
};

let db;
const mongoClient = new MongoClient(process.env.MONGODB_URI, mongoOptions);

// Socket.IO Connection Handler
io.on('connection', async (socket) => {
    console.log('Client connected');
    
    // Send initial data
    try {
        const topTippers = await db.collection('leaderboard')
            .find()
            .sort({ total: -1 })
            .limit(10)
            .toArray();
        socket.emit('init-leaderboard', topTippers);
    } catch (error) {
        console.error('Error fetching initial data:', error);
    }

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
            return res.status(400).json({ error: 'Invalid payment data' });
        }

        const tipData = {
            amount: (payment.data.payment.amount_money.amount || 0) / 100,
            name: (payment.data.payment.customer?.given_name || 'Anonymous'),
            message: (payment.data.payment.note || ''),
            timestamp: new Date()
        };
        
        // Save tip to database
        await db.collection('tips').insertOne(tipData);
        
        // Update leaderboard
        const leaderboardUpdate = await updateLeaderboard(tipData);
        
        // Broadcast to all connected clients
        io.emit('new-tip', tipData);
        if (leaderboardUpdate) {
            io.emit('leaderboard-update', await getTopTippers());
        }
        
        res.status(200).json({ success: true });
    } catch (error) {
        console.error('Webhook error:', error);
        res.status(500).json({ error: error.message });
    }
});

// Update leaderboard
async function updateLeaderboard(tipData) {
    try {
        const result = await db.collection('leaderboard').updateOne(
            { name: tipData.name },
            {
                $inc: { total: tipData.amount },
                $setOnInsert: { firstTip: new Date() },
                $set: { lastMessage: tipData.message, lastTipTime: tipData.timestamp }
            },
            { upsert: true }
        );
        return result.modifiedCount > 0 || result.upsertedCount > 0;
    } catch (error) {
        console.error('Leaderboard update error:', error);
        throw error;
    }
}

// Get top tippers
async function getTopTippers() {
    return await db.collection('leaderboard')
        .find()
        .sort({ total: -1 })
        .limit(10)
        .toArray();
}

// Connect to MongoDB and start server
async function startServer() {
    try {
        await mongoClient.connect();
        db = mongoClient.db('taxi-tips');
        console.log('Connected to MongoDB');
        
        // Create indexes
        await db.collection('tips').createIndex({ timestamp: -1 });
        await db.collection('leaderboard').createIndex({ total: -1 });
        
        const PORT = process.env.PORT || 3000;
        server.listen(PORT, () => {
            console.log(`Server running on port ${PORT}`);
        });
    } catch (error) {
        console.error('Startup error:', error);
        process.exit(1);
    }
}

// Graceful shutdown
process.on('SIGTERM', async () => {
    console.log('SIGTERM signal received');
    try {
        await mongoClient.close();
        server.close(() => {
            console.log('Server closed');
            process.exit(0);
        });
    } catch (err) {
        console.error('Error during shutdown:', err);
        process.exit(1);
    }
});

startServer();