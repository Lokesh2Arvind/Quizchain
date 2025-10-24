// Room Service - Manages room creation, joining, and state

const crypto = require('crypto');

class RoomService {
  constructor() {
    // In-memory storage (already initialized in server.js)
    // Use a getter to ensure global.rooms is always available
  }

  get rooms() {
    if (!global.rooms) {
      global.rooms = new Map();
    }
    return global.rooms;
  }

  /**
   * Generate a short, unique room code
   */
  generateRoomCode() {
    return crypto.randomBytes(3).toString('hex').toUpperCase();
  }

  /**
   * Create a new room
   * @param {Object} hostData - {walletAddress, username}
   * @param {Object} roomConfig - {entryFee, asset, maxPlayers, topic, password?, isPublic}
   * @returns {Object} - {success, roomId, roomCode, error?}
   */
  createRoom(hostData, roomConfig) {
    try {
      // Validate inputs
      if (!hostData.walletAddress) {
        return { success: false, error: 'Host wallet address required' };
      }

      const { entryFee, asset, maxPlayers, topic, password, isPublic = true } = roomConfig;

      // Validate room config
      if (entryFee < 0 || entryFee > 1000) {
        return { success: false, error: 'Entry fee must be between 0 and 1000' };
      }

      if (!['USDC', 'USDT', 'DAI', 'USDC.e', 'WETH', 'WBTC'].includes(asset)) {
        return { success: false, error: 'Asset must be USDC, USDT, DAI, USDC.e, WETH, or WBTC' };
      }

      if (maxPlayers < 2 || maxPlayers > 10) {
        return { success: false, error: 'Max players must be between 2 and 10' };
      }

      const validTopics = ['Random', 'All', 'Age', 'ProfitAndLoss', 'SpeedTimeDistance', 'MixtureAndAlligation', 'PipesAndCisterns', 'SimpleInterest', 'Calendars', 'PermutationAndCombination'];
      if (!validTopics.includes(topic)) {
        return { success: false, error: `Topic must be one of: ${validTopics.join(', ')}` };
      }

      // Validate password for private rooms
      if (!isPublic && (!password || password.trim() === '')) {
        return { success: false, error: 'Private rooms require a password' };
      }

      // Generate unique room code
      let roomCode;
      let attempts = 0;
      do {
        roomCode = this.generateRoomCode();
        attempts++;
        if (attempts > 10) {
          return { success: false, error: 'Failed to generate unique room code' };
        }
      } while (this.findRoomByCode(roomCode));

      const roomId = `room_${Date.now()}_${crypto.randomBytes(4).toString('hex')}`;

      // Create room object
      const room = {
        id: roomId,
        code: roomCode,
        host: {
          walletAddress: hostData.walletAddress,
          username: hostData.username || 'Anonymous',
          socketId: null // Will be set when host connects
        },
        config: {
          entryFee: parseFloat(entryFee),
          asset,
          maxPlayers: parseInt(maxPlayers),
          topic,
          password: password || null,
          isPublic
        },
        participants: [], // Array of {walletAddress, username, socketId, hasPaid}
        status: 'waiting', // waiting, starting, in-progress, completed
        createdAt: new Date().toISOString(),
        gameData: null, // Will be populated when game starts
        yellowSession: null // Will be populated when Yellow session created
      };

      // Store room
      this.rooms.set(roomId, room);

      console.log(`✅ Room created: ${roomCode} (${roomId}) by ${hostData.username}`);

      return {
        success: true,
        roomId,
        roomCode,
        room: this.sanitizeRoom(room)
      };

    } catch (error) {
      console.error('❌ Error creating room:', error);
      return { success: false, error: error.message };
    }
  }

  /**
   * Join an existing room
   * @param {string} roomCode - 6-character room code
   * @param {Object} userData - {walletAddress, username, password?}
   * @returns {Object} - {success, room, error?}
   */
  joinRoom(roomCode, userData) {
    try {
      const room = this.findRoomByCode(roomCode);

      if (!room) {
        return { success: false, error: 'Room not found' };
      }

      // Check room status
      if (room.status !== 'waiting') {
        return { success: false, error: 'Room has already started or ended' };
      }

      // Check if room is full
      if (room.participants.length >= room.config.maxPlayers) {
        return { success: false, error: 'Room is full' };
      }

      // Check password if room is private
      if (room.config.password && room.config.password !== userData.password) {
        return { success: false, error: 'Incorrect password' };
      }

      // Check if user already in room
      const alreadyJoined = room.participants.some(p => p.walletAddress === userData.walletAddress);
      if (alreadyJoined) {
        return { success: false, error: 'You have already joined this room' };
      }

      // Check if user is the host
      if (room.host.walletAddress === userData.walletAddress) {
        return { success: false, error: 'Host cannot join as participant' };
      }

      // Add participant
      const participant = {
        walletAddress: userData.walletAddress,
        username: userData.username || 'Anonymous',
        socketId: null,
        hasPaid: false,
        joinedAt: new Date().toISOString()
      };

      room.participants.push(participant);

      console.log(`✅ User ${userData.username} joined room ${roomCode}`);

      return {
        success: true,
        room: this.sanitizeRoom(room)
      };

    } catch (error) {
      console.error('❌ Error joining room:', error);
      return { success: false, error: error.message };
    }
  }

  /**
   * Leave a room
   * @param {string} roomId 
   * @param {string} walletAddress 
   * @returns {Object} - {success, error?}
   */
  leaveRoom(roomId, walletAddress) {
    try {
      const room = this.rooms.get(roomId);

      if (!room) {
        return { success: false, error: 'Room not found' };
      }

      // Remove participant
      const index = room.participants.findIndex(p => p.walletAddress === walletAddress);
      if (index !== -1) {
        room.participants.splice(index, 1);
        console.log(`👋 User ${walletAddress} left room ${room.code}`);
        return { success: true };
      }

      return { success: false, error: 'User not in room' };

    } catch (error) {
      console.error('❌ Error leaving room:', error);
      return { success: false, error: error.message };
    }
  }

  /**
   * Get list of public rooms that are waiting
   * @returns {Array} - Array of sanitized rooms
   */
  getPublicRooms() {
    const publicRooms = Array.from(this.rooms.values())
      .filter(room => room.config.isPublic && room.status === 'waiting')
      .map(room => this.sanitizeRoom(room));

    return publicRooms;
  }

  /**
   * Get room by ID
   * @param {string} roomId 
   * @returns {Object|null}
   */
  getRoomById(roomId) {
    return this.rooms.get(roomId) || null;
  }

  /**
   * Find room by code
   * @param {string} roomCode 
   * @returns {Object|null}
   */
  findRoomByCode(roomCode) {
    return Array.from(this.rooms.values()).find(room => room.code === roomCode.toUpperCase());
  }

  /**
   * Update participant socket ID
   * @param {string} roomId 
   * @param {string} walletAddress 
   * @param {string} socketId 
   */
  updateParticipantSocket(roomId, walletAddress, socketId) {
    const room = this.rooms.get(roomId);
    if (!room) return;

    // Update host if it's the host
    if (room.host.walletAddress === walletAddress) {
      room.host.socketId = socketId;
      return;
    }

    // Update participant
    const participant = room.participants.find(p => p.walletAddress === walletAddress);
    if (participant) {
      participant.socketId = socketId;
    }
  }

  /**
   * Remove user from room by socket ID (when disconnected)
   * @param {string} socketId 
   * @returns {Object|null} - {roomId, walletAddress} or null
   */
  removeUserBySocket(socketId) {
    for (const [roomId, room] of this.rooms.entries()) {
      // Check if it's the host
      if (room.host.socketId === socketId) {
        // If game hasn't started, delete the room
        if (room.status === 'waiting') {
          this.rooms.delete(roomId);
          console.log(`🗑️ Room ${room.code} deleted (host disconnected)`);
          return { roomId, walletAddress: room.host.walletAddress, isHost: true, roomDeleted: true };
        }
        // If game in progress, mark host as disconnected
        room.host.socketId = null;
        return { roomId, walletAddress: room.host.walletAddress, isHost: true };
      }

      // Check participants
      const participantIndex = room.participants.findIndex(p => p.socketId === socketId);
      if (participantIndex !== -1) {
        const participant = room.participants[participantIndex];
        
        // If game hasn't started, remove participant
        if (room.status === 'waiting') {
          room.participants.splice(participantIndex, 1);
          console.log(`👋 Participant ${participant.username} removed from room ${room.code}`);
        } else {
          // If game in progress, mark as disconnected
          participant.socketId = null;
        }
        
        return { roomId, walletAddress: participant.walletAddress, isHost: false };
      }
    }

    return null;
  }

  /**
   * Sanitize room data for client (hide sensitive info)
   * @param {Object} room 
   * @returns {Object}
   */
  sanitizeRoom(room) {
    return {
      id: room.id,
      code: room.code,
      host: {
        username: room.host.username,
        walletAddress: room.host.walletAddress
      },
      config: {
        entryFee: room.config.entryFee,
        asset: room.config.asset,
        maxPlayers: room.config.maxPlayers,
        topic: room.config.topic,
        isPublic: room.config.isPublic,
        hasPassword: !!room.config.password
      },
      participants: room.participants.map(p => ({
        username: p.username,
        walletAddress: p.walletAddress,
        hasPaid: p.hasPaid
      })),
      status: room.status,
      createdAt: room.createdAt,
      currentPlayers: room.participants.length + 1 // +1 for host
    };
  }
}

module.exports = new RoomService();
