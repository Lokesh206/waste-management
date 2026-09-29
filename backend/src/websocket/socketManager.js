const { Server } = require('socket.io');
const logger = require('../utils/logger');

let io = null;

function initSocket(server) {
  io = new Server(server, {
    cors: {
      origin: '*',
      methods: ['GET', 'POST', 'PUT', 'PATCH', 'DELETE'],
      credentials: true,
    },
    transports: ['websocket', 'polling'],
  });

  io.on('connection', (socket) => {
    logger.info(`🔌 WebSocket Client connected: ${socket.id}`);

    // Client can subscribe to role channels (e.g. 'admin', 'collector', 'citizen')
    socket.on('join:role', (role) => {
      if (role) {
        socket.join(`role:${role}`);
        logger.info(`Socket ${socket.id} joined role:${role}`);
      }
    });

    // Collector broadcasts live GPS
    socket.on('collector:location', (data) => {
      io.emit('vehicle:location', {
        ...data,
        received_at: new Date().toISOString(),
      });
    });

    // Real-time ping test
    socket.on('ping:client', (cb) => {
      if (typeof cb === 'function') cb({ status: 'PONG', serverTime: new Date().toISOString() });
    });

    socket.on('disconnect', () => {
      logger.info(`🔌 WebSocket Client disconnected: ${socket.id}`);
    });
  });

  logger.info('⚡ Socket.IO real-time event engine initialized successfully.');
  return io;
}

function getIo() {
  return io;
}

/**
 * Broadcast an event to all connected clients
 */
function emitEvent(event, data) {
  if (io) {
    io.emit(event, data);
  }
}

/**
 * Broadcast to a specific role channel
 */
function emitToRole(role, event, data) {
  if (io) {
    io.to(`role:${role}`).emit(event, data);
  }
}

module.exports = {
  initSocket,
  getIo,
  emitEvent,
  emitToRole,
};
