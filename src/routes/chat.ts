import { Router, Request, Response, NextFunction } from "express";
import { db, ChatRoom, createTimestamp } from "../services/firebaseService";
import { requireAuth } from "@clerk/express";

interface CreateRoomBody {
  type: "private" | "group";
  participants: string[];
}

// Define our own auth interface without extending
interface TestAuthInfo {
  userId: string;
  sessionId: string;
  session: {
    id: string;
    userId: string;
  };
  claims: Record<string, any>;
  getToken: () => Promise<string>;
}

// Request with our auth type
interface RequestWithAuth extends Request {
  auth?: TestAuthInfo;
}

const router = Router();

// Middleware to handle test mode authentication
const testAuthMiddleware = (
  req: Request,
  res: Response,
  next: NextFunction
) => {
  if (process.env.NODE_ENV === "development") {
    const userId = req.headers.authorization?.replace("Bearer ", "");
    (req as RequestWithAuth).auth = {
      userId: userId || "",
      sessionId: "test-session",
      session: {
        id: "test-session",
        userId: userId || "",
      },
      claims: {},
      getToken: async () => "test-token",
    };
    next();
  } else {
    requireAuth()(req, res, next);
  }
};

// Helper function to ensure collection exists
async function ensureCollection(collectionName: string) {
  try {
    // Try to access the collection
    const collection = db.collection(collectionName);
    const docs = await collection.limit(1).get();

    // If we get here, collection exists
    return true;
  } catch (error) {
    if ((error as any).code === 5) {
      // NOT_FOUND error
      // Create a dummy document to initialize the collection
      await db.collection(collectionName).doc("_init").set({
        _created: createTimestamp(),
        _type: "system",
      });
      // Delete the dummy document
      await db.collection(collectionName).doc("_init").delete();
      return true;
    }
    throw error;
  }
}

// Create a new chat room
router.post(
  "/rooms",
  testAuthMiddleware,
  async (req: Request, res: Response) => {
    try {
      const { type, participants } = req.body as CreateRoomBody;
      const auth = (req as RequestWithAuth).auth;
      const userId = auth?.userId;

      if (!userId || !auth) {
        throw new Error("User not authenticated");
      }

      // Ensure the chats collection exists
      await ensureCollection("chats");

      const participantsList = [...participants];
      if (!participantsList.includes(userId)) {
        participantsList.push(userId);
      }

      const room: Omit<ChatRoom, "id"> = {
        type,
        participants: participantsList,
        createdAt: createTimestamp(),
      };

      console.log("Creating room with data:", room);

      const roomRef = await db.collection("chats").add(room);
      const roomDoc = await roomRef.get();

      if (!roomDoc.exists) {
        throw new Error("Failed to create room");
      }

      const createdRoom = {
        id: roomRef.id,
        ...roomDoc.data(),
      };

      console.log("Room created successfully:", createdRoom);
      res.json(createdRoom);
    } catch (error) {
      console.error("[Chat] Create room error:", error);
      res.status(500).json({
        error: "Failed to create chat room",
        details: error instanceof Error ? error.message : "Unknown error",
      });
    }
  }
);

// Get user's chat rooms
router.get(
  "/rooms",
  testAuthMiddleware,
  async (req: Request, res: Response) => {
    try {
      const auth = (req as RequestWithAuth).auth;
      const userId = auth?.userId;

      if (!userId || !auth) {
        throw new Error("User not authenticated");
      }

      console.log("Fetching rooms for user:", userId);

      // Ensure the chats collection exists
      await ensureCollection("chats");

      const roomsSnapshot = await db
        .collection("chats")
        .where("participants", "array-contains", userId)
        .get();

      if (roomsSnapshot.empty) {
        console.log("No rooms found for user:", userId);
        return res.json([]);
      }

      const rooms = roomsSnapshot.docs.map((doc) => ({
        id: doc.id,
        ...doc.data(),
      }));

      console.log("Found rooms:", rooms);
      res.json(rooms);
    } catch (error) {
      console.error("[Chat] Get rooms error:", error);
      res.status(500).json({
        error: "Failed to fetch chat rooms",
        details: error instanceof Error ? error.message : "Unknown error",
      });
    }
  }
);

export default router;
