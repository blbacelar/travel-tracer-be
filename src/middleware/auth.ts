import { clerkMiddleware, requireAuth } from '@clerk/express';
import { Request } from 'express';
import { AuthObject } from '@clerk/express';

export const validateSession = requireAuth();
export const clerkAuth = clerkMiddleware();

export function isAuthenticated(req: Request & { auth?: AuthObject }): boolean {
  return typeof req.auth?.userId === 'string';
} 