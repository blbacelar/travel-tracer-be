"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.CacheService = void 0;
const redis_1 = require("redis");
class CacheService {
    constructor() {
        this.isConnected = false;
        this.client = (0, redis_1.createClient)({
            password: process.env.REDIS_PASSWORD,
            socket: {
                host: process.env.REDIS_HOST,
                port: parseInt(process.env.REDIS_PORT || '14158')
            }
        });
        this.client.on('error', (err) => console.error('Redis Client Error', err));
        this.client.on('connect', () => console.log('Redis Client Connected'));
        this.client.on('ready', () => {
            this.isConnected = true;
            console.log('Redis Client Ready');
        });
        this.client.on('end', () => {
            this.isConnected = false;
            console.log('Redis Client Connection Ended');
        });
        // Connect to Redis
        this.connect();
    }
    async connect() {
        if (!this.isConnected) {
            await this.client.connect();
        }
    }
    async get(key) {
        try {
            const value = await this.client.get(key);
            return value ? JSON.parse(value) : undefined;
        }
        catch (error) {
            console.error('Redis Get Error:', error);
            return undefined;
        }
    }
    async set(key, value, ttl) {
        try {
            const stringValue = JSON.stringify(value);
            if (ttl) {
                await this.client.setEx(key, ttl, stringValue);
            }
            else {
                await this.client.set(key, stringValue);
            }
            return true;
        }
        catch (error) {
            console.error('Redis Set Error:', error);
            return false;
        }
    }
    async del(key) {
        try {
            return await this.client.del(key);
        }
        catch (error) {
            console.error('Redis Del Error:', error);
            return 0;
        }
    }
    async flush() {
        try {
            await this.client.flushAll();
        }
        catch (error) {
            console.error('Redis Flush Error:', error);
        }
    }
    // Generate consistent cache keys
    static generateKey(...args) {
        return args.join(':');
    }
    async disconnect() {
        if (this.isConnected) {
            await this.client.quit();
        }
    }
}
exports.CacheService = CacheService;
