import { io, Socket } from 'socket.io-client';
import readline from 'readline';
import axios, { AxiosError } from 'axios';

// Define Firestore Timestamp interface
interface FirestoreTimestamp {
  _seconds: number;
  _nanoseconds: number;
}

interface ChatMessage {
  id: string;
  senderId: string;
  content: string;
  timestamp: FirestoreTimestamp;
  roomId: string;
  readStatus: boolean;
}

interface ChatRoom {
  id: string;
  type: 'private' | 'group';
  participants: string[];
  createdAt: FirestoreTimestamp;
  lastMessage?: ChatMessage;
}

const PORT = 3001;
const API_URL = `http://localhost:${PORT}/api`;
const SOCKET_URL = `http://localhost:${PORT}`;
const TEST_USER_ID = process.env.TEST_USER_ID || 'test_user_' + Math.random().toString(36).substr(2, 9);

const rl = readline.createInterface({
  input: process.stdin,
  output: process.stdout
});

async function startChatClient() {
  // Set NODE_ENV to test
  process.env.NODE_ENV = 'test';
  
  console.log('Starting chat client...', `\nUser ID: ${TEST_USER_ID}`);
  
  const socket: Socket = io(SOCKET_URL, {
    auth: {
      token: TEST_USER_ID
    }
  });

  // Socket event handlers
  socket.on('connect', () => {
    console.log('Connected to chat server');
    showCommands();
  });

  socket.on('error', (error: { message: string, details?: string }) => {
    console.error('Socket error:', error.message);
    if (error.details) {
      console.error('Details:', error.details);
    }
  });

  socket.on('newMessage', (message: ChatMessage) => {
    console.log('\nNew message received:', message);
    showCommands();
  });

  socket.on('userTyping', ({ userId }: { userId: string }) => {
    console.log(`\nUser ${userId} is typing...`);
  });

  socket.on('userStoppedTyping', ({ userId }: { userId: string }) => {
    console.log(`\nUser ${userId} stopped typing`);
  });

  socket.on('roomJoined', ({ roomId }) => {
    console.log(`Successfully joined room: ${roomId}`);
  });

  socket.on('messageHistory', ({ roomId, messages }) => {
    console.log(`\nMessage history for room ${roomId}:`);
    if (messages.length === 0) {
      console.log('No messages in this room yet');
    } else {
      messages.forEach((msg: ChatMessage) => {
        // Convert Firestore timestamp to Date
        const timestamp = new Date(msg.timestamp._seconds * 1000).toLocaleString();
        console.log(`[${timestamp}] ${msg.senderId}: ${msg.content}`);
      });
    }
    console.log('---End of history---\n');
  });

  // Command handler
  function showCommands() {
    rl.question(`
Current User ID: ${TEST_USER_ID}

Available Commands:
1. Create Room (c <participant_id>) - First create a room with another user
2. List Rooms (l) - List your rooms and their IDs
3. Join Room (j <room_id>) - Join using the actual room ID from step 2
4. Send Message (s <room_id> <message>)
5. Start Typing (t <room_id>)
6. Stop Typing (st <room_id>)
7. Quit (q)

Example workflow:
1. User1: c user2           (Creates room)
2. User1: l                 (Gets room ID)
3. Both: j actual-room-id   (Join with the actual room ID)

Enter command: `, async (input) => {
      const [command, ...args] = input.split(' ');

      try {
        switch (command) {
          case 'c':
            const participantId = args[0];
            console.log(`Creating room with participant: ${participantId}...`);
            const response = await axios.post<ChatRoom>(
              `${API_URL}/chat/rooms`,
              {
                type: 'private',
                participants: [participantId]
              },
              {
                headers: {
                  'Authorization': `Bearer ${TEST_USER_ID}`,
                  'Content-Type': 'application/json'
                }
              }
            );
            console.log('\nRoom created successfully:');
            console.log('Room ID:', response.data.id);
            console.log('Participants:', response.data.participants);
            break;

          case 'l':
            console.log('Fetching your rooms...');
            const rooms = await axios.get<ChatRoom[]>(
              `${API_URL}/chat/rooms`,
              {
                headers: {
                  'Authorization': `Bearer ${TEST_USER_ID}`
                }
              }
            );
            console.log('\nYour rooms:');
            rooms.data.forEach(room => {
              console.log(`- Room ID: ${room.id}`);
              console.log(`  Participants: ${room.participants.join(', ')}`);
              console.log(`  Type: ${room.type}`);
              console.log('---');
            });
            break;

          case 'j':
            const roomId = args[0];
            if (!roomId) {
              console.log('Error: Room ID is required. Use the actual room ID from the list command.');
              break;
            }
            console.log(`Attempting to join room: ${roomId} as user: ${TEST_USER_ID}`);
            socket.emit('joinRoom', roomId);
            break;

          case 's':
            const [messageRoomId, ...messageParts] = args;
            const message = messageParts.join(' ');
            socket.emit('sendMessage', { roomId: messageRoomId, content: message });
            console.log(`Sending message to room ${messageRoomId}: ${message}`);
            break;

          case 't':
            socket.emit('typing', args[0]);
            console.log(`Started typing in room ${args[0]}`);
            break;

          case 'st':
            socket.emit('stopTyping', args[0]);
            console.log(`Stopped typing in room ${args[0]}`);
            break;

          case 'q':
            socket.disconnect();
            rl.close();
            process.exit(0);
            break;

          default:
            console.log('Invalid command');
        }
      } catch (error) {
        if (error instanceof AxiosError) {
          console.error('Error:', error.response?.data || error.message);
          console.error('Status:', error.response?.status);
          console.error('URL:', error.config?.url);
        } else {
          console.error('Error:', error);
        }
      }

      if (command !== 'q') {
        showCommands();
      }
    });
  }
}

// Start the client
startChatClient(); 