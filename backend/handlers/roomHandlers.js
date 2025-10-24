// Room Handlers - Socket.IO event handlers for room operations

const roomService = require('../services/roomService');
const questionService = require('../services/questionService');

/**
 * Register all room-related socket handlers
 * @param {Socket} socket - Socket.IO socket instance
 * @param {Server} io - Socket.IO server instance
 */
function registerRoomHandlers(socket, io) {
  
  // Create a new room
  socket.on('room:create', (data, callback) => {
    console.log('📝 Room create request:', data);

    const { hostData, roomConfig } = data;

    // Validate user is connected
    const user = global.users.get(socket.id);
    if (!user) {
      return callback({ success: false, error: 'User not connected' });
    }

    // Create room
    const result = roomService.createRoom(
      { 
        walletAddress: user.walletAddress, 
        username: user.username 
      },
      roomConfig
    );

    if (result.success) {
      // Update user's current room
      user.currentRoomId = result.roomId;
      
      // Update host socket in room
      roomService.updateParticipantSocket(result.roomId, user.walletAddress, socket.id);
      
      // Join socket room for real-time updates
      socket.join(result.roomId);
      
      // Broadcast to all users that a new room is available
      if (result.room.config.isPublic) {
        io.emit('room:created', { room: result.room });
      }
      
      console.log(`✅ Room created successfully: ${result.roomCode}`);
    }

    // Send response to creator
    callback(result);
  });

  // Join an existing room
  socket.on('room:join', (data, callback) => {
    console.log('🚪 Room join request:', data);

    const { roomCode, password } = data;

    // Validate user is connected
    const user = global.users.get(socket.id);
    if (!user) {
      return callback({ success: false, error: 'User not connected' });
    }

    // Join room
    const result = roomService.joinRoom(roomCode, {
      walletAddress: user.walletAddress,
      username: user.username,
      password
    });

    if (result.success) {
      const room = result.room;
      
      // Update user's current room
      user.currentRoomId = room.id;
      
      // Update participant socket in room
      roomService.updateParticipantSocket(room.id, user.walletAddress, socket.id);
      
      // Join socket room
      socket.join(room.id);
      
      // Notify all participants in room
      io.to(room.id).emit('room:playerJoined', {
        room: result.room,
        player: {
          username: user.username,
          walletAddress: user.walletAddress
        }
      });
      
      console.log(`✅ User ${user.username} joined room ${roomCode}`);
    }

    // Send response to joiner
    callback(result);
  });

  // Leave current room
  socket.on('room:leave', async (callback) => {
    console.log('🚪 Room leave request');

    const user = global.users.get(socket.id);
    if (!user || !user.currentRoomId) {
      return callback({ success: false, error: 'Not in a room' });
    }

    const roomId = user.currentRoomId;
    const room = roomService.getRoomById(roomId);

    if (!room) {
      return callback({ success: false, error: 'Room not found' });
    }

    // Check if user is host
    const isHost = room.host.walletAddress === user.walletAddress;

    if (isHost && room.status === 'waiting') {
      // Host leaving before game starts - delete room
      socket.leave(roomId);
      user.currentRoomId = null;
      
      // Notify all participants
      io.to(roomId).emit('room:closed', {
        reason: 'Host left the room'
      });
      
      // Remove all participants from socket room
      const sockets = await io.in(roomId).fetchSockets();
      sockets.forEach(s => s.leave(roomId));
      
      console.log(`🗑️ Room ${room.code} closed (host left)`);
      
      return callback({ success: true, roomClosed: true });
    }

    // Regular participant leaving
    const result = roomService.leaveRoom(roomId, user.walletAddress);

    if (result.success) {
      socket.leave(roomId);
      user.currentRoomId = null;
      
      // Notify remaining participants
      const updatedRoom = roomService.getRoomById(roomId);
      if (updatedRoom) {
        io.to(roomId).emit('room:playerLeft', {
          room: roomService.sanitizeRoom(updatedRoom),
          player: {
            username: user.username,
            walletAddress: user.walletAddress
          }
        });
      }
      
      console.log(`👋 User ${user.username} left room ${room.code}`);
    }

    callback(result);
  });

  // Get list of public rooms
  socket.on('room:list', (callback) => {
    console.log('📋 Room list request');

    const rooms = roomService.getPublicRooms();
    
    callback({
      success: true,
      rooms
    });
  });

  // Get current room details
  socket.on('room:get', (callback) => {
    console.log('🔍 Room get request');

    const user = global.users.get(socket.id);
    if (!user || !user.currentRoomId) {
      return callback({ success: false, error: 'Not in a room' });
    }

    const room = roomService.getRoomById(user.currentRoomId);
    if (!room) {
      return callback({ success: false, error: 'Room not found' });
    }

    callback({
      success: true,
      room: roomService.sanitizeRoom(room)
    });
  });

  // Host starts the game
  socket.on('room:startGame', async (callback) => {
    console.log('🎮 Start game request');

    const user = global.users.get(socket.id);
    if (!user || !user.currentRoomId) {
      return callback({ success: false, error: 'Not in a room' });
    }

    const room = roomService.getRoomById(user.currentRoomId);
    if (!room) {
      return callback({ success: false, error: 'Room not found' });
    }

    // Check if user is host
    if (room.host.walletAddress !== user.walletAddress) {
      return callback({ success: false, error: 'Only host can start the game' });
    }

    // Check if room has minimum players
    if (room.participants.length < 1) {
      return callback({ success: false, error: 'Need at least 2 players to start' });
    }

    // Check room status
    if (room.status !== 'waiting') {
      return callback({ success: false, error: 'Game already started' });
    }

    try {
      // Update room status
      room.status = 'starting';

      // Notify all participants that game is starting
      io.to(room.id).emit('room:gameStarting', {
        room: roomService.sanitizeRoom(room),
        message: 'Loading questions...'
      });

      console.log(`📚 Fetching questions for topic: ${room.config.topic}`);

      // Fetch questions from Aptitude API
      const questionCount = 10; // 10 questions per game
      const questions = await questionService.fetchQuestions(room.config.topic, questionCount);

      console.log('🔍 First question after fetch:', JSON.stringify(questions[0], null, 2));
      console.log('📋 First question options:', questions[0]?.options);

      if (!questions || questions.length === 0) {
        throw new Error('No questions available for this topic');
      }

      // Initialize game data
      room.gameData = {
        questions: questions,
        currentQuestionIndex: 0,
        startedAt: new Date().toISOString(),
        playerAnswers: {}, // { walletAddress: [answers] }
        playerScores: {}, // { walletAddress: score }
        questionStartTime: null
      };

      // Initialize player data
      const allPlayers = [room.host.walletAddress, ...room.participants.map(p => p.walletAddress)];
      allPlayers.forEach(address => {
        room.gameData.playerAnswers[address] = [];
        room.gameData.playerScores[address] = 0;
      });

      // Update room status to in-progress
      room.status = 'in-progress';

      console.log(`✅ Game starting in room ${room.code} with ${questions.length} questions`);

      // Notify success
      callback({ success: true, questionCount: questions.length });

      // Broadcast updated room status to all participants
      io.to(room.id).emit('room:statusUpdate', {
        room: roomService.sanitizeRoom(room)
      });

      // Send game ready event with game info
      io.to(room.id).emit('game:ready', {
        totalQuestions: questions.length,
        timePerQuestion: 30,
        pointsPerQuestion: 10,
        difficulty: questionService.getDifficulty(room.config.topic),
        topic: room.config.topic
      });

      // Wait 3 seconds then send first question
      setTimeout(() => {
        sendNextQuestion(room.id, io);
      }, 3000);

    } catch (error) {
      console.error('❌ Error starting game:', error);
      room.status = 'waiting';
      
      io.to(room.id).emit('game:error', {
        message: 'Failed to load questions. Please try again.',
        error: error.message
      });

      callback({ success: false, error: error.message });
    }
  });

  // Player submits answer
  socket.on('game:submitAnswer', (data, callback) => {
    console.log('📝 Answer submission:', data);

    const user = global.users.get(socket.id);
    if (!user || !user.currentRoomId) {
      return callback({ success: false, error: 'Not in a room' });
    }

    const room = roomService.getRoomById(user.currentRoomId);
    if (!room || !room.gameData) {
      return callback({ success: false, error: 'Game not active' });
    }

    const { questionNumber, answer, timeRemaining } = data;
    const questionIndex = questionNumber - 1;

    // Validate question number
    if (questionIndex < 0 || questionIndex >= room.gameData.questions.length) {
      return callback({ success: false, error: 'Invalid question number' });
    }

    // Check if already answered this question
    if (room.gameData.playerAnswers[user.walletAddress] && 
        room.gameData.playerAnswers[user.walletAddress][questionIndex] !== undefined) {
      return callback({ success: false, error: 'Already answered this question' });
    }

    const question = room.gameData.questions[questionIndex];
    const isCorrect = answer === question.correctAnswer;

    // Calculate score: base points + time bonus (1 point per second remaining)
    let score = 0;
    if (isCorrect) {
      score = question.points + Math.max(0, timeRemaining); // 10 + timeBonus
    }

    // Store answer
    if (!room.gameData.playerAnswers[user.walletAddress]) {
      room.gameData.playerAnswers[user.walletAddress] = [];
    }
    room.gameData.playerAnswers[user.walletAddress][questionIndex] = {
      answer,
      isCorrect,
      timeRemaining,
      score,
      timestamp: Date.now()
    };

    // Update total score
    room.gameData.playerScores[user.walletAddress] = 
      (room.gameData.playerScores[user.walletAddress] || 0) + score;

    console.log(`✅ ${user.username} answered Q${questionNumber}: ${isCorrect ? 'CORRECT' : 'WRONG'} (+${score} points)`);

    // Broadcast score update to all players in room
    io.to(room.id).emit('game:scoreUpdate', {
      player: {
        username: user.username,
        walletAddress: user.walletAddress
      },
      questionNumber,
      isCorrect,
      score,
      totalScore: room.gameData.playerScores[user.walletAddress],
      leaderboard: calculateLeaderboard(room)
    });

    // Send response to submitter
    callback({ 
      success: true, 
      isCorrect, 
      score,
      totalScore: room.gameData.playerScores[user.walletAddress],
      correctAnswer: question.correctAnswer
    });
  });
}

/**
 * Calculate current leaderboard
 * @param {Object} room 
 * @returns {Array}
 */
function calculateLeaderboard(room) {
  const scores = Object.entries(room.gameData.playerScores).map(([walletAddress, score]) => {
    const username = walletAddress === room.host.walletAddress 
      ? room.host.username
      : room.participants.find(p => p.walletAddress === walletAddress)?.username || 'Unknown';
    
    const correctAnswers = room.gameData.playerAnswers[walletAddress]
      ? room.gameData.playerAnswers[walletAddress].filter(a => a?.isCorrect).length
      : 0;

    return { 
      username, 
      walletAddress, 
      score,
      correctAnswers
    };
  }).sort((a, b) => b.score - a.score);

  return scores;
}

/**
 * Send next question to all players in room
 * @param {string} roomId 
 * @param {Server} io 
 */
function sendNextQuestion(roomId, io) {
  const room = global.rooms.get(roomId);
  if (!room || !room.gameData) {
    console.error('❌ Room or game data not found');
    return;
  }

  const { currentQuestionIndex, questions } = room.gameData;

  // Check if game is complete
  if (currentQuestionIndex >= questions.length) {
    endGame(roomId, io);
    return;
  }

  const question = questions[currentQuestionIndex];
  room.gameData.questionStartTime = Date.now();

  console.log(`📤 Sending question ${currentQuestionIndex + 1}/${questions.length} to room ${room.code}`);
  console.log('🔍 Question object:', JSON.stringify(question, null, 2));
  console.log('📋 Options in question:', question.options);

  // Send question to all players (without correct answer)
  io.to(roomId).emit('game:question', {
    questionNumber: currentQuestionIndex + 1,
    totalQuestions: questions.length,
    question: question.question,
    options: question.options,
    timeLimit: question.timeLimit,
    points: question.points,
    topic: question.topic
  });

  // Auto-advance after time limit (using actual timeLimit, not hardcoded)
  setTimeout(() => {
    const currentRoom = global.rooms.get(roomId);
    if (currentRoom && currentRoom.gameData.currentQuestionIndex === currentQuestionIndex) {
      // Move to next question if no one answered or time expired
      currentRoom.gameData.currentQuestionIndex++;
      sendNextQuestion(roomId, io);
    }
  }, (question.timeLimit + 2) * 1000); // Time limit + 2 seconds buffer
}

/**
 * End the game and calculate final results
 * @param {string} roomId 
 * @param {Server} io 
 */
function endGame(roomId, io) {
  const room = global.rooms.get(roomId);
  if (!room || !room.gameData) {
    return;
  }

  console.log(`🏁 Game ending in room ${room.code}`);

  room.status = 'completed';
  room.gameData.endedAt = new Date().toISOString();

  // Calculate final rankings using the leaderboard function
  const rankings = calculateLeaderboard(room);

  // Emit final results
  io.to(roomId).emit('game:ended', {
    rankings,
    totalQuestions: room.gameData.questions.length,
    gameTime: Math.floor((new Date(room.gameData.endedAt) - new Date(room.gameData.startedAt)) / 1000)
  });

  console.log(`✅ Game ended. Winner: ${rankings[0]?.username || 'None'} with ${rankings[0]?.score || 0} points`);

  // Clean up room after 30 seconds
  setTimeout(() => {
    global.rooms.delete(roomId);
    console.log(`🗑️ Room ${room.code} deleted after game completion`);
  }, 30000);
}

module.exports = { registerRoomHandlers };
