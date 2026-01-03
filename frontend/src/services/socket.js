import { io } from 'socket.io-client';

const SOCKET_URL = process.env.REACT_APP_SOCKET_URL || 'http://localhost:5000';

class SocketService {
  constructor() {
    this.socket = null;
  }

  connect(token) {
    if (this.socket?.connected) {
      return this.socket;
    }

    this.socket = io(SOCKET_URL, {
      auth: { token },
      transports: ['websocket', 'polling'],
      reconnection: true,
      reconnectionAttempts: 5,
      reconnectionDelay: 1000,
      timeout: 20000,
      withCredentials: true
    });

    this.socket.on('connect', () => {
      console.log('✅ Socket connected');
    });

    this.socket.on('disconnect', () => {
      console.log('❌ Socket disconnected');
    });

    this.socket.on('connect_error', (error) => {
      console.error('Socket connection error:', error);
    });

    return this.socket;
  }

  disconnect() {
    if (this.socket) {
      this.socket.disconnect();
      this.socket = null;
    }
  }

  // Lobby events
  getRooms(callback) {
    this.socket?.emit('get-rooms', callback);
  }

  createRoom(data, callback) {
    this.socket?.emit('create-room', data, callback);
  }

  joinRoom(data, callback) {
    this.socket?.emit('join-room', data, callback);
  }

  leaveRoom(data, callback) {
    this.socket?.emit('leave-room', data, callback);
  }

  // Game events
  playerAction(data, callback) {
    this.socket?.emit('player-action', data, callback);
  }

  sendChatMessage(data) {
    this.socket?.emit('chat-message', data);
  }

  // Generic emit method for any event
  emit(event, data, callback) {
    this.socket?.emit(event, data, callback);
  }

  // Event listeners
  on(event, callback) {
    console.log(`📡 Registering listener for event: ${event}`);
    this.socket?.on(event, callback);
  }

  off(event, callback) {
    this.socket?.off(event, callback);
  }

  // Remove all listeners for an event
  removeAllListeners(event) {
    this.socket?.removeAllListeners(event);
  }
}

const socketService = new SocketService();
export default socketService;
