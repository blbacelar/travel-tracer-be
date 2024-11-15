import * as dotenv from "dotenv";
import { resolve } from "path";

// Load environment variables before other imports
dotenv.config({ path: resolve(__dirname, "../.env") });

import express from "express";
import locationRoutes from "./application/routes/locationRoutes";

const app = express();
const PORT = process.env.PORT || 3000;

app.use(express.json());
app.use("/api/locations", locationRoutes);

app.listen(PORT, () => {
  console.log(`Server is running on port ${PORT}`);
  console.log('Environment variables loaded:', {
    WEATHER_API_KEY: process.env.WEATHER_API_KEY ? 'Set' : 'Not set',
    PORT: process.env.PORT
  });
});
