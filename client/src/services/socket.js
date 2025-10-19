import io from 'socket.io-client';

import { API_BASE_URL } from '../config/api.js';
const SOCKET_URL = API_BASE_URL;

// Create socket instance
export const socket = io(SOCKET_URL, {
  autoConnect: true,
  reconnection: true,
  reconnectionAttempts: 5,
  reconnectionDelay: 1000
});

// Socket event handlers
socket.on('connect', () => {
  console.log('Connected to socket server');
});

socket.on('disconnect', () => {
  console.log('Disconnected from socket server');
});

socket.on('connect_error', (error) => {
  console.error('Socket connection error:', error);
});

// Initialize socket with token
export const initSocket = (token) => {
  if (socket.disconnected) {
    socket.auth = { token };
    socket.connect();
  }
  return socket;
};

// Disconnect socket
export const disconnectSocket = () => {
  if (socket.connected) {
    socket.disconnect();
    console.log('Socket disconnected manually');
  }
};

// Export socket instance
export default socket; 