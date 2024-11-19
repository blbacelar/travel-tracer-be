import { createClient } from 'redis';

let client: ReturnType<typeof createClient> | null = null;

// Only initialize Redis if credentials are available
if (process.env.REDIS_HOST && process.env.REDIS_PASSWORD) {
  client = createClient({
    password: process.env.REDIS_PASSWORD,
    socket: {
      host: process.env.REDIS_HOST,
      port: parseInt(process.env.REDIS_PORT || '14158')
    }
  });

  client.on('error', err => {
    console.error('Redis Error:', err);
    client = null; // Disable Redis on connection error
  });

  // Connect only if client is initialized
  client.connect().catch(err => {
    console.error('Redis Connection Error:', err);
    client = null; // Disable Redis on connection error
  });
}

export async function getCache<T>(key: string): Promise<T | null> {
  if (!client) return null;
  
  try {
    const value = await client.get(key);
    return value ? JSON.parse(value) : null;
  } catch (error) {
    console.error('Cache get error:', error);
    return null;
  }
}

export async function setCache<T>(key: string, value: T, ttl?: number): Promise<void> {
  if (!client) return;
  
  try {
    const stringValue = JSON.stringify(value);
    if (ttl) {
      await client.setEx(key, ttl, stringValue);
    } else {
      await client.set(key, stringValue);
    }
  } catch (error) {
    console.error('Cache set error:', error);
  }
} 