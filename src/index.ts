import express from "express";
import * as dotenv from "dotenv";
import { resolve } from "path";
import locationRoutes from "./application/routes/locationRoutes";

dotenv.config({ path: resolve(__dirname, "../.env") });

const app = express();
const PORT = process.env.PORT || 3000;

app.use(express.json());
app.use("/api/locations", locationRoutes);

app.listen(PORT, () => {
  console.log(`Server is running on port ${PORT}`);
});
