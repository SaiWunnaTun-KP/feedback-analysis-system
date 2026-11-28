import { Response } from 'express';
import bcrypt from 'bcrypt';
import jwt from 'jsonwebtoken';
import { AuthRequest } from '../../middlewares/authMiddleware.js';
import { sendVerificationEmail } from '../../services/emailService.js';
import * as profileService from './profile.service.js';

const JWT_SECRET = process.env.JWT_SECRET || 'fallback_secret_for_dev';

export async function getProfile(req: AuthRequest, res: Response) {
  try {
    const userId = req.user!.userId;
    const user = await profileService.findUserById(userId);

    if (!user) {
      return res.status(404).json({ error: 'User not found' });
    }

    res.json({
      id: user.id,
      username: user.username,
      email: user.email,
      companyName: user.companyName,
      companyEmail: user.companyEmail,
      role: user.role,
      createdAt: user.createdAt,
      updatedAt: user.updatedAt,
    });
  } catch (error) {
    console.error('Error in GET /profile:', error);
    res.status(500).json({ error: 'Internal server error' });
  }
}

export async function updateProfile(req: AuthRequest, res: Response) {
  try {
    const userId = req.user!.userId;
    const { username, companyName, email, companyEmail } = req.body;

    if (email || companyEmail) {
      return res.status(400).json({ error: 'Email cannot be changed' });
    }

    if (!username || username.length < 2 || username.length > 100) {
      return res.status(400).json({ error: 'Username must be between 2 and 100 characters' });
    }

    const updatedUser = await profileService.updateUserProfile(userId, username, companyName);

    res.json({
      id: updatedUser.id,
      username: updatedUser.username,
      email: updatedUser.email,
      companyName: updatedUser.companyName,
      companyEmail: updatedUser.companyEmail,
      role: updatedUser.role,
      updatedAt: updatedUser.updatedAt,
    });
  } catch (error) {
    console.error('Error in PUT /profile:', error);
    res.status(500).json({ error: 'Internal server error' });
  }
}

export async function requestPasswordResetCode(req: AuthRequest, res: Response) {
  try {
    const userId = req.user!.userId;
    const user = await profileService.findUserById(userId);
    if (!user) {
      return res.status(404).json({ error: 'User not found' });
    }

    const code = Math.floor(100000 + Math.random() * 900000).toString();
    const codeHash = await bcrypt.hash(code, 10);

    const expiresAt = new Date();
    expiresAt.setMinutes(expiresAt.getMinutes() + 15);

    await profileService.createVerificationCode(userId, codeHash, expiresAt);
    await sendVerificationEmail(user.email, code, user.username);

    res.json({ message: 'Verification code sent to your email', expiresIn: 900 });
  } catch (error) {
    console.error('Error in request-code:', error);
    res.status(500).json({ error: 'Internal server error' });
  }
}

export async function verifyPasswordResetCode(req: AuthRequest, res: Response) {
  try {
    const userId = req.user!.userId;
    const { code } = req.body;

    if (!code) {
      return res.status(400).json({ error: 'Code is required' });
    }

    const validCodes = await profileService.findValidVerificationCodes(userId);

    let matchedCode = null;
    for (const vc of validCodes) {
      if (vc.codeHash && (await bcrypt.compare(code, vc.codeHash))) {
        matchedCode = vc;
        break;
      }
    }

    if (!matchedCode) {
      return res.status(400).json({ error: 'Invalid or expired code' });
    }

    const resetToken = jwt.sign({ userId, action: 'reset_password' }, JWT_SECRET, { expiresIn: '10m' });
    const resetTokenHash = await bcrypt.hash(resetToken, 10);

    await profileService.storeResetTokenHash(matchedCode.id, resetTokenHash);

    res.json({ resetToken, expiresIn: 600 });
  } catch (error) {
    console.error('Error in verify-code:', error);
    res.status(500).json({ error: 'Internal server error' });
  }
}

export async function resetPassword(req: AuthRequest, res: Response) {
  try {
    const userId = req.user!.userId;
    const { resetToken, newPassword, confirmPassword } = req.body;

    if (newPassword !== confirmPassword) {
      return res.status(400).json({ error: 'Passwords do not match' });
    }
    if (newPassword.length < 8) {
      return res.status(400).json({ error: 'Password must be at least 8 characters' });
    }

    let decoded: any;
    try {
      decoded = jwt.verify(resetToken, JWT_SECRET);
    } catch {
      return res.status(401).json({ error: 'Invalid or expired reset token' });
    }

    if (decoded.userId !== userId || decoded.action !== 'reset_password') {
      return res.status(401).json({ error: 'Invalid token payload' });
    }

    const validCodes = await profileService.findValidVerificationCodes(userId);

    let tokenValid = false;
    for (const vc of validCodes) {
      if (vc.resetTokenHash && (await bcrypt.compare(resetToken, vc.resetTokenHash))) {
        tokenValid = true;
        await profileService.deleteVerificationCode(vc.id);
        break;
      }
    }

    if (!tokenValid) {
      return res.status(401).json({ error: 'Invalid reset token' });
    }

    const passwordHash = await bcrypt.hash(newPassword, 10);
    await profileService.updateUserPassword(userId, passwordHash);

    res.json({ message: 'Password updated successfully' });
  } catch (error) {
    console.error('Error in password reset:', error);
    res.status(500).json({ error: 'Internal server error' });
  }
}

export async function deleteAccount(req: AuthRequest, res: Response) {
  try {
    const userId = req.user!.userId;
    const { confirmation, password } = req.body;

    if (confirmation !== 'DELETE') {
      return res.status(400).json({ error: 'Confirmation text incorrect' });
    }

    const user = await profileService.findUserById(userId);
    if (!user) {
      return res.status(404).json({ error: 'User not found' });
    }

    const isMatch = await bcrypt.compare(password, user.passwordHash);
    if (!isMatch) {
      return res.status(401).json({ error: 'Wrong password' });
    }

    await profileService.deleteUserById(userId);
    res.json({ message: 'Account deleted successfully' });
  } catch (error) {
    console.error('Error in DELETE /profile:', error);
    res.status(500).json({ error: 'Internal server error. Cannot delete due to foreign key constraints if they exist.' });
  }
}
