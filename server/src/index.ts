import express from 'express';
import cors from 'cors';
import dotenv from 'dotenv';
import userAuthRoutes from './modules/user-auth/user-auth.routes.js';
import adminAuthRoutes from './modules/admin-auth/admin-auth.routes.js';
import plansRoutes from './modules/plans/plans.routes.js';
import subscriptionRoutes from './modules/subscriptions/subscriptions.routes.js';
import datasetsRoutes from './modules/datasets/datasets.routes.js';
import reportsRoutes from './modules/reports/reports.routes.js';
import profileRoutes from './modules/profile/profile.routes.js';
import webhooksRoutes from './modules/webhooks/webhooks.routes.js';
import feedbacksRoutes from './modules/feedbacks/feedbacks.routes.js';
import adminUsersRoutes from './modules/admin-users/admin-users.routes.js';
import { publicFaqsRouter, adminFaqsRouter } from './modules/faqs/faqs.routes.js';
import announcementsRoutes from './modules/announcements/announcements.routes.js';
import policiesRoutes from './modules/policies/policies.routes.js';
import adminOverviewRoutes from './modules/admin-overview/admin-overview.routes.js';

dotenv.config();

const app = express();
const PORT = process.env.PORT || 8000;

app.use(
  cors({
    origin: process.env.FRONTEND_URL || 'http://localhost:5173',
    credentials: true,
  })
);

// Mount webhooks before express.json() to preserve raw body
app.use('/api/webhooks', webhooksRoutes);

app.use(express.json());

// Request logging middleware
app.use((req, _res, next) => {
  console.log(`${req.method} ${req.url}`);
  next();
});

// Routes
app.use('/api/auth', userAuthRoutes);
app.use('/api/admin/auth', adminAuthRoutes);
app.use('/api/auth/admin', adminAuthRoutes);
app.use('/api/plans', plansRoutes);
app.use('/api/admin/plans', plansRoutes);
app.use('/api/announcements', announcementsRoutes);
app.use('/api/subscriptions', subscriptionRoutes);
app.use('/api/datasets', datasetsRoutes);
app.use('/api/reports', reportsRoutes);
app.use('/api/profile', profileRoutes);
app.use('/api/feedbacks', feedbacksRoutes);
app.use('/api/admin/users', adminUsersRoutes);
app.use('/api/faqs', publicFaqsRouter);
app.use('/api/admin/faqs', adminFaqsRouter);
app.use('/api/policies', policiesRoutes);
app.use('/api/admin/policies', policiesRoutes);
app.use('/api/admin/overview', adminOverviewRoutes);

// Health check
app.get('/health', (_req, res) => {
  res.json({ status: 'ok', message: 'Server is running' });
});

app.listen(PORT, () => {
  console.log(`Server is running on port ${PORT}`);
});
