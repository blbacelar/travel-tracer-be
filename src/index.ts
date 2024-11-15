import 'module-alias/register';
import express from "express";
import * as dotenv from "dotenv";
import { resolve } from "path";
import locationRoutes from "@/application/routes/locationRoutes";
import { CacheService } from "@/infrastructure/services/CacheService";

// Load environment variables from .env file
dotenv.config({ path: resolve(__dirname, "../.env") });

const app = express();
const PORT = process.env.PORT || 3000;

app.use(express.json());

// Routes
app.use("/api/locations", locationRoutes);

const server = app.listen(PORT, () => {
  console.log(`Server is running on port ${PORT}`);
  console.log('Environment variables loaded:', {
    OPENWEATHER_API_KEY: process.env.OPENWEATHER_API_KEY ? 'Set' : 'Not set',
    PORT: process.env.PORT
  });
});

// Handle graceful shutdown
process.on('SIGTERM', shutdown);
process.on('SIGINT', shutdown);

async function shutdown() {
  console.log('Received kill signal, shutting down gracefully');
  
  // Close the HTTP server
  server.close(() => {
    console.log('HTTP server closed');
  });

  try {
    // Disconnect Redis
    const cacheService = new CacheService();
    await cacheService.disconnect();
    console.log('Redis connection closed');
    
    process.exit(0);
  } catch (err) {
    console.error('Error during shutdown:', err);
    process.exit(1);
  }
}
