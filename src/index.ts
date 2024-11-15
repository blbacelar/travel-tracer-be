import express from "express";
import * as dotenv from "dotenv";
import { resolve } from "path";
import locationRoutes from "@/application/routes/locationRoutes";

// Load environment variables from .env file
dotenv.config({ path: resolve(__dirname, "../.env") });

const app = express();
const PORT = process.env.PORT || 3000;

app.use(express.json());

// Routes
app.use("/api/locations", locationRoutes);

app.listen(PORT, () => {
  console.log(`Server is running on port ${PORT}`);
  console.log('Environment variables loaded:', {
    OPENWEATHER_API_KEY: process.env.OPENWEATHER_API_KEY ? 'Set' : 'Not set',
    PORT: process.env.PORT
  });
});
