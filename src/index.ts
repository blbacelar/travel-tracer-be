import * as dotenv from "dotenv";
import { resolve } from "path";

// Load environment variables before other imports
dotenv.config({ path: resolve(__dirname, "../.env") });

import express from "express";
import locationRoutes from "./application/routes/locationRoutes";

const app = express();

// Add CORS headers for Vercel
app.use((req, res, next) => {
  res.setHeader('Access-Control-Allow-Origin', '*');
  res.setHeader('Access-Control-Allow-Methods', 'GET, POST, OPTIONS');
  res.setHeader('Access-Control-Allow-Headers', 'Content-Type');
  next();
});

app.use(express.json());
app.use("/api/locations", locationRoutes);

// Vercel specific: Check if we're in production
if (process.env.NODE_ENV !== 'production') {
  const PORT = process.env.PORT || 3000;
  app.listen(PORT, () => {
    console.log(`Server is running on port ${PORT}`);
    console.log('Environment variables loaded:', {
      WEATHER_API_KEY: process.env.WEATHER_API_KEY ? 'Set' : 'Not set',
      PORT: process.env.PORT
    });
  });
}

// Export for Vercel
export default app;
