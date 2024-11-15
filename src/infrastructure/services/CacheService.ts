import { createClient, RedisClientType } from 'redis';

export class CacheService {
  private client: RedisClientType;
  private isConnected: boolean = false;

  constructor() {
    this.client = createClient({
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

  private async connect() {
    if (!this.isConnected) {
      await this.client.connect();
    }
  }

  async get<T>(key: string): Promise<T | undefined> {
    try {
      const value = await this.client.get(key);
      return value ? JSON.parse(value) : undefined;
    } catch (error) {
      console.error('Redis Get Error:', error);
      return undefined;
    }
  }

  async set<T>(key: string, value: T, ttl?: number): Promise<boolean> {
    try {
      const stringValue = JSON.stringify(value);
      if (ttl) {
        await this.client.setEx(key, ttl, stringValue);
      } else {
        await this.client.set(key, stringValue);
      }
      return true;
    } catch (error) {
      console.error('Redis Set Error:', error);
      return false;
    }
  }

  async del(key: string): Promise<number> {
    try {
      return await this.client.del(key);
    } catch (error) {
      console.error('Redis Del Error:', error);
      return 0;
    }
  }

  async flush(): Promise<void> {
    try {
      await this.client.flushAll();
    } catch (error) {
      console.error('Redis Flush Error:', error);
    }
  }

  // Generate consistent cache keys
  static generateKey(...args: (string | number)[]): string {
    return args.join(':');
  }

  async disconnect(): Promise<void> {
    if (this.isConnected) {
      await this.client.quit();
    }
  }
} 