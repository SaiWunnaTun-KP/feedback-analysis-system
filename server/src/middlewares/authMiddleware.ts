import { Request, Response, NextFunction } from 'express';
import jwt from 'jsonwebtoken';

import { db } from '../database/index.js';
import { users } from '../database/schema.js';
import { eq } from 'drizzle-orm';

const JWT_SECRET = process.env.JWT_SECRET || 'fallback_secret_for_dev';

export interface AuthRequest extends Request {
  user?: {
    userId: number;
    role: string;
    status?: string;
    createdAt?: Date;
  };
}

export const authenticate = async (req: AuthRequest, res: Response, next: NextFunction) => {
  const authHeader = req.headers.authorization;

  if (!authHeader || !authHeader.startsWith('Bearer ')) {
    return res.status(401).json({ error: 'Unauthorized: No token provided' });
  }

  const token = authHeader.split(' ')[1];

  try {
    const decoded = jwt.verify(token, JWT_SECRET) as { userId: number, role: string };

    const [userRecord] = await db
      .select({ id: users.id, role: users.role, status: users.status, createdAt: users.createdAt })
      .from(users)
      .where(eq(users.id, decoded.userId));

    if (!userRecord) {
      return res.status(401).json({ error: 'User account not found', code: 'ACCOUNT_NOT_FOUND' });
    }

    if (userRecord.status === 'suspended') {
      return res.status(403).json({ 
        error: 'Your account has been suspended. Please contact support.', 
        code: 'ACCOUNT_SUSPENDED' 
      });
    }

    if (userRecord.status === 'deleted') {
      return res.status(403).json({ 
        error: 'Your account has been deactivated.', 
        code: 'ACCOUNT_DELETED' 
      });
    }

    req.user = {
      userId: userRecord.id,
      role: userRecord.role,
      status: userRecord.status,
      createdAt: userRecord.createdAt,
    };
    next();
  } catch (error) {
    return res.status(401).json({ error: 'Unauthorized: Invalid token' });
  }
};

export const optionalAuthenticate = async (req: AuthRequest, res: Response, next: NextFunction) => {
  const authHeader = req.headers.authorization;

  if (!authHeader || !authHeader.startsWith('Bearer ')) {
    return next();
  }

  const token = authHeader.split(' ')[1];

  try {
    const decoded = jwt.verify(token, JWT_SECRET) as { userId: number, role: string };

    const [userRecord] = await db
      .select({ id: users.id, role: users.role, status: users.status, createdAt: users.createdAt })
      .from(users)
      .where(eq(users.id, decoded.userId));

    if (userRecord && userRecord.status !== 'suspended' && userRecord.status !== 'deleted') {
      req.user = {
        userId: userRecord.id,
        role: userRecord.role,
        status: userRecord.status,
        createdAt: userRecord.createdAt,
      };
    }
  } catch (error) {
    // For optional auth, continue as unauthenticated if token is invalid or expired
  }
  next();
};

export const requireAdmin = (req: AuthRequest, res: Response, next: NextFunction) => {
  if (req.user?.role !== 'ADMIN') {
    return res.status(403).json({ error: 'Forbidden: Admin access required' });
  }
  next();
};
