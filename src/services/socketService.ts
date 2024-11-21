import { Server as HTTPServer } from 'http';
import { Server, Socket } from 'socket.io';
import { db, ChatMessage, ChatRoom, createTimestamp } from './firebaseService';
import { clerkClient } from '@clerk/express';
import { DefaultEventsMap } from 'socket.io/dist/typed-events';

interface AuthenticatedSocket extends Socket<DefaultEventsMap, DefaultEventsMap, DefaultEventsMap> {
  userId: string;
  activeRooms: Set<string>;
}

interface MessagePayload {
  roomId: string;
  content: string;
}

export class ChatService {
  private io: Server;
  private userSockets: Map<string, AuthenticatedSocket> = new Map();

  constructor(server: HTTPServer) {
    this.io = new Server(server, {
      cors: {
        origin: process.env.FRONTEND_URL || '*',
        methods: ['GET', 'POST'],
        credentials: true
      }
    });

    this.setupSocketHandlers();
  }

  private async authenticateConnection(
    socket: Socket,
    next: (err?: Error) => void
  ) {
    try {
      const token = socket.handshake.auth.token;
      if (!token) {
        throw new Error('Authentication token required');
      }

      const authenticatedSocket = socket as AuthenticatedSocket;
      authenticatedSocket.userId = token;
      authenticatedSocket.activeRooms = new Set();
      
      this.userSockets.set(token, authenticatedSocket);
      next();
    } catch (error) {
      console.error('[Socket] Authentication error:', error);
      next(new Error('Authentication failed'));
    }
  }

  private setupSocketHandlers() {
    this.io.use((socket, next) => this.authenticateConnection(socket, next));

    this.io.on('connection', (socket: Socket) => {
      const authenticatedSocket = socket as AuthenticatedSocket;
      console.log(`[Socket] User connected: ${authenticatedSocket.userId}`);

      socket.on('joinRoom', (roomId: string) => this.handleJoinRoom(authenticatedSocket, roomId));
      socket.on('sendMessage', (data) => this.handleSendMessage(authenticatedSocket, data));
      socket.on('typing', (roomId) => this.handleTyping(authenticatedSocket, roomId));
      socket.on('stopTyping', (roomId) => this.handleStopTyping(authenticatedSocket, roomId));
      socket.on('disconnect', () => this.handleDisconnect(authenticatedSocket));
    });
  }

  private async handleJoinRoom(socket: AuthenticatedSocket, roomId: string) {
    try {
      console.log(`[Socket] Attempting to join room ${roomId} for user ${socket.userId}`);
      
      const roomRef = db.collection('chats').doc(roomId);
      const room = await roomRef.get();

      if (!room.exists) {
        console.log(`[Socket] Room ${roomId} not found`);
        socket.emit('error', { message: `Chat room ${roomId} not found` });
        return;
      }

      const roomData = room.data() as ChatRoom;
      console.log(`[Socket] Room data:`, roomData);

      if (!roomData.participants.includes(socket.userId)) {
        console.log(`[Socket] User ${socket.userId} not in participants list:`, roomData.participants);
        
        // Add user to participants if they're trying to join
        await roomRef.update({
          participants: [...roomData.participants, socket.userId]
        });
        console.log(`[Socket] Added user ${socket.userId} to participants`);
      }

      socket.join(roomId);
      socket.activeRooms.add(roomId);

      // Fetch recent messages when joining
      const messagesRef = db
        .collection('chats')
        .doc(roomId)
        .collection('messages');

      // Check if messages collection exists
      const messagesSnapshot = await messagesRef
        .orderBy('timestamp', 'desc')
        .limit(50)
        .get();

      console.log(`[Socket] Found ${messagesSnapshot.size} messages for room ${roomId}`);
      console.log('[Socket] Messages:', messagesSnapshot.docs.map(doc => doc.data()));

      const messageHistory = messagesSnapshot.docs.map(doc => ({
        id: doc.id,
        ...doc.data()
      })).reverse(); // Reverse to show oldest first

      // Send message history to the joining user
      socket.emit('messageHistory', { 
        roomId, 
        messages: messageHistory 
      });
      console.log(`[Socket] Sent message history to user ${socket.userId} for room ${roomId}:`, messageHistory);

      // Set up real-time listeners for this room
      this.setupRoomListener(socket, roomId);

      console.log(`[Socket] User ${socket.userId} successfully joined room ${roomId}`);
      socket.emit('roomJoined', { roomId });
    } catch (error) {
      console.error('[Socket] Join room error:', error);
      socket.emit('error', { 
        message: 'Failed to join room',
        details: error instanceof Error ? error.message : 'Unknown error'
      });
    }
  }

  private async handleSendMessage(
    socket: AuthenticatedSocket,
    { roomId, content }: { roomId: string; content: string }
  ) {
    try {
      console.log(`[Socket] Sending message to room ${roomId} from user ${socket.userId}`);
      
      // Check if user is in room
      if (!socket.activeRooms.has(roomId)) {
        console.log(`[Socket] User ${socket.userId} not in room ${roomId}, joining...`);
        await this.handleJoinRoom(socket, roomId);
      }

      const message: ChatMessage = {
        senderId: socket.userId,
        content,
        timestamp: createTimestamp(),
        roomId,
        readStatus: false
      };

      const messageRef = await db
        .collection('chats')
        .doc(roomId)
        .collection('messages')
        .add(message);

      // Update last message in room
      await db.collection('chats').doc(roomId).update({
        lastMessage: message
      });

      const messageWithId = {
        id: messageRef.id,
        ...message
      };

      console.log(`[Socket] Broadcasting message to room ${roomId}:`, messageWithId);
      
      // Broadcast to all sockets in the room
      this.io.to(roomId).emit('newMessage', messageWithId);

      // Log connected sockets in room
      const room = this.io.sockets.adapter.rooms.get(roomId);
      console.log(`[Socket] Sockets in room ${roomId}:`, Array.from(room || []));

    } catch (error) {
      console.error('[Socket] Send message error:', error);
      socket.emit('error', { message: 'Failed to send message' });
    }
  }

  private setupRoomListener(socket: AuthenticatedSocket, roomId: string) {
    console.log(`[Socket] Setting up room listener for ${roomId}`);
    
    const messagesRef = db
      .collection('chats')
      .doc(roomId)
      .collection('messages')
      .orderBy('timestamp', 'desc')
      .limit(50);

    messagesRef.onSnapshot(
      (snapshot) => {
        snapshot.docChanges().forEach((change) => {
          if (change.type === 'added') {
            const message = change.doc.data() as ChatMessage;
            const messageWithId = {
              id: change.doc.id,
              ...message
            };
            console.log(`[Socket] New message in room ${roomId}:`, messageWithId);
            this.io.to(roomId).emit('newMessage', messageWithId);
          }
        });
      },
      (error) => {
        console.error('[Socket] Room listener error:', error);
      }
    );
  }

  private handleTyping(socket: AuthenticatedSocket, roomId: string) {
    socket.to(roomId).emit('userTyping', { userId: socket.userId });
  }

  private handleStopTyping(socket: AuthenticatedSocket, roomId: string) {
    socket.to(roomId).emit('userStoppedTyping', { userId: socket.userId });
  }

  private handleDisconnect(socket: AuthenticatedSocket) {
    console.log(`[Socket] User disconnected: ${socket.userId}`);
    this.userSockets.delete(socket.userId);
    
    // Leave all active rooms
    socket.activeRooms.forEach((roomId) => {
      socket.leave(roomId);
    });
  }
} 