import { Router } from 'express';
import bcrypt from 'bcrypt';
import jwt from 'jsonwebtoken';
import { db } from '../database/index.js';
import { users, verificationCodes } from '../database/schema.js';
import { eq, and, gt } from 'drizzle-orm';
import { checkInactivePlanExpirations } from './subscriptions.js';
import { sendVerificationEmail } from '../services/emailService.js';

const router = Router();

const JWT_SECRET = process.env.JWT_SECRET || 'fallback_secret_for_dev';

router.post('/register', async (req, res) => {
  try {
    const { username, email, password, companyName, companyEmail } = req.body;

    if (!username || !email || !password || !companyName || !companyEmail) {
      return res.status(400).json({ error: 'Username, email, password, company name, and company email are required' });
    }

    // Check if user already exists
    const existingUsers = await db.select().from(users).where(eq(users.email, email.toLowerCase()));
    
    if (existingUsers.length > 0) {
      return res.status(400).json({ error: 'Email already exists' }); // Generic error preferable for prod, but clear for now
    }

    const passwordHash = await bcrypt.hash(password, 10);

    const newUser = await db.insert(users).values({
      username,
      email: email.toLowerCase(),
      passwordHash,
      companyName,
      companyEmail,
      role: 'RETAIL_MANAGER', // Default role for registration
    }).returning({
      id: users.id,
      username: users.username,
      email: users.email,
      role: users.role,
    });

    res.status(201).json({ message: 'User registered successfully', user: newUser[0] });
  } catch (error) {
    console.error('Error in /register:', error);
    res.status(500).json({ error: 'Internal server error' });
  }
});

router.post('/login', async (req, res) => {
  try {
    const { email, password } = req.body;

    if (!email || !password) {
      return res.status(400).json({ error: 'Email and password are required' });
    }

    const matchedUsers = await db.select().from(users).where(eq(users.email, email.toLowerCase()));
    
    if (matchedUsers.length === 0) {
      return res.status(401).json({ error: 'Invalid email or password' }); // Generic error per PRD
    }

    const user = matchedUsers[0];
    const isMatch = await bcrypt.compare(password, user.passwordHash);

    if (!isMatch) {
      return res.status(401).json({ error: 'Invalid email or password' });
    }

    if (user.status !== 'active') {
      return res.status(403).json({ error: 'Account is suspended or deleted' });
    }

    // Role check: Only Retail Managers may log in via /login
    if (user.role === 'ADMIN') {
      return res.status(403).json({
        error: 'Administrators must sign in through the dedicated Admin Portal at /admin/login.',
        code: 'ADMIN_LOGIN_REQUIRED',
      });
    }

    // Check and expire any inactive plan subscriptions past period end
    await checkInactivePlanExpirations();

    // Create JWT
    const token = jwt.sign({ userId: user.id, role: user.role }, JWT_SECRET, { expiresIn: '7d' });

    res.json({
      message: 'Login successful',
      token, // Return token. Usually it's better in HttpOnly cookie, but we can do both or just return it.
      user: {
        id: user.id,
        username: user.username,
        email: user.email,
        role: user.role,
      }
    });

  } catch (error) {
    console.error('Error in /login:', error);
    res.status(500).json({ error: 'Internal server error' });
  }
});

// POST /api/auth/forgot-password/request-code
router.post('/forgot-password/request-code', async (req, res) => {
  try {
    const { email } = req.body;

    if (!email || typeof email !== 'string') {
      return res.status(400).json({ error: 'Valid email address is required' });
    }

    const normalizedEmail = email.trim().toLowerCase();
    const matchedUsers = await db.select().from(users).where(eq(users.email, normalizedEmail));

    // Return generic message if user not found, inactive, or not a retail manager (to avoid user enumeration)
    if (matchedUsers.length === 0 || matchedUsers[0].status !== 'active' || matchedUsers[0].role !== 'RETAIL_MANAGER') {
      return res.json({
        message: 'If an active account exists with this email, a verification code has been sent.',
        expiresIn: 900
      });
    }

    const user = matchedUsers[0];
    const code = Math.floor(100000 + Math.random() * 900000).toString(); // 6 digits
    const codeHash = await bcrypt.hash(code, 10);

    const expiresAt = new Date();
    expiresAt.setMinutes(expiresAt.getMinutes() + 15); // 15 mins

    await db.insert(verificationCodes).values({
      userId: user.id,
      codeHash,
      expiresAt,
    });

    await sendVerificationEmail(user.email, code, user.username);

    return res.json({
      message: 'If an active account exists with this email, a verification code has been sent.',
      expiresIn: 900
    });
  } catch (error) {
    console.error('Error in forgot-password/request-code:', error);
    return res.status(500).json({ error: 'Internal server error' });
  }
});

// POST /api/auth/forgot-password/verify-code
router.post('/forgot-password/verify-code', async (req, res) => {
  try {
    const { email, code } = req.body;

    if (!email || !code) {
      return res.status(400).json({ error: 'Email and verification code are required' });
    }

    const normalizedEmail = email.trim().toLowerCase();
    const matchedUsers = await db.select().from(users).where(eq(users.email, normalizedEmail));

    if (matchedUsers.length === 0 || matchedUsers[0].status !== 'active' || matchedUsers[0].role !== 'RETAIL_MANAGER') {
      return res.status(400).json({ error: 'Invalid or expired verification code' });
    }

    const user = matchedUsers[0];

    const validCodes = await db.select()
      .from(verificationCodes)
      .where(and(
        eq(verificationCodes.userId, user.id),
        gt(verificationCodes.expiresAt, new Date())
      ))
      .orderBy(verificationCodes.createdAt);

    let matchedCode = null;
    for (const vc of validCodes) {
      if (vc.codeHash && await bcrypt.compare(String(code).trim(), vc.codeHash)) {
        matchedCode = vc;
        break;
      }
    }

    if (!matchedCode) {
      return res.status(400).json({ error: 'Invalid or expired verification code' });
    }

    // Generate reset token specifically for forgot password
    const resetToken = jwt.sign(
      { userId: user.id, email: user.email, action: 'forgot_password_reset' },
      JWT_SECRET,
      { expiresIn: '10m' }
    );
    const resetTokenHash = await bcrypt.hash(resetToken, 10);

    // Invalidate the code so it cannot be reused, and store the reset token hash
    await db.update(verificationCodes)
      .set({
        codeHash: null,
        resetTokenHash
      })
      .where(eq(verificationCodes.id, matchedCode.id));

    return res.json({
      message: 'Verification code confirmed',
      resetToken,
      expiresIn: 600
    });
  } catch (error) {
    console.error('Error in forgot-password/verify-code:', error);
    return res.status(500).json({ error: 'Internal server error' });
  }
});

// POST /api/auth/forgot-password/reset
router.post('/forgot-password/reset', async (req, res) => {
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
    } catch (e) {
      return res.status(401).json({ error: 'Invalid or expired reset session. Please request a new code.' });
    }

    if (!decoded.userId || decoded.action !== 'forgot_password_reset') {
      return res.status(401).json({ error: 'Invalid token payload' });
    }

    const userId = decoded.userId;

    const validCodes = await db.select()
      .from(verificationCodes)
      .where(and(
        eq(verificationCodes.userId, userId),
        gt(verificationCodes.expiresAt, new Date())
      ));

    let tokenValid = false;
    for (const vc of validCodes) {
      if (vc.resetTokenHash && await bcrypt.compare(resetToken, vc.resetTokenHash)) {
        tokenValid = true;
        // Invalidate and delete verification record so it cannot be reused
        await db.delete(verificationCodes).where(eq(verificationCodes.id, vc.id));
        break;
      }
    }

    if (!tokenValid) {
      return res.status(401).json({ error: 'Reset session is invalid or has already been used' });
    }

    const passwordHash = await bcrypt.hash(newPassword, 10);
    await db.update(users).set({ passwordHash, updatedAt: new Date() }).where(eq(users.id, userId));

    return res.json({ message: 'Password has been reset successfully. You can now log in.' });
  } catch (error) {
    console.error('Error in forgot-password/reset:', error);
    return res.status(500).json({ error: 'Internal server error' });
  }
});

export default router;
