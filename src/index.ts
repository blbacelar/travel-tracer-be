import dotenv from "dotenv";
import path from "path";
import express from "express";
import { clerkAuth } from "./middleware/auth";
import locationRoutes from "./routes/locations";
import chatRoutes from "./routes/chat";
import { createServer } from "http";
import { ChatService } from "./services/socketService";

// Load environment variables from .env file
const result = dotenv.config({ path: path.resolve(process.cwd(), ".env") });

if (result.error) {
  console.error("Error loading .env file:", result.error);
} else {
  console.log("Environment variables loaded successfully");
}

const app = express();

// Middleware
app.use(express.json());

// CORS middleware - must be before routes
app.use((req, res, next) => {
  res.header("Access-Control-Allow-Origin", process.env.FRONTEND_URL || "*");
  res.header("Access-Control-Allow-Methods", "GET, POST, OPTIONS");
  res.header("Access-Control-Allow-Headers", "Content-Type, Authorization");
  res.header("Access-Control-Allow-Credentials", "true");

  if (req.method === "OPTIONS") {
    return res.sendStatus(200);
  }
  next();
});

// Only use Clerk auth in production
if (process.env.NODE_ENV !== "development") {
  app.use(clerkAuth);
}

// Debug middleware to log requests
app.use((req, res, next) => {
  console.log(`[${new Date().toISOString()}] ${req.method} ${req.url}`);
  next();
});

// Routes
app.use("/api/locations", locationRoutes);
app.use("/api/chat", chatRoutes);

// Error handling middleware
app.use(
  (
    err: any,
    req: express.Request,
    res: express.Response,
    next: express.NextFunction
  ) => {
    console.error("Error:", err);
    res.status(500).json({ error: "Internal server error" });
  }
);

// 404 handler
app.use((req, res) => {
  res.status(404).json({ error: `Cannot ${req.method} ${req.url}` });
});

const server = createServer(app);

// Make sure NODE_ENV is set
if (!process.env.NODE_ENV) {
  process.env.NODE_ENV = 'development';
}

const chatService = new ChatService(server);

// Always start the server in test mode
if (process.env.NODE_ENV === "test" || process.env.NODE_ENV !== "production") {
  const PORT = process.env.PORT || 3000;
  server.listen(PORT, () => {
    console.log(`Server running on port ${PORT}`);
  });
}

export default server;
