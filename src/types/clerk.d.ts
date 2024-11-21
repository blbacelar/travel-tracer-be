import { Request } from 'express';

declare module '@clerk/express' {
  interface AuthObject {
    userId: string;
    sessionId: string;
    session: {
      id: string;
      userId: string;
    };
    claims: Record<string, any>;
  }

  interface ClerkSession {
    id: string;
    userId: string;
    status: string;
    lastActiveAt: number;
    expireAt: number;
  }
}

declare global {
  namespace Express {
    interface Request {
      auth?: import('@clerk/express').AuthObject;
      session?: import('@clerk/express').ClerkSession;
    }
  }
}

export {}; 