import io from 'socket.io-client';

import { API_BASE_URL } from '../config/api.js';
const SOCKET_URL = API_BASE_URL;

// Create socket instance
export const socket = io(SOCKET_URL, {
  autoConnect: false, // Don't auto-connect without token
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
  if (!token) {
    console.warn('No token provided for socket connection');
    return socket;
  }
  
  if (socket.disconnected) {
    socket.auth = { token };
    socket.connect();
  } else if (socket.connected) {
    // If already connected but with different token, reconnect
    socket.auth = { token };
    socket.disconnect();
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