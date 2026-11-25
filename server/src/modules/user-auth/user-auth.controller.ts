import { Request, Response } from 'express';
import bcrypt from 'bcrypt';
import jwt from 'jsonwebtoken';
import { sendVerificationEmail } from '../../services/emailService.js';
import { checkInactivePlanExpirations } from '../subscriptions/subscriptions.service.js';
import * as userAuthService from './user-auth.service.js';

const JWT_SECRET = process.env.JWT_SECRET || 'fallback_secret_for_dev';

export async function register(req: Request, res: Response) {
  try {
    const { username, email, password, companyName, companyEmail } = req.body;

    if (!username || !email || !password || !companyName || !companyEmail) {
      return res.status(400).json({ error: 'Username, email, password, company name, and company email are required' });
    }

    const existingUser = await userAuthService.findUserByEmail(email);
    if (existingUser) {
      return res.status(400).json({ error: 'Email already exists' });
    }

    const passwordHash = await bcrypt.hash(password, 10);
    const newUser = await userAuthService.createRetailManagerUser({
      username,
      email,
      passwordHash,
      companyName,
      companyEmail,
    });

    res.status(201).json({ message: 'User registered successfully', user: newUser });
  } catch (error) {
    console.error('Error in /register:', error);
    res.status(500).json({ error: 'Internal server error' });
  }
}

export async function login(req: Request, res: Response) {
  try {
    const { email, password } = req.body;

    if (!email || !password) {
      return res.status(400).json({ error: 'Email and password are required' });
    }

    const user = await userAuthService.findUserByEmail(email);
    if (!user) {
      return res.status(401).json({ error: 'Invalid email or password' });
    }

    const isMatch = await bcrypt.compare(password, user.passwordHash);
    if (!isMatch) {
      return res.status(401).json({ error: 'Invalid email or password' });
    }

    if (user.status !== 'active') {
      return res.status(403).json({ error: 'Account is suspended or deleted' });
    }

    // Only Retail Managers may log in via /login
    if (user.role === 'ADMIN') {
      return res.status(403).json({
        error: 'Administrators must sign in through the dedicated Admin Portal at /admin/login.',
        code: 'ADMIN_LOGIN_REQUIRED',
      });
    }

    await checkInactivePlanExpirations();

    const token = jwt.sign({ userId: user.id, role: user.role }, JWT_SECRET, { expiresIn: '7d' });

    res.json({
      message: 'Login successful',
      token,
      user: {
        id: user.id,
        username: user.username,
        email: user.email,
        role: user.role,
      },
    });
  } catch (error) {
    console.error('Error in /login:', error);
    res.status(500).json({ error: 'Internal server error' });
  }
}

export async function requestForgotPasswordCode(req: Request, res: Response) {
  try {
    const { email } = req.body;

    if (!email || typeof email !== 'string') {
      return res.status(400).json({ error: 'Valid email address is required' });
    }

    const user = await userAuthService.findUserByEmail(email.trim());

    // Return generic message to avoid user enumeration
    if (!user || user.status !== 'active' || user.role !== 'RETAIL_MANAGER') {
      return res.json({
        message: 'If an active account exists with this email, a verification code has been sent.',
        expiresIn: 900,
      });
    }

    const code = Math.floor(100000 + Math.random() * 900000).toString();
    const codeHash = await bcrypt.hash(code, 10);

    const expiresAt = new Date();
    expiresAt.setMinutes(expiresAt.getMinutes() + 15);

    await userAuthService.createVerificationCode(user.id, codeHash, expiresAt);
    await sendVerificationEmail(user.email, code, user.username);

    return res.json({
      message: 'If an active account exists with this email, a verification code has been sent.',
      expiresIn: 900,
    });
  } catch (error) {
    console.error('Error in forgot-password/request-code:', error);
    return res.status(500).json({ error: 'Internal server error' });
  }
}

export async function verifyForgotPasswordCode(req: Request, res: Response) {
  try {
    const { email, code } = req.body;

    if (!email || !code) {
      return res.status(400).json({ error: 'Email and verification code are required' });
    }

    const user = await userAuthService.findUserByEmail(String(email).trim());
    if (!user || user.status !== 'active' || user.role !== 'RETAIL_MANAGER') {
      return res.status(400).json({ error: 'Invalid or expired verification code' });
    }

    const validCodes = await userAuthService.findValidVerificationCodes(user.id);

    let matchedCode = null;
    for (const vc of validCodes) {
      if (vc.codeHash && (await bcrypt.compare(String(code).trim(), vc.codeHash))) {
        matchedCode = vc;
        break;
      }
    }

    if (!matchedCode) {
      return res.status(400).json({ error: 'Invalid or expired verification code' });
    }

    const resetToken = jwt.sign(
      { userId: user.id, email: user.email, action: 'forgot_password_reset' },
      JWT_SECRET,
      { expiresIn: '10m' }
    );
    const resetTokenHash = await bcrypt.hash(resetToken, 10);

    await userAuthService.storeResetTokenHash(matchedCode.id, resetTokenHash);

    return res.json({
      message: 'Verification code confirmed',
      resetToken,
      expiresIn: 600,
    });
  } catch (error) {
    console.error('Error in forgot-password/verify-code:', error);
    return res.status(500).json({ error: 'Internal server error' });
  }
}

export async function resetForgotPassword(req: Request, res: Response) {
  try {
    const { resetToken, newPassword, confirmPassword } = req.body;

    if (!resetToken || !newPassword || !confirmPassword) {
      return res.status(400).json({ error: 'Reset token, new password, and confirmation are required' });
    }

    if (newPassword !== confirmPassword) {
      return res.status(400).json({ error: 'Passwords do not match' });
    }

    if (newPassword.length < 8) {
      return res.status(400).json({ error: 'Password must be at least 8 characters long' });
    }

    let decoded: any;
    try {
      decoded = jwt.verify(resetToken, JWT_SECRET);
    } catch {
      return res.status(401).json({ error: 'Invalid or expired reset session. Please request a new code.' });
    }

    if (!decoded.userId || decoded.action !== 'forgot_password_reset') {
      return res.status(401).json({ error: 'Invalid token payload' });
    }

    const userId = decoded.userId;
    const validCodes = await userAuthService.findValidVerificationCodes(userId);

    let tokenValid = false;
    for (const vc of validCodes) {
      if (vc.resetTokenHash && (await bcrypt.compare(resetToken, vc.resetTokenHash))) {
        tokenValid = true;
        await userAuthService.deleteVerificationCode(vc.id);
        break;
      }
    }

    if (!tokenValid) {
      return res.status(401).json({ error: 'Reset session is invalid or has already been used' });
    }

    const passwordHash = await bcrypt.hash(newPassword, 10);
    await userAuthService.updateUserPassword(userId, passwordHash);

    return res.json({ message: 'Password has been reset successfully. You can now log in.' });
  } catch (error) {
    console.error('Error in forgot-password/reset:', error);
    return res.status(500).json({ error: 'Internal server error' });
  }
}
