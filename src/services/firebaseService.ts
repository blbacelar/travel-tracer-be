import { initializeApp, cert, ServiceAccount } from "firebase-admin/app";
import { getFirestore, Timestamp } from "firebase-admin/firestore";

// Define Firebase error interface
interface FirebaseError extends Error {
  code?: number | string;
  details?: string;
}

let serviceAccount: ServiceAccount;
try {
  const serviceAccountStr = process.env.FIREBASE_SERVICE_ACCOUNT || "{}";
  const parsedConfig = JSON.parse(serviceAccountStr);

  // Convert to ServiceAccount format
  serviceAccount = {
    projectId: parsedConfig.project_id,
    privateKey: parsedConfig.private_key.replace(/\\n/g, '\n'),
    clientEmail: parsedConfig.client_email,
  };

} catch (error) {
  console.error("Error parsing Firebase service account:", error);
  throw new Error(
    "Failed to initialize Firebase: Invalid service account configuration"
  );
}

// Initialize Firebase Admin
const app = initializeApp({
  credential: cert(serviceAccount),
  projectId: serviceAccount.projectId
});

// Initialize Firestore
export const db = getFirestore(app);

// Initialize Firestore collections
async function initializeFirestore() {
  try {
    // Try to access the chats collection
    const chatsRef = db.collection('chats');
    const snapshot = await chatsRef.limit(1).get();
    
    if (snapshot.empty) {
      console.log('Creating initial chat collection...');
      // Create initial document if collection is empty
      await chatsRef.doc('_init').set({
        _created: Timestamp.now(),
        _type: 'system',
        _test: true
      });
      
      // Delete the initial document
      await chatsRef.doc('_init').delete();
    }
    
    console.log('Firestore initialized successfully');
  } catch (error: unknown) {
    const fbError = error as FirebaseError;
    
    if (fbError.code === 5) { // NOT_FOUND error
      console.log('Database or collection not found, attempting to create...');
      try {
        // Create the chats collection with a test document
        await db.collection('chats').doc('_init').create({
          _created: Timestamp.now(),
          _type: 'system'
        });
        console.log('Successfully created initial Firestore structure');
      } catch (createError) {
        console.error('Failed to create Firestore structure:', createError);
      }
    } else {
      console.error('Unexpected Firestore error:', {
        code: fbError.code,
        message: fbError.message,
        details: fbError.details
      });
    }
  }
}

// Initialize but don't wait
initializeFirestore().catch(error => {
  console.error('Failed to initialize Firestore:', error);
  // Don't exit, just log the error
});

export interface ChatMessage {
  senderId: string;
  content: string;
  timestamp: Timestamp;
  roomId: string;
  readStatus: boolean;
}

export interface ChatRoom {
  id: string;
  type: "private" | "group";
  participants: string[];
  createdAt: Timestamp;
  lastMessage?: ChatMessage;
}

export const createTimestamp = () => Timestamp.now();
