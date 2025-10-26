require('dotenv').config();
const express = require('express');
const http = require('http');
const { Server } = require('socket.io');
const cors = require('cors');

// Import handlers
const { registerRoomHandlers } = require('./handlers/roomHandlers');

// Initialize Express app
const app = express();
const server = http.createServer(app);

// Configure CORS
app.use(cors({
  origin: process.env.FRONTEND_URL || 'http://localhost:3000',
  credentials: true
}));

app.use(express.json());

// Initialize Socket.IO with CORS
const io = new Server(server, {
  cors: {
    origin: process.env.FRONTEND_URL || 'http://localhost:3000',
    methods: ['GET', 'POST'],
    credentials: true
  }
});

// In-memory storage
const rooms = new Map();
const users = new Map();
const answerSubmissions = new Map();

// Make storage accessible to handlers
global.rooms = rooms;
global.users = users;
global.answerSubmissions = answerSubmissions;
global.io = io;

// Basic health check endpoint
app.get('/health', (req, res) => {
  res.json({ 
    status: 'ok', 
    timestamp: new Date().toISOString(),
    activeRooms: rooms.size,
    connectedUsers: users.size
  });
});

// Socket.IO connection handler
io.on('connection', (socket) => {
  console.log(`✅ Client connected: ${socket.id}`);

  // Handle user registration
  socket.on('user:connect', (data) => {
    const { walletAddress, username } = data;
    
    users.set(socket.id, {
      socketId: socket.id,
      walletAddress,
      username,
      currentRoomId: null,
      connectedAt: Date.now()
    });

    console.log(`👤 User registered: ${username} (${walletAddress})`);
    
    socket.emit('user:connected', {
      success: true,
      message: 'Connected to QuizChain backend',
      socketId: socket.id
    });
  });

  // Register room handlers
  registerRoomHandlers(socket, io);

  // Handle disconnection
  socket.on('disconnect', () => {
    const user = users.get(socket.id);
    
    if (user) {
      console.log(`❌ User disconnected: ${user.username}`);
      
      // If user was in a room, handle cleanup
      if (user.currentRoomId) {
        const roomService = require('./services/roomService');
        const roomInfo = roomService.removeUserBySocket(socket.id);
        
        if (roomInfo) {
          if (roomInfo.roomDeleted) {
            // Room was deleted, notify all participants
            io.to(roomInfo.roomId).emit('room:closed', {
              reason: 'Host disconnected'
            });
          } else {
            // User left room, notify remaining participants
            const room = roomService.getRoomById(roomInfo.roomId);
            if (room) {
              io.to(roomInfo.roomId).emit('room:playerLeft', {
                room: roomService.sanitizeRoom(room),
                player: {
                  username: user.username,
                  walletAddress: user.walletAddress
                }
              });
            }
          }
        }
      }
      
      users.delete(socket.id);
    }
  });
});

// Start server with simple port retry logic to avoid EADDRINUSE crashes during local dev
const BASE_PORT = parseInt(process.env.PORT || '5000', 10) || 5000;
const MAX_PORT_SEARCH = 10;

function startServer(port, attemptsRemaining) {
  const onListening = () => {
    server.removeListener('error', onError);
    const address = server.address();
    const activePort = typeof address === 'object' && address ? address.port : port;
    // Surface the resolved port for downstream tooling (e.g. frontend env overrides)
    process.env.PORT = String(activePort);
    console.log(`
╔════════════════════════════════════════╗
║   🎮 QuizChain Backend Server          ║
║   ⚡ Socket.IO: READY                  ║
║   🟡 Yellow Network: Pending           ║
║   📡 Port: ${activePort.toString().padEnd(22)}║
╚════════════════════════════════════════╝
    `);
  };

  const onError = (error) => {
    server.removeListener('listening', onListening);
    if (error.code === 'EADDRINUSE' && attemptsRemaining > 0) {
      const nextPort = port + 1;
      console.warn(`⚠️  Port ${port} already in use. Retrying on ${nextPort}...`);
      setTimeout(() => startServer(nextPort, attemptsRemaining - 1), 150);
    } else {
      console.error('❌ Failed to start QuizChain backend server:', error);
      process.exit(1);
    }
  };

  server.once('listening', onListening);
  server.once('error', onError);
  server.listen(port);
}

startServer(BASE_PORT, MAX_PORT_SEARCH);

// Graceful shutdown
process.on('SIGTERM', () => {
  console.log('SIGTERM received, closing server...');
  server.close(() => {
    console.log('Server closed');
    process.exit(0);
  });
});
