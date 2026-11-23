# InsightRetail — Customer Feedback & Sentiment Analysis System

An Aspect-Based Sentiment Analysis (ABSA) platform for the electronic and retail sector. **InsightRetail** transforms unstructured customer feedback into clear, actionable business strategies through automated sentiment classification, emotion detection, and a dynamic Product Action Matrix.

---

## System Architecture

The application is structured into three dedicated services:

```text
┌───────────────────────┐         HTTP / JSON          ┌───────────────────────────┐
│     Client (Web)      │ ◄──────────────────────────► │     Express Backend       │
│  React 19 + Vite 8    │                              │   Node.js + Drizzle ORM   │
└───────────────────────┘                              └─────────────┬─────────────┘
                                                                     │
                                             PostgreSQL Database     │ Direct Task / DB
                                             (Neon Serverless)       │
                                                                     ▼
                                                       ┌───────────────────────────┐
                                                       │     Python AI Worker      │
                                                       │     FastAPI + PyABSA      │
                                                       └───────────────────────────┘
```

| Service | Technology | Port | Description |
| :--- | :--- | :--- | :--- |
| **`client`** | React 19, TypeScript, Vite 8, Tailwind CSS v4, TanStack Query | `5173` | Responsive web application for Retail Managers and Admins |
| **`server`** | Express 5, TypeScript, Drizzle ORM, Stripe SDK, Nodemailer | `8000` | REST API gateway, JWT auth, quotas, billing, and email notices |
| **`worker`** | Python 3.10+, FastAPI, Uvicorn, PyABSA, Transformers, PyTorch | `8001` | Asynchronous NLP worker for sentiment & emotion analysis |
| **`database`** | PostgreSQL (Neon DB Serverless) | — | Persistent storage for users, datasets, subscriptions, and tickets |

---

## Core Features

### For Retail Managers (`RETAIL_MANAGER`)
* **CSV Dataset Ingestion**: Upload customer review CSVs with automatic format validation and storage quota verification.
* **Free Trial Allowance**: First-time users receive a complimentary free trial upload without needing a paid plan.
* **AI Sentiment & Aspect Pipeline**: Automated extraction of sentiment (Positive / Neutral / Negative), star ratings, emotion scores, and NPS (Net Promoter Score).
* **Product Action Matrix**: Categorizes feedback into **Urgent Fixes** (high-negative impact), **Maintain Strengths** (top-rated advantages), and **Opportunities**.
* **Product Drilldown**: Filter reviews by individual product names to read raw customer comments.
* **Exportable Reports**: Generate PDF summaries and export structured CSV datasets.
* **Stripe Subscriptions**: Seamless plan upgrades (Bronze, Silver, Gold, Diamond) with live billing history and downloadable invoice PDFs.
* **Help & Support**: Search categorized FAQs and submit support tickets directly to the administration team.

### For Super Administrators (`ADMIN`)
* **Dedicated Admin Portal**: Secure login portal (`/admin/login`) with role-based access control.
* **Platform Overview**: Real-time KPI analytics for registered users, active subscriptions, monthly revenue (MRR), and system storage consumption.
* **User Account Moderation**:
  * Paginated user directory with search and status filtering (`active`, `suspended`, `deleted`).
  * Full User Details Modal with pinned navigation buttons (`Previous` / `Next`) and keyboard arrow shortcuts (`←` / `→`).
  * Moderation workflows: Suspend account with predefined reasons, Reactivate account, or Soft Delete (all with automatic email notifications).
* **Subscription Plans CMS**: Author subscription tiers (price, storage quota in MB, feature lists) and broadcast targeted announcements with user registration date filtering.
* **Feedback Ticket Management**: Ingest user support tickets, reply via direct email, and perform multi-select bulk deletions.
* **FAQs & Policies CMS**: Manage platform FAQ questions/answers and update Terms of Service and Privacy Policy markdown in real time.

---

## Getting Started

### Prerequisites
* **Node.js**: `v20.x` or later
* **Python**: `3.10` or later
* **PostgreSQL**: Neon DB connection string or local PostgreSQL instance
* **Stripe Account**: For subscription checkout & webhook handling (optional for local testing)

---

### Step 1: Clone & Install Dependencies

```bash
# Clone the repository
git clone https://github.com/your-username/Feedback-Analysis-System.git
cd Feedback-Analysis-System

# Install Server dependencies
cd server
npm install

# Install Client dependencies
cd ../client
npm install

# Set up Python virtual environment for Worker
cd ../worker
python3 -m venv venv
source venv/bin/activate
pip install --upgrade pip
pip install -r requirements.txt
cd ..
```

---

### Step 2: Configure Environment Variables

Create `.env` files in each service directory based on the following templates:

#### `server/.env`
```env
PORT=8000
FRONTEND_URL=http://localhost:5173
DATABASE_URL=postgresql://user:password@ep-sample.neon.tech/feedback_db?sslmode=require

# JWT
JWT_SECRET=your_jwt_secret_key_here

# Super Admin Default Seed Credentials
ADMIN_EMAIL=admin@example.com
ADMIN_DEFAULT_PASSWORD=AdminPassword123!

# Stripe (Optional for Billing)
STRIPE_SECRET_KEY=sk_test_...

# SMTP Email (Optional for Notification Emails)
SMTP_HOST=smtp.gmail.com
SMTP_PORT=587
SMTP_USER=your_email@gmail.com
SMTP_PASS=your_app_password
SMTP_FROM="InsightRetail <support@insightretail.com>"
```

#### `client/.env`
```env
VITE_API_URL=http://localhost:8000
VITE_STRIPE_PUBLISHABLE_KEY=pk_test_...
```

#### `worker/.env`
```env
DATABASE_URL=postgresql://user:password@ep-sample.neon.tech/feedback_db?sslmode=require
```

---

### Step 3: Initialize Database

Push the database schema using Drizzle:

```bash
cd server
npm run db:push
```

---

### Step 4: Run the Application

Start each service in a separate terminal window:

```bash
# Terminal 1: Express Server (Port 8000)
cd server
npm run dev

# Terminal 2: AI Worker Service (Port 8001)
cd worker
./start.sh
# or: source venv/bin/activate && uvicorn app.main:app --reload --port 8001

# Terminal 3: Vite Client (Port 5173)
cd client
npm run dev
```

Open your browser and navigate to:
* **Retail Manager Portal**: [http://localhost:5173](http://localhost:5173)
* **Super Admin Portal**: [http://localhost:5173/admin/login](http://localhost:5173/admin/login)

---

## Directory Structure

```text
Feedback-Analysis-System/
├── client/                     # Frontend Application (React 19, Vite, Tailwind CSS)
│   ├── src/
│   │   ├── components/         # Reusable UI & Admin/User Components
│   │   ├── contexts/           # AuthContext & Theme Providers
│   │   ├── pages/              # Route pages (Overview, Datasets, Reports, Subscriptions)
│   │   └── services/           # Axios API client & endpoints
│   └── package.json
│
├── server/                     # Backend API Gateway (Node.js, Express, Drizzle)
│   ├── src/
│   │   ├── controllers/        # Business logic controllers
│   │   ├── database/           # Drizzle schema & Neon DB client
│   │   ├── middlewares/        # JWT auth & role-based route guards
│   │   ├── routes/             # Express API route modules
│   │   └── services/           # Stripe, S3/R2 storage, and SMTP email services
│   └── package.json
│
├── worker/                     # Asynchronous AI Worker (FastAPI, Python)
│   ├── app/
│   │   ├── services/           # PyABSA Aspect-Based Sentiment analyzer
│   │   └── main.py             # FastAPI entrypoint
│   └── requirements.txt
│
└── docs/                       # Project Documentation & Specifications
    ├── diagrams/               # Modular Mermaid process flow diagrams
    ├── retail_manager_flow.mmd # End-to-end Retail Manager flow
    ├── super_admin_flow.mmd    # End-to-end Super Admin flow
    └── INTEGRATED_TEST_SCENARIOS.md # Integration test testbed (40 scenarios)
```

---