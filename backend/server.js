const express = require('express');
const session = require('express-session');
const RedisStore = require('connect-redis').default;
const cookieParser = require('cookie-parser');
const cors = require('cors');
const http = require('http');
const WebSocket = require('ws');

const { connectMongoDB } = require('./config/mongodb');
const { getRedisClient } = require('./config/redis');
const authRoutes = require('./routes/auth');
const roomRoutes = require('./routes/room');
const { handleWebSocket } = require('./websocket/chatHandler');

const app = express();
const server = http.createServer(app);
const wss = new WebSocket.Server({ server });

const PORT = process.env.PORT || 3000;

// Middleware
app.use(cors({
  origin: true,
  credentials: true
}));
app.use(express.json());
app.use(cookieParser());

// Initialize connections
async function initialize() {
  try {
    // Connect to MongoDB Replica Set
    await connectMongoDB();
    console.log('✅ MongoDB Replica Set connected');

    // Connect to Redis
    const redisClient = await getRedisClient();
    console.log('✅ Redis connected');

    // Session middleware with Redis store
    app.use(session({
      store: new RedisStore({ client: redisClient }),
      secret: process.env.SESSION_SECRET || 'your-secret-key',
      resave: false,
      saveUninitialized: false,
      cookie: {
        secure: false,
        httpOnly: true,
        maxAge: 1000 * 60 * 60 * 24
      }
    }));

    // Routes
    app.use('/api/auth', authRoutes);
    app.use('/api/rooms', roomRoutes);

    // Health check
    app.get('/health', (req, res) => {
      res.json({ 
        status: 'OK', 
        mongodb: 'connected',
        redis: 'connected'
      });
    });

    // WebSocket handler
    wss.on('connection', (ws, req) => {
      console.log('🔌 New WebSocket connection');
      handleWebSocket(ws, req);
    });

    server.listen(PORT, () => {
      console.log(`🚀 Server running on http://localhost:${PORT}`);
      console.log(`🔌 WebSocket available on ws://localhost:${PORT}`);
    });

  } catch (error) {
    console.error('❌ Initialization error:', error);
    process.exit(1);
  }
}

initialize();
