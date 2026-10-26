import { Router } from 'express';
import { db } from '../database/index.js';
import { policies } from '../database/schema.js';
import { eq } from 'drizzle-orm';
import { authenticate, requireAdmin } from '../middlewares/authMiddleware.js';

const router = Router();

const DEFAULT_TERMS = `# Terms of Service

**Effective Date:** October 26, 2026  
**Last Updated:** October 26, 2026  

Welcome to **InsightRetail**. These Terms of Service ("Terms") govern your access to and use of our aspect-based sentiment analysis platform, website, and related services ("Services"). By registering an account or uploading feedback datasets, you ("Retail Manager", "Customer", or "User") agree to be bound by these Terms.

---

### 1. Account Registration & Eligibility
- You must be at least 18 years old and have the authority to bind your organization to these Terms.
- You are responsible for maintaining the confidentiality of your credentials and for all activities that occur under your account.
- You must provide accurate, current, and complete corporate registration details.

---

### 2. Service Description & Permitted Use
- InsightRetail provides deep-learning AI tools designed to parse customer reviews into granular aspect-opinion pairs and polarity classifications (Positive, Negative, Neutral).
- You may use the Services solely for internal retail analytics, product quality tracking, brand monitoring, and customer experience improvement.
- You agree not to reverse engineer, decompile, crawl, or attempt to extract the underlying weights, source code, or training datasets of our AI models.

---

### 3. Customer Data & Dataset Ownership
- **Your Data Remains Yours:** You retain full ownership, title, and intellectual property rights in and to all raw customer feedback, reviews, and CSV datasets uploaded to the platform.
- **Limited Processing License:** You grant InsightRetail a worldwide, limited, non-exclusive license strictly necessary to store, process, and analyze your datasets to deliver the Services to you.
- **Acceptable Content:** You represent and warrant that your uploaded datasets do not contain sensitive Personally Identifiable Information (such as Social Security numbers, government IDs, or payment card numbers) or content that infringes upon third-party copyrights or privacy rights.

---

### 4. Subscriptions, Storage Quotas & Billing
- **Quota Enforcement:** Subscription plans carry storage limits (in Megabytes). Uploads exceeding your active tier allowance will be blocked until your plan is upgraded or old datasets are removed.
- **Recurring Payments:** Paid subscriptions are billed in advance on a recurring monthly cycle via Stripe.
- **Cancellations:** You may cancel your subscription at any time via the Subscription Management portal. Access remains active through the end of your prepaid billing period.

---

### 5. AI Machine Learning Disclaimers
- **Advisory Nature:** Aspect classifications, sentiment scores, and automated health scores are machine-generated statistical approximations.
- **No Warranty on Business Outcomes:** InsightRetail makes no guarantee that utilizing our analytical reports will increase merchandise sales, reduce customer churn, or eliminate product defects.

---

### 6. Limitation of Liability
To the maximum extent permitted by applicable law, InsightRetail shall not be liable for any indirect, incidental, punitive, or consequential damages arising out of your use of or inability to use the platform.

---

### 7. Changes to Terms
We reserve the right to modify these Terms at any time. When material updates are published, registered Retail Managers will receive notification via the platform announcement banner.
`;

const DEFAULT_PRIVACY = `# Privacy Policy

**Effective Date:** October 26, 2026  
**Last Updated:** October 26, 2026  

At **InsightRetail**, we respect the confidentiality of your enterprise data. This Privacy Policy details how we collect, store, process, and safeguard the information you provide when using our customer feedback analytics platform.

---

### 1. Information We Collect
1. **Account Information:** Name, corporate email address, encrypted password hash, company name, and subscription tier.
2. **Review Datasets:** Customer feedback excerpts, product titles, and timestamp metadata provided via CSV file uploads.
3. **Billing Information:** Payment card tokens and subscription transaction logs managed securely via our PCI-DSS compliant partner, Stripe.
4. **Usage Logs:** System access logs, analysis completion timestamps, and feature interaction metrics.

---

### 2. How We Use Your Data
- **Service Delivery:** To parse review text, identify retail aspects, predict sentiment polarity, and generate aggregated executive dashboards.
- **Account Administration:** To send dataset processing completion alerts, password resets, and critical subscription notifications.
- **No Sale of Data:** We do **not** sell, rent, or monetize your uploaded review datasets to data brokers or third-party advertisers.

---

### 3. Data Retention & Permanent Deletion
- Uploaded CSV files and their corresponding review records are retained in your account for as long as your workspace remains active.
- **Customer-Initiated Deletion:** When you delete a dataset from the Dataset Management portal, all raw reviews and aspect-sentiment results associated with that dataset are permanently removed from our active database.
- **Account Closure:** Upon account termination, your data will be queued for permanent cryptographic deletion within 30 days.

---

### 4. Third-Party Sub-processors
We collaborate with trusted infrastructure partners to deliver enterprise-grade performance:
- **Payment Processing:** Stripe Inc.
- **Database Infrastructure:** Neon Cloud (PostgreSQL with SSL/TLS encryption at rest and in transit).
- **Email Infrastructure:** Nodemailer with authenticated TLS SMTP.

---

### 5. Security Safeguards
We implement industry-standard administrative, physical, and technical controls including role-based access management, encrypted database connections, and hashed authentication tokens to prevent unauthorized data exposure.

---

### 6. Contact Us
For questions regarding this Privacy Policy or to submit a data retrieval or deletion request, please contact our Data Governance Officer at:  
**Email:** privacy@insightretail.ai
`;

// Helper: Seed default policy if missing
async function getOrSeedPolicy(type: 'terms' | 'privacy') {
  const existing = await db.select().from(policies).where(eq(policies.type, type));
  if (existing.length > 0) {
    return existing[0];
  }

  const isTerms = type === 'terms';
  const [created] = await db.insert(policies).values({
    type,
    title: isTerms ? 'Terms of Service' : 'Privacy Policy',
    content: isTerms ? DEFAULT_TERMS : DEFAULT_PRIVACY,
    version: '1.0',
    createdAt: new Date(),
    updatedAt: new Date(),
  }).returning();

  return created;
}

// GET /api/policies - Public route: get both policies
router.get('/', async (_req, res) => {
  try {
    const terms = await getOrSeedPolicy('terms');
    const privacy = await getOrSeedPolicy('privacy');
    res.json({
      data: {
        terms,
        privacy,
      },
    });
  } catch (error) {
    console.error('Error fetching policies:', error);
    res.status(500).json({ error: 'Failed to fetch policies' });
  }
});

// GET /api/policies/:type - Public route: get terms or privacy
router.get('/:type', async (req, res) => {
  try {
    const { type } = req.params;
    if (type !== 'terms' && type !== 'privacy') {
      return res.status(400).json({ error: 'Invalid policy type. Must be "terms" or "privacy".' });
    }

    const policy = await getOrSeedPolicy(type);
    res.json({ data: policy });
  } catch (error) {
    console.error(`Error fetching ${req.params.type} policy:`, error);
    res.status(500).json({ error: 'Failed to fetch policy' });
  }
});

// PUT /api/policies/:type - Admin only: update policy
router.put('/:type', authenticate, requireAdmin, async (req: any, res: any) => {
  try {
    const { type } = req.params;
    if (type !== 'terms' && type !== 'privacy') {
      return res.status(400).json({ error: 'Invalid policy type. Must be "terms" or "privacy".' });
    }

    const { title, content, version } = req.body;
    if (!content || typeof content !== 'string' || !content.trim()) {
      return res.status(400).json({ error: 'Content cannot be empty' });
    }

    // Ensure it exists first
    await getOrSeedPolicy(type);

    const updateFields: any = {
      content: content.trim(),
      updatedAt: new Date(),
      updatedBy: req.user.userId,
    };
    if (title && typeof title === 'string' && title.trim()) {
      updateFields.title = title.trim();
    }
    if (version && typeof version === 'string' && version.trim()) {
      updateFields.version = version.trim();
    }

    const [updated] = await db
      .update(policies)
      .set(updateFields)
      .where(eq(policies.type, type))
      .returning();

    res.json({ message: `${updated.title} updated successfully`, data: updated });
  } catch (error) {
    console.error(`Error updating ${req.params.type} policy:`, error);
    res.status(500).json({ error: 'Failed to update policy' });
  }
});

export default router;
