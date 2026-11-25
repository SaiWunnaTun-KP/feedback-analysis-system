import { Response } from 'express';
import { AuthRequest } from '../../middlewares/authMiddleware.js';
import { sendSuspensionEmail, sendReactivationEmail } from '../../services/emailService.js';
import * as adminUsersService from './admin-users.service.js';

export async function getAllUsers(req: AuthRequest, res: Response) {
  try {
    const { search, status, page = '1', limit = '20' } = req.query;
    const pageNum = parseInt(page as string);
    const limitNum = parseInt(limit as string);
    const offset = (pageNum - 1) * limitNum;

    const { data, totalCount } = await adminUsersService.listUsers({
      search: search as string | undefined,
      status: status as string | undefined,
      limit: limitNum,
      offset,
    });

    res.json({
      data,
      pagination: {
        total: totalCount,
        page: pageNum,
        limit: limitNum,
        totalPages: Math.ceil(totalCount / limitNum) || 1,
      },
    });
  } catch (error) {
    console.error('Error fetching users:', error);
    res.status(500).json({ error: 'Failed to fetch users' });
  }
}

export async function getUserById(req: AuthRequest, res: Response) {
  try {
    const userId = parseInt(String(req.params.id));
    const userDetail = await adminUsersService.getUserDetailById(userId);

    if (!userDetail) {
      return res.status(404).json({ error: 'User not found' });
    }

    res.json({ data: userDetail });
  } catch (error) {
    console.error('Error fetching user:', error);
    res.status(500).json({ error: 'Failed to fetch user' });
  }
}

export async function updateUser(_req: AuthRequest, res: Response) {
  return res.status(403).json({ error: 'Editing user name and email is not allowed' });
}

export async function updateUserStatus(req: AuthRequest, res: Response) {
  try {
    const userId = parseInt(String(req.params.id));
    const { status, reason } = req.body;

    if (!['active', 'suspended', 'deleted'].includes(status)) {
      return res.status(400).json({ error: 'Invalid status. Allowed: active, suspended, deleted' });
    }

    if (userId === req.user?.userId) {
      return res.status(400).json({ error: 'You cannot change your own status' });
    }

    const suspensionReason =
      status === 'suspended' ? reason?.trim() || 'Account suspended by administrator' : undefined;

    const updatedUser = await adminUsersService.updateUserStatusById(userId, status, suspensionReason);

    if (!updatedUser) {
      return res.status(404).json({ error: 'User not found' });
    }

    if (status === 'suspended') {
      await sendSuspensionEmail(
        updatedUser.email,
        updatedUser.username,
        suspensionReason!
      );
    } else if (status === 'active') {
      await sendReactivationEmail(updatedUser.email, updatedUser.username);
    }

    res.json({ message: `User status updated to ${status}`, data: updatedUser });
  } catch (error) {
    console.error('Error updating user status:', error);
    res.status(500).json({ error: 'Failed to update user status' });
  }
}

export async function getUserFeedbacks(req: AuthRequest, res: Response) {
  try {
    const userId = parseInt(String(req.params.id));
    const { page = '1', limit = '20' } = req.query;
    const pageNum = parseInt(page as string);
    const limitNum = parseInt(limit as string);
    const offset = (pageNum - 1) * limitNum;

    const exists = await adminUsersService.userExists(userId);
    if (!exists) {
      return res.status(404).json({ error: 'User not found' });
    }

    const { data, totalCount } = await adminUsersService.listUserFeedbacks(userId, limitNum, offset);

    res.json({
      data,
      pagination: {
        total: totalCount,
        page: pageNum,
        limit: limitNum,
      },
    });
  } catch (error) {
    console.error('Error fetching user feedbacks:', error);
    res.status(500).json({ error: 'Failed to fetch user feedbacks' });
  }
}
