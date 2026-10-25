import { Request, Response } from 'express';
import { db } from '../database/index.js';
import { users, feedbacks, datasets, activeSubscriptions, plans } from '../database/schema.js';
import { eq, ne, or, ilike, and, desc, count, isNull } from 'drizzle-orm';
import { AuthRequest } from '../middlewares/authMiddleware.js';
import { sendSuspensionEmail, sendReactivationEmail } from '../services/emailService.js';

export const getAllUsers = async (req: AuthRequest, res: Response) => {
  try {
    const { search, status, page = '1', limit = '20' } = req.query;
    const pageNum = parseInt(page as string);
    const limitNum = parseInt(limit as string);
    const offset = (pageNum - 1) * limitNum;

    let conditions = [];

    // Only include users with RETAIL_MANAGER role (exclude ADMINs)
    conditions.push(eq(users.role, 'RETAIL_MANAGER'));

    if (status && status !== 'all') {
      conditions.push(eq(users.status, status as any));
    } else {
      // By default, exclude soft-deleted users (only visible when filter = deleted)
      conditions.push(ne(users.status, 'deleted'));
    }

    if (search) {
      const searchTerm = `%${search}%`;
      conditions.push(
        or(
          ilike(users.username, searchTerm),
          ilike(users.email, searchTerm),
          ilike(users.companyName, searchTerm)
        )
      );
    }

    const whereClause = conditions.length > 0 ? and(...conditions) : undefined;

    const totalCountResult = await db.select({ count: count() }).from(users).where(whereClause);
    const totalCount = Number(totalCountResult[0]?.count || 0);

    const data = await db.select({
      id: users.id,
      username: users.username,
      email: users.email,
      companyName: users.companyName,
      role: users.role,
      status: users.status,
      createdAt: users.createdAt
    }).from(users).where(whereClause).orderBy(desc(users.createdAt)).limit(limitNum).offset(offset);

    res.json({
      data,
      pagination: {
        total: totalCount,
        page: pageNum,
        limit: limitNum,
        totalPages: Math.ceil(totalCount / limitNum) || 1
      }
    });
  } catch (error) {
    console.error('Error fetching users:', error);
    res.status(500).json({ error: 'Failed to fetch users' });
  }
};

export const getUserById = async (req: AuthRequest, res: Response) => {
  try {
    const { id } = req.params;
    const userId = parseInt(id);
    
    const userResult = await db.select({
      id: users.id,
      username: users.username,
      email: users.email,
      role: users.role,
      status: users.status,
      suspensionReason: users.suspensionReason,
      companyName: users.companyName,
      companyEmail: users.companyEmail,
      createdAt: users.createdAt
    }).from(users).where(eq(users.id, userId));

    if (userResult.length === 0) {
      return res.status(404).json({ error: 'User not found' });
    }

    const user = userResult[0];

    // Fetch subscription & plan info
    const subResult = await db
      .select({
        id: activeSubscriptions.id,
        status: activeSubscriptions.status,
        usedStorageMb: activeSubscriptions.usedStorageMb,
        startDate: activeSubscriptions.startDate,
        endDate: activeSubscriptions.endDate,
        currentPeriodEnd: activeSubscriptions.currentPeriodEnd,
        planId: activeSubscriptions.planId,
        planName: plans.name,
        maxStorageMb: plans.maxStorageMb,
        planStatus: plans.status,
      })
      .from(activeSubscriptions)
      .leftJoin(plans, eq(activeSubscriptions.planId, plans.id))
      .where(and(eq(activeSubscriptions.userId, userId), eq(activeSubscriptions.status, 'ACTIVE')));

    let subscriptionInfo = null;
    if (subResult.length > 0) {
      subscriptionInfo = subResult[0];
    }

    // Fetch user's uploaded datasets
    const userDatasets = await db
      .select({
        id: datasets.id,
        filename: datasets.filename,
        fileSizeMb: datasets.fileSizeMb,
        status: datasets.status,
        createdAt: datasets.createdAt,
      })
      .from(datasets)
      .where(eq(datasets.userId, userId))
      .orderBy(desc(datasets.createdAt));

    // Fetch user's feedbacks (non-deleted)
    const userFeedbacks = await db
      .select({
        feedbackId: feedbacks.feedbackId,
        subject: feedbacks.subject,
        message: feedbacks.message,
        status: feedbacks.status,
        createdAt: feedbacks.createdAt,
      })
      .from(feedbacks)
      .where(and(eq(feedbacks.retailerId, userId), isNull(feedbacks.deletedAt)))
      .orderBy(desc(feedbacks.createdAt));

    res.json({
      data: {
        ...user,
        subscription: subscriptionInfo,
        datasets: userDatasets,
        feedbacks: userFeedbacks,
      }
    });
  } catch (error) {
    console.error('Error fetching user:', error);
    res.status(500).json({ error: 'Failed to fetch user' });
  }
};

export const updateUser = async (req: AuthRequest, res: Response) => {
  return res.status(403).json({ error: 'Editing user name and email is not allowed' });
};

export const updateUserStatus = async (req: AuthRequest, res: Response) => {
  try {
    const { id } = req.params;
    const { status, reason } = req.body;

    if (!['active', 'suspended', 'deleted'].includes(status)) {
      return res.status(400).json({ error: 'Invalid status. Allowed: active, suspended, deleted' });
    }

    if (parseInt(id) === req.user?.userId) {
      return res.status(400).json({ error: 'You cannot change your own status' });
    }

    const updatePayload: any = { status };
    if (status === 'suspended') {
      updatePayload.suspensionReason = reason?.trim() || 'Account suspended by administrator';
    } else if (status === 'active') {
      updatePayload.suspensionReason = null;
    }

    const result = await db.update(users)
      .set(updatePayload)
      .where(eq(users.id, parseInt(id)))
      .returning({
        id: users.id,
        username: users.username,
        email: users.email,
        role: users.role,
        status: users.status,
        suspensionReason: users.suspensionReason,
        createdAt: users.createdAt
      });

    if (result.length === 0) {
      return res.status(404).json({ error: 'User not found' });
    }

    const updatedUser = result[0];

    // Send email notice to the user based on status update
    if (status === 'suspended') {
      await sendSuspensionEmail(
        updatedUser.email,
        updatedUser.username,
        updatePayload.suspensionReason
      );
    } else if (status === 'active') {
      await sendReactivationEmail(
        updatedUser.email,
        updatedUser.username
      );
    }

    res.json({ message: `User status updated to ${status}`, data: updatedUser });
  } catch (error) {
    console.error('Error updating user status:', error);
    res.status(500).json({ error: 'Failed to update user status' });
  }
};

export const getUserFeedbacks = async (req: AuthRequest, res: Response) => {
  try {
    const { id } = req.params;
    const { page = '1', limit = '20' } = req.query;
    const pageNum = parseInt(page as string);
    const limitNum = parseInt(limit as string);
    const offset = (pageNum - 1) * limitNum;

    const userCheck = await db.select({ id: users.id }).from(users).where(eq(users.id, parseInt(id)));
    if (userCheck.length === 0) {
      return res.status(404).json({ error: 'User not found' });
    }

    const totalCountResult = await db
      .select({ count: count() })
      .from(feedbacks)
      .where(and(eq(feedbacks.retailerId, parseInt(id)), isNull(feedbacks.deletedAt)));
    const totalCount = totalCountResult[0].count;

    const data = await db.select({
      feedbackId: feedbacks.feedbackId,
      subject: feedbacks.subject,
      message: feedbacks.message,
      status: feedbacks.status,
      createdAt: feedbacks.createdAt,
      repliedBy: feedbacks.repliedBy
    })
    .from(feedbacks)
    .where(and(eq(feedbacks.retailerId, parseInt(id)), isNull(feedbacks.deletedAt)))
    .orderBy(desc(feedbacks.createdAt))
    .limit(limitNum)
    .offset(offset);

    res.json({
      data,
      pagination: {
        total: totalCount,
        page: pageNum,
        limit: limitNum
      }
    });
  } catch (error) {
    console.error('Error fetching user feedbacks:', error);
    res.status(500).json({ error: 'Failed to fetch user feedbacks' });
  }
};
