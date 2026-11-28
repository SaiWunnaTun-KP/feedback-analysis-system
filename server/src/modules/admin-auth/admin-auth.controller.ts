import { Request, Response } from 'express';
import bcrypt from 'bcrypt';
import jwt from 'jsonwebtoken';
import * as adminAuthService from './admin-auth.service.js';

const JWT_SECRET = process.env.JWT_SECRET || 'fallback_secret_for_dev';

// Admin Lockout & Rate Limiting Configuration
const MAX_FAILED_ATTEMPTS = 5;
const LOCKOUT_DURATION_MS = 15 * 60 * 1000;

interface AttemptRecord {
  failedAttempts: number;
  lockedUntil: number | null;
  lastAttemptAt: number;
}

const adminLoginAttempts = new Map<string, AttemptRecord>();

// Clean up stale attempt records older than 1 hour every 10 minutes
setInterval(() => {
  const now = Date.now();
  for (const [key, record] of adminLoginAttempts.entries()) {
    if (record.lockedUntil && record.lockedUntil > now) continue;
    if (now - record.lastAttemptAt > 60 * 60 * 1000) {
      adminLoginAttempts.delete(key);
    }
  }
}, 10 * 60 * 1000).unref();

function getTrackingKey(req: Request, email: string): string {
  const clientIp = req.headers['x-forwarded-for'] || req.socket?.remoteAddress || 'unknown-ip';
  return `${clientIp}::${email.toLowerCase().trim()}`;
}

export async function loginAdmin(req: Request, res: Response) {
  try {
    const { email, password } = req.body;

    if (!email || !password) {
      return res.status(400).json({ error: 'Email and password are required' });
    }

    const normalizedEmail = email.toLowerCase().trim();
    const trackingKey = getTrackingKey(req, normalizedEmail);
    const now = Date.now();

    const record = adminLoginAttempts.get(trackingKey);
    if (record?.lockedUntil && record.lockedUntil > now) {
      const remainingSeconds = Math.ceil((record.lockedUntil - now) / 1000);
      const remainingMinutes = Math.ceil(remainingSeconds / 60);
      return res.status(429).json({
        error: `Account temporarily locked due to multiple consecutive failed login attempts. Please try again in ${remainingMinutes} minute${remainingMinutes > 1 ? 's' : ''}.`,
        code: 'ACCOUNT_LOCKED',
        remainingSeconds,
        remainingMinutes,
      });
    }

    const user = await adminAuthService.findAdminByEmail(normalizedEmail);
    if (!user) {
      const attempts = (record?.failedAttempts || 0) + 1;
      const isNowLocked = attempts >= MAX_FAILED_ATTEMPTS;
      adminLoginAttempts.set(trackingKey, {
        failedAttempts: attempts,
        lockedUntil: isNowLocked ? now + LOCKOUT_DURATION_MS : null,
        lastAttemptAt: now,
      });

      return res.status(401).json({
        error: 'Invalid administrator email or password',
        remainingAttempts: Math.max(0, MAX_FAILED_ATTEMPTS - attempts),
      });
    }

    const isMatch = await bcrypt.compare(password, user.passwordHash);
    if (!isMatch) {
      const attempts = (record?.failedAttempts || 0) + 1;
      const isNowLocked = attempts >= MAX_FAILED_ATTEMPTS;
      adminLoginAttempts.set(trackingKey, {
        failedAttempts: attempts,
        lockedUntil: isNowLocked ? now + LOCKOUT_DURATION_MS : null,
        lastAttemptAt: now,
      });

      if (isNowLocked) {
        return res.status(429).json({
          error: 'Too many failed attempts. Admin account temporarily locked for 15 minutes.',
          code: 'ACCOUNT_LOCKED',
          remainingSeconds: Math.ceil(LOCKOUT_DURATION_MS / 1000),
        });
      }

      return res.status(401).json({
        error: 'Invalid administrator email or password',
        remainingAttempts: Math.max(0, MAX_FAILED_ATTEMPTS - attempts),
      });
    }

    if (user.role !== 'ADMIN') {
      return res.status(403).json({
        error: 'Access denied. This portal is strictly restricted to System Administrators.',
        code: 'FORBIDDEN_PORTAL',
      });
    }

    if (user.status !== 'active') {
      return res.status(403).json({
        error: 'Admin account is suspended or deactivated. Contact system governance.',
        code: 'ACCOUNT_INACTIVE',
      });
    }

    adminLoginAttempts.delete(trackingKey);

    const token = jwt.sign(
      { userId: user.id, role: user.role, portal: 'admin' },
      JWT_SECRET,
      { expiresIn: '12h' }
    );

    res.json({
      message: 'Admin authentication successful',
      token,
      user: {
        id: user.id,
        username: user.username,
        email: user.email,
        role: user.role,
      },
    });
  } catch (error) {
    console.error('Error in /api/admin/auth/login:', error);
    res.status(500).json({ error: 'Internal server error' });
  }
}

export function getLockoutStatus(req: Request, res: Response) {
  try {
    const email = (req.query.email as string) || '';
    const normalizedEmail = email.toLowerCase().trim();
    const trackingKey = getTrackingKey(req, normalizedEmail);
    const record = adminLoginAttempts.get(trackingKey);
    const now = Date.now();

    if (record?.lockedUntil && record.lockedUntil > now) {
      const remainingSeconds = Math.ceil((record.lockedUntil - now) / 1000);
      return res.json({
        isLocked: true,
        remainingSeconds,
        remainingMinutes: Math.ceil(remainingSeconds / 60),
      });
    }

    return res.json({
      isLocked: false,
      remainingAttempts: record ? Math.max(0, MAX_FAILED_ATTEMPTS - record.failedAttempts) : MAX_FAILED_ATTEMPTS,
    });
  } catch (error) {
    console.error('Error in /lockout-status:', error);
    res.status(500).json({ error: 'Internal server error' });
  }
}
