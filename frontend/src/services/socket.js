import { io } from 'socket.io-client';

let socket = null;

const getSocketBaseUrl = () => {
  if (typeof window !== 'undefined' && window.location) {
    const protocol = window.location.protocol === 'https:' ? 'https:' : 'http:';
    const hostname = window.location.hostname || 'localhost';
    return `${protocol}//${hostname}:5000`;
  }
  return 'http://localhost:5000';
};

export function getSocket() {
  if (!socket) {
    socket = io(getSocketBaseUrl(), {
      transports: ['websocket', 'polling'],
      reconnectionAttempts: 10,
      reconnectionDelay: 2000,
    });

    socket.on('connect', () => {
      console.log('⚡ Connected to SWMS Real-Time WebSocket Server (Socket.IO):', socket.id);
    });

    socket.on('disconnect', (reason) => {
      console.log('🔌 Disconnected from SWMS WebSocket Server:', reason);
    });

    socket.on('connect_error', (err) => {
      console.warn('WebSocket connection attempt fallback:', err.message);
    });
  }
  return socket;
}

/**
 * Join specific role room (e.g. 'admin', 'collector', 'citizen')
 */
export function joinRoleRoom(role) {
  const s = getSocket();
  if (s && s.connected) {
    s.emit('join:role', role);
  } else if (s) {
    s.once('connect', () => {
      s.emit('join:role', role);
    });
  }
}

/**
 * Broadcast live collector GPS position
 */
export function broadcastCollectorGps(data) {
  const s = getSocket();
  if (s) {
    s.emit('collector:location', data);
  }
}

/**
 * Subscribe to bin telemetry updates
 */
export function onBinUpdate(callback) {
  const s = getSocket();
  s.on('bin:update', callback);
  return () => s.off('bin:update', callback);
}

/**
 * Subscribe to live moving vehicle locations
 */
export function onVehicleLocation(callback) {
  const s = getSocket();
  s.on('vehicle:location', callback);
  return () => s.off('vehicle:location', callback);
}

/**
 * Subscribe to critical bin overflow events
 */
export function onBinCritical(callback) {
  const s = getSocket();
  s.on('bin:critical', callback);
  return () => s.off('bin:critical', callback);
}

/**
 * Subscribe to new automated collection requests
 */
export function onCollectionEvent(callback) {
  const s = getSocket();
  s.on('collection:created', callback);
  s.on('collection:completed', callback);
  return () => {
    s.off('collection:created', callback);
    s.off('collection:completed', callback);
  };
}

/**
 * Subscribe to complaints
 */
export function onComplaintEvent(callback) {
  const s = getSocket();
  s.on('complaint:created', callback);
  s.on('complaint:updated', callback);
  return () => {
    s.off('complaint:created', callback);
    s.off('complaint:updated', callback);
  };
}

/**
 * Disconnect socket cleanly
 */
export function disconnectSocket() {
  if (socket) {
    socket.disconnect();
    socket = null;
  }
}

export default {
  getSocket,
  joinRoleRoom,
  broadcastCollectorGps,
  onBinUpdate,
  onVehicleLocation,
  onBinCritical,
  onCollectionEvent,
  onComplaintEvent,
  disconnectSocket,
};
