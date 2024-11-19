import dotenv from "dotenv";
import path from 'path';
import express from "express";
import locationRoutes from "./routes/locations";

// Load environment variables from .env file
const result = dotenv.config({ path: path.resolve(process.cwd(), '.env') });

if (result.error) {
  console.error('Error loading .env file:', result.error);
} else {
  console.log('Environment variables loaded successfully');
  console.log('WEATHER_API_KEY exists:', !!process.env.WEATHER_API_KEY);
}

console.log('[App] Environment check:', {
  hasWeatherKey: !!process.env.WEATHER_API_KEY,
  weatherKeyLength: process.env.WEATHER_API_KEY?.length,
  port: process.env.PORT,
});

const app = express();

// Middleware
app.use(express.json());
app.use((req, res, next) => {
  res.header('Access-Control-Allow-Origin', '*');
  res.header('Access-Control-Allow-Methods', 'GET, POST, OPTIONS');
  res.header('Access-Control-Allow-Headers', 'Content-Type');
  next();
});

// Routes
app.use("/api/locations", locationRoutes);

if (process.env.NODE_ENV !== 'production') {
  const PORT = process.env.PORT || 3000;
  app.listen(PORT, () => {
    console.log(`Server running on port ${PORT}`);
  });
}

export default app;
