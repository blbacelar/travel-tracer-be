"use strict";
var __createBinding = (this && this.__createBinding) || (Object.create ? (function(o, m, k, k2) {
    if (k2 === undefined) k2 = k;
    var desc = Object.getOwnPropertyDescriptor(m, k);
    if (!desc || ("get" in desc ? !m.__esModule : desc.writable || desc.configurable)) {
      desc = { enumerable: true, get: function() { return m[k]; } };
    }
    Object.defineProperty(o, k2, desc);
}) : (function(o, m, k, k2) {
    if (k2 === undefined) k2 = k;
    o[k2] = m[k];
}));
var __setModuleDefault = (this && this.__setModuleDefault) || (Object.create ? (function(o, v) {
    Object.defineProperty(o, "default", { enumerable: true, value: v });
}) : function(o, v) {
    o["default"] = v;
});
var __importStar = (this && this.__importStar) || function (mod) {
    if (mod && mod.__esModule) return mod;
    var result = {};
    if (mod != null) for (var k in mod) if (k !== "default" && Object.prototype.hasOwnProperty.call(mod, k)) __createBinding(result, mod, k);
    __setModuleDefault(result, mod);
    return result;
};
var __importDefault = (this && this.__importDefault) || function (mod) {
    return (mod && mod.__esModule) ? mod : { "default": mod };
};
Object.defineProperty(exports, "__esModule", { value: true });
require("module-alias/register");
const express_1 = __importDefault(require("express"));
const dotenv = __importStar(require("dotenv"));
const path_1 = require("path");
const locationRoutes_1 = __importDefault(require("./application/routes/locationRoutes"));
const CacheService_1 = require("./infrastructure/services/CacheService");
// Load environment variables from .env file
dotenv.config({ path: (0, path_1.resolve)(__dirname, "../.env") });
const app = (0, express_1.default)();
const PORT = process.env.PORT || 3000;
app.use(express_1.default.json());
// Routes
app.use("/api/locations", locationRoutes_1.default);
const server = app.listen(PORT, () => {
    console.log(`Server is running on port ${PORT}`);
    console.log(`API URL: ${process.env.RAILWAY_STATIC_URL || "http://localhost:" + PORT}`);
    console.log("Environment variables loaded:", {
        WEATHER_API_KEY: process.env.WEATHER_API_KEY ? "Set" : "Not set",
        PORT: process.env.PORT,
    });
});
// Handle graceful shutdown
process.on("SIGTERM", shutdown);
process.on("SIGINT", shutdown);
async function shutdown() {
    console.log("Received kill signal, shutting down gracefully");
    // Close the HTTP server
    server.close(() => {
        console.log("HTTP server closed");
    });
    try {
        // Disconnect Redis
        const cacheService = new CacheService_1.CacheService();
        await cacheService.disconnect();
        console.log("Redis connection closed");
        process.exit(0);
    }
    catch (err) {
        console.error("Error during shutdown:", err);
        process.exit(1);
    }
}
