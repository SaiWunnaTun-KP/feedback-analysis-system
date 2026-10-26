import express from 'express';
import cors from 'cors';
import dotenv from 'dotenv';
import authRoutes from './routes/auth.js';
import adminAuthRoutes from './routes/adminAuth.js';
import plansRoutes from './routes/plans.js';
import subscriptionRoutes from './routes/subscriptions.js';
import datasetsRouter from './routes/datasets.js';
import reportsRouter from './routes/reports.js';
import profileRoutes from './routes/profile.js';
import webhooksRoutes from './routes/webhooks.js';
import feedbacksRoutes from './routes/feedbacks.js';
import adminUsersRoutes from './routes/adminUsers.js';
import faqsRoutes from './routes/faqs.js';
import adminFaqsRoutes from './routes/adminFaqs.js';
import announcementsRoutes from './routes/announcements.js';
import policiesRoutes from './routes/policies.js';

dotenv.config();

const app = express();
const PORT = process.env.PORT || 8000;

app.use(cors({
  origin: process.env.FRONTEND_URL || 'http://localhost:5173',
  credentials: true,
}));

// Mount webhooks before express.json() to preserve raw body
app.use('/api/webhooks', webhooksRoutes);

app.use(express.json());

// Request logging middleware
app.use((req, res, next) => {
  console.log(`${req.method} ${req.url}`);
  next();
});

// Routes
app.use('/api/auth', authRoutes);
app.use('/api/admin/auth', adminAuthRoutes);
app.use('/api/auth/admin', adminAuthRoutes);
app.use('/api/plans', plansRoutes);
app.use('/api/admin/plans', plansRoutes);
app.use('/api/announcements', announcementsRoutes);
app.use('/api/subscriptions', subscriptionRoutes);
app.use('/api/datasets', datasetsRouter);
app.use('/api/reports', reportsRouter);
app.use('/api/profile', profileRoutes);
app.use('/api/feedbacks', feedbacksRoutes);
app.use('/api/admin/users', adminUsersRoutes);
app.use('/api/faqs', faqsRoutes);
app.use('/api/admin/faqs', adminFaqsRoutes);
app.use('/api/policies', policiesRoutes);
app.use('/api/admin/policies', policiesRoutes);

// Health check
app.get('/health', (req, res) => {
  res.json({ status: 'ok', message: 'Server is running' });
});

app.listen(PORT, () => {
  console.log(`Server is running on port ${PORT}`);
});
