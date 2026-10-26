import { pgTable, serial, varchar, timestamp, boolean, pgEnum, integer, numeric, text, primaryKey } from 'drizzle-orm/pg-core';

export const roleEnum = pgEnum('role', ['ADMIN', 'RETAIL_MANAGER']);
export const userStatusEnum = pgEnum('user_status', ['active', 'suspended', 'deleted']);
export const subscriptionStatusEnum = pgEnum('subscription_status', ['ACTIVE', 'EXPIRED', 'INCOMPLETE', 'PAST_DUE', 'CANCELED', 'TRIALING']);
export const planStatusEnum = pgEnum('plan_status', ['ACTIVE', 'INACTIVE']);
export const feedbackStatusEnum = pgEnum('feedback_status', ['pending', 'sent', 'replied']);

export const users = pgTable('users', {
  id: serial('user_id').primaryKey(),
  username: varchar('username', { length: 255 }).notNull(),
  email: varchar('email', { length: 255 }).notNull().unique(),
  passwordHash: varchar('password', { length: 255 }).notNull(),
  companyName: varchar('company_name', { length: 255 }),
  companyEmail: varchar('company_email', { length: 255 }),
  role: roleEnum('role').default('RETAIL_MANAGER').notNull(),
  status: userStatusEnum('status').default('active').notNull(),
  suspensionReason: text('suspension_reason'),
  hasUsedFreeTrial: boolean('has_used_free_trial').default(false).notNull(),
  stripeCustomerId: varchar('stripe_customer_id', { length: 255 }),
  createdAt: timestamp('created_at').defaultNow().notNull(),
  updatedAt: timestamp('updated_at').defaultNow().notNull(),
});

export const plans = pgTable('plans', {
  id: serial('id').primaryKey(),
  name: varchar('name', { length: 100 }).notNull(),
  price: numeric('price', { precision: 10, scale: 2 }).notNull(),
  maxStorageMb: integer('max_storage_mb').notNull(),
  durationDays: integer('duration_days').default(30).notNull(),
  stripeProductId: varchar('stripe_product_id', { length: 255 }),
  stripePriceId: varchar('stripe_price_id', { length: 255 }),
  status: planStatusEnum('status').default('ACTIVE').notNull(),
  createdAt: timestamp('created_at').defaultNow().notNull(),
  updatedAt: timestamp('updated_at').defaultNow().notNull(),
});

export const activeSubscriptions = pgTable('active_subscriptions', {
  id: serial('id').primaryKey(),
  userId: integer('user_id').references(() => users.id, { onDelete: 'cascade' }).notNull(),
  planId: integer('plan_id').references(() => plans.id).notNull(),
  startDate: timestamp('start_date').defaultNow().notNull(),
  endDate: timestamp('end_date').notNull(),
  stripeSubscriptionId: varchar('stripe_subscription_id', { length: 255 }),
  currentPeriodEnd: timestamp('current_period_end'),
  usedStorageMb: numeric('used_storage_mb', { precision: 10, scale: 2 }).default('0').notNull(),
  status: subscriptionStatusEnum('status').default('ACTIVE').notNull(),
  createdAt: timestamp('created_at').defaultNow().notNull(),
  updatedAt: timestamp('updated_at').defaultNow().notNull(),
});

export const datasetStatusEnum = pgEnum('dataset_status', ['PENDING', 'ANALYSIS_IN_PROGRESS', 'COMPLETED', 'FAILED']);

export const datasets = pgTable('datasets', {
  id: serial('id').primaryKey(),
  userId: integer('user_id').references(() => users.id, { onDelete: 'cascade' }).notNull(),
  filename: varchar('filename', { length: 255 }).notNull(),
  filePath: varchar('file_path', { length: 255 }).notNull(),
  fileSizeMb: numeric('file_size_mb', { precision: 10, scale: 2 }).notNull(),
  status: datasetStatusEnum('status').default('PENDING').notNull(),
  createdAt: timestamp('created_at').defaultNow().notNull(),
  updatedAt: timestamp('updated_at').defaultNow().notNull(),
});

export const reviews = pgTable('reviews', {
  id: serial('id').primaryKey(),
  datasetId: integer('dataset_id').references(() => datasets.id, { onDelete: 'cascade' }).notNull(),
  productName: varchar('product_name', { length: 255 }).notNull(),
  reviewText: varchar('review_text').notNull(),
  createdAt: timestamp('created_at').defaultNow().notNull(),
});

export const feedbackResults = pgTable('feedback_results', {
  id: serial('id').primaryKey(),
  reviewId: integer('review_id').references(() => reviews.id, { onDelete: 'cascade' }).notNull(),
  aspect: varchar('aspect', { length: 255 }).notNull(),
  opinion: varchar('opinion').notNull(),
  sentiment: varchar('sentiment', { length: 50 }).notNull(), // e.g., 'Positive', 'Negative', 'Neutral'
  createdAt: timestamp('created_at').defaultNow().notNull(),
});

export const verificationCodes = pgTable('verification_codes', {
  id: serial('id').primaryKey(),
  userId: integer('user_id').references(() => users.id, { onDelete: 'cascade' }).notNull(),
  codeHash: varchar('code_hash', { length: 255 }),
  resetTokenHash: varchar('reset_token_hash', { length: 255 }),
  expiresAt: timestamp('expires_at').notNull(),
  createdAt: timestamp('created_at').defaultNow().notNull(),
});

export const feedbacks = pgTable('feedbacks', {
  feedbackId: serial('feedback_id').primaryKey(),
  retailerId: integer('retailer_id').references(() => users.id, { onDelete: 'cascade' }).notNull(),
  subject: varchar('subject', { length: 255 }).notNull(),
  message: text('message').notNull(),
  status: feedbackStatusEnum('status').default('pending').notNull(),
  createdAt: timestamp('created_at').defaultNow().notNull(),
  repliedBy: integer('replied_by').references(() => users.id, { onDelete: 'set null' }),
  deletedAt: timestamp('deleted_at'),
});

export const faqs = pgTable('faqs', {
  faqId: serial('faq_id').primaryKey(),
  question: text('question').notNull(),
  answer: text('answer').notNull(),
  isVisible: boolean('is_visible').default(true).notNull(),
  sortOrder: integer('sort_order').default(0).notNull(),
  createdAt: timestamp('created_at').defaultNow().notNull(),
  updatedAt: timestamp('updated_at').defaultNow().notNull(),
});

export const planAnnouncements = pgTable('plan_announcements', {
  announcementId: serial('announcement_id').primaryKey(),
  planId: integer('plan_id').references(() => plans.id, { onDelete: 'set null' }),
  action: varchar('action', { length: 20 }).notNull(), // 'created' | 'edited' | 'activated' | 'deactivated' | 'deleted'
  title: varchar('title', { length: 255 }).notNull(),
  message: text('message').notNull(),
  targetUserIds: integer('target_user_ids').array(),
  createdAt: timestamp('created_at').defaultNow().notNull(),
});

export const userAnnouncementViews = pgTable('user_announcement_views', {
  userId: integer('user_id').references(() => users.id, { onDelete: 'cascade' }).notNull(),
  announcementId: integer('announcement_id').references(() => planAnnouncements.announcementId, { onDelete: 'cascade' }).notNull(),
  seenAt: timestamp('seen_at').defaultNow().notNull(),
}, (table) => [
  primaryKey({ columns: [table.userId, table.announcementId] })
]);

export const policies = pgTable('policies', {
  id: serial('id').primaryKey(),
  type: varchar('type', { length: 50 }).notNull().unique(), // 'terms' | 'privacy'
  title: varchar('title', { length: 255 }).notNull(),
  content: text('content').notNull(),
  version: varchar('version', { length: 50 }).default('1.0').notNull(),
  updatedBy: integer('updated_by').references(() => users.id, { onDelete: 'set null' }),
  createdAt: timestamp('created_at').defaultNow().notNull(),
  updatedAt: timestamp('updated_at').defaultNow().notNull(),
});

