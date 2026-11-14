# Feedback Analysis System - Comprehensive Testing Scenarios (Final Report)

This document provides the formal **Unit Testing Scenarios (Component & Form Level)** and **Integration Testing Scenarios (End-to-End User Flows)** for the Electronic Sector Aspect-Based Sentiment Analysis (ABSA) System.

---

## 1. Unit Testing Scenarios (Form, Component & Screen Level)

These unit test cases validate individual UI screens, input fields, client/server validation rules, error handling, and isolated component states.

---

### Module 1: Authentication & Authorization

#### Test Case U01: Retail Manager Registration Form
- **Component / Screen:** `Register.tsx` (`/register`)
- **What it tests:** Validation and submission of the retailer sign-up form.
- **Inputs:**
  1. *Valid:* Username: `john_retail`, Email: `john@electronics.com`, Password: `Password@123`, Confirm Password: `Password@123`, Company Name: `Apex Tech`.
  2. *Duplicate Email:* Email already registered in database (`user@example.com`).
  3. *Password Mismatch:* Password: `Password@123`, Confirm Password: `Password@456`.
  4. *Weak Password:* Password: `123`.
  5. *Empty Mandatory Fields:* Submitting form with blank fields.
- **Expected Results:**
  1. Successfully creates account, assigns `RETAIL_MANAGER` role, sets `has_used_free_trial = false`, and redirects to Retailer Dashboard (`/dashboard`).
  2. Displays error toast/alert: `"Email is already registered"`.
  3. Prevents submission and displays: `"Passwords do not match"`.
  4. Prevents submission and displays: `"Password must be at least 6 characters"`.
  5. Form validation prevents submit and flags required fields.

#### Test Case U02: Retail Manager Login Form
- **Component / Screen:** `Login.tsx` (`/login`)
- **What it tests:** Authentication credentials, error handling, and redirection for Retail Managers.
- **Inputs:**
  1. *Valid Credentials:* Registered retailer email and matching password.
  2. *Invalid Password:* Correct email with wrong password.
  3. *Non-existent Email:* Email not present in database.
  4. *Empty Fields:* Leaving email or password empty.
  5. *Suspended Account:* Email belonging to a retailer with `status: 'suspended'`.
- **Expected Results:**
  1. Authenticates user, stores JWT in localStorage/context, and navigates to `/dashboard`.
  2. Displays error: `"Invalid credentials"`.
  3. Displays error: `"Invalid credentials"` (does not leak email existence).
  4. Form validation displays: `"Please fill in all fields"`.
  5. Displays alert: `"Your account has been suspended. Please contact support"` (Code: `ACCOUNT_SUSPENDED`).

#### Test Case U03: Super Admin Login Form & Rate Limiting
- **Component / Screen:** `AdminLoginPage.tsx` (`/admin/login`)
- **What it tests:** Admin authentication gate and brute-force lockout prevention.
- **Inputs:**
  1. *Valid Admin Credentials:* Seeded admin email and password.
  2. *Invalid Admin Password:* Seeded admin email with incorrect password.
  3. *Retailer Credentials on Admin Portal:* Valid `RETAIL_MANAGER` credentials entered into Admin Login.
  4. *Brute Force Threshold:* 5 consecutive incorrect login attempts within 15 minutes.
- **Expected Results:**
  1. Authenticates, verifies role is `ADMIN`, and navigates to `/admin`.
  2. Displays error: `"Invalid admin credentials"`.
  3. Denies access with error: `"Access denied: Unauthorized role"`.
  4. Triggers lockout status; displays countdown timer: `"Account temporarily locked due to too many failed attempts. Try again in X minutes"`.

---

### Module 2: Dataset Upload & Quota Validation

#### Test Case U04: CSV File Type & Dropzone Validation
- **Component / Screen:** `Datasets.tsx` (`/dashboard/datasets`) - File Upload Card
- **What it tests:** The drag-and-drop file picker and MIME type validation.
- **Inputs:**
  1. Valid `.csv` file (e.g., `headphone_reviews.csv`).
  2. Invalid file type (e.g., `report.pdf`, `image.png`, `data.xlsx`).
  3. Empty submission (clicking Upload without selecting a file).
- **Expected Results:**
  1. File is accepted into file stage; displays file name and computed size in MB.
  2. Rejects file immediately; shows toast: `"Invalid file type. Please upload a valid CSV file"`.
  3. Upload button remains disabled or alerts: `"Please select a file to upload"`.

#### Test Case U05: Dataset Terms of Service Agreement Checkbox
- **Component / Screen:** `Datasets.tsx` - Upload Form
- **What it tests:** Mandatory legal/data processing consent before uploading.
- **Inputs:**
  1. File selected, Checkbox unchecked, user clicks Upload.
  2. File selected, Checkbox checked, user clicks Upload.
- **Expected Results:**
  1. Prevents API call and displays alert: `"You must agree to the Terms of Service and data processing policy before uploading"`.
  2. Enables upload submission and initiates file transfer to storage.

#### Test Case U06: CSV Header & Column Schema Validation
- **Component / Screen:** Server `datasetsRouter` (`POST /api/datasets/upload`)
- **What it tests:** Pre-processing parser verification of mandatory dataset columns.
- **Inputs:**
  1. CSV containing recognized Product Name column (`Product_Name`, `product`, `item`) and Review Text column (`Review_Text`, `review`, `comment`).
  2. CSV missing the review text column (e.g., only `Product_ID, Price, Date`).
  3. Completely empty CSV file (0 bytes).
- **Expected Results:**
  1. Parser validates columns successfully, reads record count, and queues analysis.
  2. Rejects upload with HTTP 400: `"CSV must contain at least one product column and one review column"`.
  3. Rejects upload with HTTP 400: `"Uploaded CSV file is empty"`.

---

### Module 3: Dataset Processing & Management Controls

#### Test Case U07: Active Analysis Progress Polling Component
- **Component / Screen:** `ActiveAnalysisIndicator.tsx` / `Datasets.tsx`
- **What it tests:** UI real-time polling while dataset status is `ANALYSIS_IN_PROGRESS`.
- **Inputs:** Active dataset in database with `status: 'ANALYSIS_IN_PROGRESS'`, `totalReviews: 500`, `processedReviews: 250`.
- **Expected Results:**
  1. Top header and table display animated spinner/progress badge showing `50% Completed (250/500 reviews)`.
  2. Component polls `/api/datasets/active` at 2.5s intervals without UI freeze.
  3. Once worker completes, status automatically updates to `COMPLETED` and badge turns green.

#### Test Case U08: Dataset Retry Control for Failed Analyses
- **Component / Screen:** `Datasets.tsx` - Table Action Row
- **What it tests:** Re-triggering worker analysis for a failed dataset.
- **Inputs:** User clicks "Retry" button on a dataset having `status: 'FAILED'`.
- **Expected Results:**
  1. Sends `POST /api/datasets/:id/retry`.
  2. Status reverts from `FAILED` to `PENDING` / `ANALYSIS_IN_PROGRESS`.
  3. Error message is cleared and analysis progress restarts.

#### Test Case U09: Dataset Deletion Confirmation Dialog
- **Component / Screen:** `Datasets.tsx` - AlertDialog Component
- **What it tests:** Safe deletion of dataset records and related review results.
- **Inputs:**
  1. User clicks delete trash icon on a dataset row -> clicks "Cancel".
  2. User clicks delete trash icon -> clicks "Confirm / Delete".
- **Expected Results:**
  1. Modal closes; dataset remains intact.
  2. Sends `DELETE /api/datasets/:id`, removes dataset from S3/R2 storage, cascades deletion across `reviews` and `feedback_results`, removes row from table, and shows success toast.

---

### Module 4: Analysis Reports & Visualizations

#### Test Case U10: Dataset Selector in Reports Page
- **Component / Screen:** `Reports.tsx` (`/dashboard/reports`)
- **What it tests:** Dropdown switching between multiple completed datasets.
- **Inputs:** Selecting Dataset A (e.g., "Smartphones Q3") vs Dataset B (e.g., "Laptops Q4").
- **Expected Results:**
  1. Updates URL query parameter `?datasetId=<id>`.
  2. Invalidates React Query cache for `['reports', 'overview', datasetId]`.
  3. All charts (Donut, Matrix, Aspect Bars) re-render with the newly selected dataset's metrics.

#### Test Case U11: Sentiment Distribution Pie/Donut Chart Component
- **Component / Screen:** `Reports.tsx` (Recharts `ResponsiveContainer`)
- **What it tests:** Accurate calculation and rendering of positive, negative, and neutral percentages.
- **Inputs:** Dataset with 600 Positive, 300 Negative, 100 Neutral extracted triplets.
- **Expected Results:**
  1. Renders Donut chart displaying 60% Positive (Green), 30% Negative (Red), 10% Neutral (Gray).
  2. Hovering over slices renders tooltip with exact counts.

#### Test Case U12: Product Action Priority Matrix Component
- **Component / Screen:** `ProductActionMatrix.tsx`
- **What it tests:** 2x2 scatter plot mapping products by sentiment score vs. review frequency into 4 quadrants.
- **Inputs:** Product X (High Volume, High Sentiment), Product Y (High Volume, Low Sentiment).
- **Expected Results:**
  1. Product X is plotted in the **Promote / Core Strength** quadrant (Top Right).
  2. Product Y is plotted in the **Critical Fix / Urgent Action** quadrant (Top Left).
  3. Clicking a product badge filters the drill-down view or navigates to `/dashboard/reports/product/:productName`.

#### Test Case U13: Aspect Performance Bar Chart & Sentiment Filtering
- **Component / Screen:** `AspectPerformanceChart.tsx`
- **What it tests:** Aspect breakdown (e.g., "Battery", "Sound Quality", "Price") and sentiment toggle buttons.
- **Inputs:** User toggles filter to "Negative Only".
- **Expected Results:**
  1. Chart updates dynamically to show top negative complaint aspects sorted descending by frequency.
  2. Aspects with zero negative mentions are hidden.

#### Test Case U14: Aspect Deep-Dive Drill-Down Table & Search
- **Component / Screen:** `DeepDiveDrillDown.tsx`
- **What it tests:** Review text snippet display and aspect keyword search.
- **Inputs:** Typing `"battery"` into the aspect filter search input.
- **Expected Results:**
  1. Table filters in real-time to display only reviews containing the aspect `"battery"`.
  2. Highlights the extracted opinion word (e.g., `"drains fast"`) and sentiment badge (`NEGATIVE`).

---

### Module 5: Subscription, Pricing & Billing Components

#### Test Case U15: Current Storage Quota Progress Gauge
- **Component / Screen:** `Overview.tsx` / `Subscriptions.tsx`
- **What it tests:** Storage calculation and near-limit threshold warning.
- **Inputs:**
  1. User on Free Trial (75 MB limit) using 20 MB.
  2. User on Standard Plan (500 MB limit) using 450 MB (90%).
- **Expected Results:**
  1. Progress bar shows 26.6% usage; badge indicates Free Trial tier.
  2. Progress bar turns Amber/Red (>85% capacity); displays warning badge: `"Storage Almost Full - Upgrade Recommended"`.

#### Test Case U16: Stripe Payment Modal & Card Element
- **Component / Screen:** `PaymentModal.tsx` (`@stripe/react-stripe-js`)
- **What it tests:** Client-side credit card input validation and tokenization.
- **Inputs:**
  1. *Valid Card:* Standard Stripe test card `4242 4242 4242 4242`, future expiry date, valid CVC.
  2. *Declined Card:* Stripe test card `4000 0000 0000 0002` (Card Declined).
  3. *Incomplete Details:* Missing CVC or expired date.
- **Expected Results:**
  1. Stripe Element confirms payment; shows loading spinner, closes modal, and refreshes subscription.
  2. Displays inline Stripe error: `"Your card was declined"`.
  3. Prevents submission and displays inline validation error underneath the input field.

#### Test Case U17: Subscription Cancellation Modal
- **Component / Screen:** `Subscriptions.tsx`
- **What it tests:** Confirmation prompt before cancelling an active recurring plan.
- **Inputs:** User clicks "Cancel Subscription" button -> confirms in modal.
- **Expected Results:**
  1. Dispatches `POST /api/subscriptions/cancel`.
  2. Shows toast: `"Subscription canceled successfully"`.
  3. Active subscription status changes to `CANCELED`, retaining access until `currentPeriodEnd`.

---

### Module 6: User Profile & Security Settings

#### Test Case U18: Profile Information Form
- **Component / Screen:** `Settings.tsx` (`/dashboard/settings`)
- **What it tests:** Updating retailer name, company name, and company email.
- **Inputs:** Name: `Jane Doe`, Company: `Apex Retail Ltd`, Company Email: `support@apexretail.com`.
- **Expected Results:**
  1. Sends `PUT /api/profile`, updates database, updates header user display, and shows success toast: `"Profile updated successfully"`.

#### Test Case U19: Two-Step Password Reset Form (Verification OTP)
- **Component / Screen:** `Settings.tsx` - Change Password Dialog
- **What it tests:** Step 1 email code request and Step 2 code verification with new password.
- **Inputs:**
  1. User clicks "Request Verification Code".
  2. Enters expired or incorrect 6-digit code.
  3. Enters valid 6-digit code with matching new passwords (`NewPass@2026`).
- **Expected Results:**
  1. Sends code via email, advances dialog to Step 2, and starts 15-minute expiration timer.
  2. Displays error: `"Invalid or expired verification code"`.
  3. Successfully resets password, invalidates token, and shows toast: `"Password updated successfully"`.

#### Test Case U20: Theme Preferences Switcher
- **Component / Screen:** `ThemeToggle.tsx` / `Settings.tsx`
- **What it tests:** Switching between Light, Dark, and System theme modes.
- **Inputs:** Selecting "Dark Mode" radio button.
- **Expected Results:**
  1. Toggles `.dark` CSS class on `document.documentElement`.
  2. Saves preference in browser `localStorage`.
  3. All backgrounds, borders, and text colors update instantly without page reload.

---

### Module 7: Help, Support & Feedback Forms

#### Test Case U21: Support Feedback Submission Form
- **Component / Screen:** `HelpSupport.tsx` (`/dashboard/help`)
- **What it tests:** Submitting retailer questions or bug reports to the admin team.
- **Inputs:**
  1. *Valid:* Subject: `"Cannot export PDF"`, Message: `"Export button is unresponsive on Chrome v120"`.
  2. *Empty Submission:* Blank subject and message.
- **Expected Results:**
  1. Sends `POST /api/feedbacks`, creates record with `status: 'pending'`, resets form, and shows toast: `"Your message has been sent to support"`.
  2. HTML5 form validation highlights required inputs; prevents API dispatch.

#### Test Case U22: FAQ Accordion Search & Filter
- **Component / Screen:** `HelpSupport.tsx` / `LandingPage.tsx`
- **What it tests:** Real-time search filter across public/retailer FAQ lists.
- **Inputs:** Typing `"refund"` or `"file limit"` into the FAQ search bar.
- **Expected Results:**
  1. Accordion list dynamically filters to display only questions or answers matching the keyword.
  2. If no matches exist, displays empty state: `"No FAQs found matching your search"`.

---

### Module 8: Super Admin Management Components

#### Test Case U23: Admin Plan Creation Form
- **Component / Screen:** `AdminPlans.tsx` (`/admin` -> Plans Tab)
- **What it tests:** Creating a new tier subscription plan and syncing with Stripe.
- **Inputs:**
  1. *Valid:* Name: `"Enterprise Pro"`, Price: `199.99`, Storage Limit: `5000` MB, Duration: `30` Days.
  2. *Invalid Price:* Price: `-50`.
- **Expected Results:**
  1. Sends `POST /api/plans`, creates Stripe Product & Price via Stripe API, stores IDs in DB, updates table.
  2. Form validation error: `"Price must be a positive number"`.

#### Test Case U24: Admin User Account Suspension Control
- **Component / Screen:** `AdminUsers.tsx` (`/admin/users`)
- **What it tests:** Suspending a retail manager account with an audit reason.
- **Inputs:** Admin selects retailer `retailer_01`, clicks "Suspend", enters reason: `"Terms of service violation - unauthorized data scraping"`.
- **Expected Results:**
  1. Sends `PATCH /api/admin/users/:id/status` with `{ status: 'suspended', reason: '...' }`.
  2. User status badge updates to red `Suspended`.
  3. System triggers automated suspension email to the retailer via `emailService`.

#### Test Case U25: Admin Feedback Reply & Status Resolution Form
- **Component / Screen:** `AdminFeedbacks.tsx` (`/admin/feedbacks`)
- **What it tests:** Admin replying to retailer inquiries directly via the dashboard.
- **Inputs:** Admin opens Feedback #104, enters reply text: `"We have fixed the export issue in the latest patch"`, clicks "Send Reply".
- **Expected Results:**
  1. Sends `POST /api/feedbacks/:id/reply`.
  2. Feedback status changes from `pending` to `replied`.
  3. Retailer receives formatted response email with admin reply text.

#### Test Case U26: Admin Terms & Privacy Policy Editor
- **Component / Screen:** `AdminPolicies.tsx` (`/admin/terms`)
- **What it tests:** Updating legal policy markdown content and version number.
- **Inputs:** Tab: `Terms of Service`, Content updated with new clause, Version: `2.0`.
- **Expected Results:**
  1. Sends `PUT /api/policies/terms`, updates record in database with `updatedBy = admin_id`.
  2. Public `/terms` and Retailer `/dashboard/terms` immediately render updated content.

---

## 2. Integration Testing Scenarios (End-to-End User Flows)

These scenarios validate multi-module interoperability, asynchronous worker jobs, database state persistence, cloud storage operations, and external payment/email webhooks.

---

### Test Case I01: Complete Dataset Analysis Flow (Core AI Pipeline)
- **Modules Tested:** `Auth` $\rightarrow$ `Datasets UI` $\rightarrow$ `Cloudflare R2 Storage` $\rightarrow$ `Python ABSA Worker` $\rightarrow$ `PostgreSQL DB` $\rightarrow$ `Reports Engine`.
- **End-to-End Sequence:**
  1. Retail Manager logs in with valid credentials at `/login`.
  2. System verifies session and lands on `/dashboard`.
  3. Retailer navigates to **Dataset Management** (`/dashboard/datasets`).
  4. Selects a 15 MB CSV file containing 1,200 electronic product reviews, checks Terms checkbox, and clicks "Upload & Analyze".
  5. **Server Handling:** Express verifies remaining quota $\rightarrow$ uploads file buffer to Cloudflare R2 bucket $\rightarrow$ creates database record in `datasets` with `status: 'PENDING'`.
  6. **Worker Processing:** Python background worker detects pending dataset $\rightarrow$ updates status to `ANALYSIS_IN_PROGRESS` $\rightarrow$ streams CSV from R2 $\rightarrow$ executes PyABSA triplet extraction (Aspect, Opinion, Sentiment).
  7. Worker writes 2,800 extracted triplets into `reviews` and `feedback_results` tables and updates dataset to `COMPLETED`.
  8. Retailer UI polling detects completion $\rightarrow$ notifications badge alerts user.
  9. Retailer clicks "View Report" $\rightarrow$ navigated to `/dashboard/reports?datasetId=X`.
  10. System queries `reportsApi` $\rightarrow$ Recharts Donut Chart, Aspect Performance Bar Chart, and Product Action Matrix populate with live data.
  11. Retailer clicks "Export CSV" $\rightarrow$ browser downloads aggregated analysis report.
- **Expected Result:** The entire pipeline executes asynchronously without timeout; review text is accurately parsed, sentiment triplets are stored in DB, and reports display interactive data visualizations.

---

### Test Case I02: First-Time User Free Trial Quota & Storage Enforcement Flow
- **Modules Tested:** `Registration` $\rightarrow$ `Quota Middleware` $\rightarrow$ `Datasets API` $\rightarrow$ `Upgrade Prompt`.
- **End-to-End Sequence:**
  1. New retailer registers an account (`has_used_free_trial = false`).
  2. User navigates to `/dashboard/datasets`.
  3. **Attempt 1 (Within Free Limit):** Uploads a valid 40 MB CSV file (under the 75 MB free trial cap).
     - *Result:* Upload succeeds; `has_used_free_trial` is marked `true`.
  4. User attempts **Attempt 2 (Second Upload without Subscription):** Uploads another 10 MB CSV file.
     - *Result:* Express middleware detects `has_used_free_trial === true` and no active subscription.
     - Server responds with HTTP 403 Forbidden: `"Free trial used. Please subscribe to an active plan to upload additional datasets"`.
     - Frontend catches error and opens the **Upgrade Subscription Modal**.
  5. User attempts **Attempt 3 (Exceeding Free Trial Cap on First Try):** New user uploads an 85 MB file on their first try.
     - *Result:* System blocks upload immediately: `"File size (85MB) exceeds maximum free trial limit (75MB)"`.
- **Expected Result:** The system strictly protects resources by granting exactly one $\le 75$ MB free trial analysis per account and blocking subsequent attempts until a subscription is active.

---

### Test Case I03: End-to-End Subscription Purchase & Stripe Webhook Synchronization Flow
- **Modules Tested:** `Subscriptions UI` $\rightarrow$ `Stripe API` $\rightarrow$ `Stripe Webhook Handler` $\rightarrow$ `Active Subscriptions DB` $\rightarrow$ `Storage Limit Upgrade`.
- **End-to-End Sequence:**
  1. Retailer navigates to **Subscription & Plans** (`/dashboard/subscriptions`).
  2. Reviews plans table and clicks "Upgrade to Pro Plan" ($49.99/mo, 1000 MB storage).
  3. Frontend requests `POST /api/subscriptions/create` $\rightarrow$ backend creates/retrieves Stripe Customer and returns `clientSecret`.
  4. Stripe Payment Modal opens; user enters valid test payment credentials and submits.
  5. Stripe charges card and dispatches webhook event `checkout.session.completed` / `invoice.payment_succeeded` to `/api/webhooks/stripe`.
  6. Backend webhook route validates Stripe cryptographic signature (`stripe.webhooks.constructEvent`).
  7. Backend updates `active_subscriptions` table with `status: 'ACTIVE'`, `plan_id`, `stripe_subscription_id`, and calculates `currentPeriodEnd`.
  8. Frontend React Query listener receives confirmation $\rightarrow$ displays success toast.
  9. Retailer's available storage quota immediately increases from 75 MB to 1,000 MB.
  10. Retailer navigates to Datasets and successfully uploads a 350 MB dataset that was previously blocked.
- **Expected Result:** Payment processing and entitlement granting are synchronized securely via webhooks; user storage capacity expands without requiring manual logout/login.

---

### Test Case I04: Subscription Cancellation & Grace Period Expiry Flow
- **Modules Tested:** `Subscriptions UI` $\rightarrow$ `Stripe Service` $\rightarrow$ `Active Subscriptions DB` $\rightarrow$ `Auth & Storage Middleware`.
- **End-to-End Sequence:**
  1. Retailer with an active Pro Plan clicks "Cancel Subscription".
  2. Confirms action in modal $\rightarrow$ backend calls `stripe.subscriptions.update(id, { cancel_at_period_end: true })`.
  3. Database updates `active_subscriptions.status = 'CANCELED'`.
  4. **During Current Billing Period:** Retailer retains access to existing reports, datasets, and unused storage allowance.
  5. **Simulated Expiration / Stripe Webhook `customer.subscription.deleted`:** Stripe fires termination event $\rightarrow$ backend sets subscription status to `EXPIRED`.
  6. Retailer attempts to upload a new dataset.
  7. Server middleware detects `EXPIRED` status $\rightarrow$ blocks upload and prompts for renewal.
- **Expected Result:** Cancelling does not cause immediate service termination; access persists until `currentPeriodEnd`, after which upload capabilities are revoked.

---

### Test Case I05: Super Admin Content Update to Public & Retailer Reflection Flow
- **Modules Tested:** `Admin FAQs UI` $\rightarrow$ `Admin API` $\rightarrow$ `Database` $\rightarrow$ `Public Landing Page` $\rightarrow$ `Retailer Help Page`.
- **End-to-End Sequence:**
  1. Super Admin logs in at `/admin/login` and navigates to `/admin/faqs`.
  2. Clicks "Add FAQ" $\rightarrow$ fills Question: `"What file encoding is supported?"` and Answer: `"UTF-8 encoded CSV files only"`, Sort Order: `1`, Is Visible: `true`.
  3. Clicks "Save FAQ" $\rightarrow$ sends `POST /api/admin/faqs` $\rightarrow$ record inserted into `faqs` table.
  4. Super Admin opens an Incognito browser window $\rightarrow$ visits public landing page `/` $\rightarrow$ scrolls to FAQ section.
     - *Verification:* The newly added question appears in the public FAQ accordion.
  5. Retail Manager logs into `/dashboard/help`.
     - *Verification:* The same FAQ question is visible and searchable in the Retailer Support accordion.
  6. Admin toggles visibility switch to `Inactive / Hidden` on that FAQ.
  7. Refreshes public and retailer pages $\rightarrow$ FAQ is hidden from both views.
- **Expected Result:** Content updates made by the administrator persist instantly across public landing pages and authenticated retailer portals without requiring a frontend redeploy.

---

### Test Case I06: Retailer Feedback Submission to Admin Reply & Email Delivery Flow
- **Modules Tested:** `Help & Support UI` $\rightarrow$ `Feedback API` $\rightarrow$ `Admin Feedbacks UI` $\rightarrow$ `EmailService (Nodemailer/SMTP)` $\rightarrow$ `Status Lifecycle`.
- **End-to-End Sequence:**
  1. Retailer navigates to `/dashboard/help` $\rightarrow$ fills Support Contact form (Subject: `"Feature Request: Shopify CSV Support"`, Message: `"Can you add auto-column mapping for Shopify exports?"`).
  2. Clicks "Send Message" $\rightarrow$ record inserted into `feedbacks` with `status: 'pending'`, `retailer_id: user.id`.
  3. Super Admin visits `/admin/feedbacks`.
  4. New feedback item appears at the top of the table with a yellow `pending` badge.
  5. Admin clicks on the feedback row $\rightarrow$ reads details in modal $\rightarrow$ clicks "Reply".
  6. Admin enters response: `"Shopify format support is scheduled for release in Q1 2027"`.
  7. Submits reply $\rightarrow$ backend updates `feedbacks.status = 'replied'` and sets `replied_by = admin.id`.
  8. `emailService` dispatches an HTML email via SMTP to the retailer's registered email address containing the original query and the admin's reply.
  9. Feedback badge in Admin updates to green `replied`.
- **Expected Result:** Bidirectional communication flow succeeds; feedback lifecycle transitions from `pending` to `replied`, linking the admin user ID and dispatching notification emails.

---

### Test Case I07: Admin User Suspension & Account Lockout Flow
- **Modules Tested:** `Admin Users UI` $\rightarrow$ `Users DB` $\rightarrow$ `Auth Middleware` $\rightarrow$ `EmailService`.
- **End-to-End Sequence:**
  1. Retailer `retailer_tech` is logged in and active on the dashboard.
  2. Super Admin opens `/admin/users` $\rightarrow$ locates `retailer_tech` $\rightarrow$ clicks "Suspend User".
  3. Admin enters suspension reason: `"Payment dispute / Chargeback registered"`.
  4. Backend updates `users.status = 'suspended'` and writes `suspension_reason`.
  5. `emailService` sends suspension notice email to retailer.
  6. Retailer attempts any authenticated request (e.g., clicking Datasets or Reports).
  7. `authMiddleware` intercepts JWT $\rightarrow$ queries database $\rightarrow$ detects `status === 'suspended'`.
  8. Request is aborted with HTTP 403 Forbidden (`code: 'ACCOUNT_SUSPENDED'`).
  9. Frontend intercepts 403 $\rightarrow$ clears auth token $\rightarrow$ redirects to `/login` displaying suspension banner.
  10. Admin returns to `/admin/users` and clicks "Reactivate User".
  11. Retailer logs in again $\rightarrow$ authentication succeeds and dashboard access is restored.
- **Expected Result:** User suspension immediately invalidates operational capabilities across all active sessions, enforces middleware rejection, and cleanly reactivates upon admin reversal.

---

### Test Case I08: Worker Server Pause/Stop Detection, Auto-Fail & Retry Recovery Flow
- **Modules Tested:** `Python ABSA Worker` $\rightarrow$ `Express Health Watchdog` $\rightarrow$ `Database Status Management` $\rightarrow$ `Datasets UI Retry Action`.
- **End-to-End Sequence:**
  1. Retailer uploads a valid CSV dataset; dataset begins processing (`status: 'ANALYSIS_IN_PROGRESS'`).
  2. While the dataset is actively processing, the developer/administrator pauses or stops the Python worker service (e.g., `Ctrl+C`, `Ctrl+Z`, or killing the Uvicorn process).
  3. **Automated Watchdog Detection:**
     - On the next poll cycle (within 2.5s), the Express server queries the worker's `/health` endpoint with an automated timeout (1.5s).
     - The health check fails due to timeout or `ECONNREFUSED`.
     - The Express watchdog immediately catches the failure and updates the dataset in PostgreSQL: `status = 'FAILED'`, `errorMessage = 'Analysis stopped: Python worker service is offline or paused. Please restart the worker and click Try Again.'`.
  4. **Manual User Stop Alternative:**
     - If the user prefers to stop the analysis manually from the UI while in progress, they can click the new "Stop Analysis" button.
     - The backend dispatches a cancel signal to `/cancel`, updates the database status to `FAILED`, and releases the active polling lock.
  5. **Frontend Reaction:**
     - The top header's `ActiveAnalysisIndicator` stops spinning and unmounts.
     - The Datasets table updates the row's badge from blue `In Progress` to red `Failed` with the descriptive error tooltip.
     - The "Try Again" (RotateCw) retry button becomes immediately visible and enabled.
  6. **Recovery & Retry:**
     - User restarts or resumes the Python worker service (`./start.sh`).
     - User clicks "Try Again" in the table.
     - Backend verifies worker availability, clears prior error logs, resets progress to 0, transitions status back to `ANALYSIS_IN_PROGRESS`, and re-triggers analysis.
     - Analysis completes successfully (`status: 'COMPLETED'`).
- **Expected Result:** Pausing or stopping the worker server never leaves the system hanging in an infinite progress loop; the system automatically detects the offline/paused state, transitions the dataset to `FAILED`, and empowers the user to restart the analysis via the retry button once the worker is restored.

---

### Test Case I09: Broadcast Plan Announcement & Unseen Notification Modal Flow
- **Modules Tested:** `Plans API / Announcement API` $\rightarrow$ `Junction Table (user_announcement_views)` $\rightarrow$ `AnnouncementModal Component`.
- **End-to-End Sequence:**
  1. Super Admin updates an existing plan's price or creates a new promotional plan.
  2. System creates record in `plan_announcements` with title: `"Holiday Storage Boost"`, action: `"created"`.
  3. Retailer logs into the dashboard (`/dashboard`).
  4. Dashboard layout queries `GET /api/announcements/unseen`.
  5. Server checks `plan_announcements` against `user_announcement_views` for this user ID.
  6. Detects unseen announcement $\rightarrow$ frontend automatically renders `AnnouncementModal.tsx` over the dashboard.
  7. Retailer reads message and clicks "Got It / Mark as Seen".
  8. Frontend calls `POST /api/announcements/:id/seen`.
  9. Server inserts composite record into `user_announcement_views (user_id, announcement_id, seen_at)`.
  10. Retailer refreshes page or navigates between routes.
  11. Modal does not show again.
- **Expected Result:** Global and plan-specific announcements reach active users via popover alerts on login, and user viewing state is persisted accurately in junction tables to prevent duplicate prompts.

---

### Test Case I10: Account Deletion (Cascade Cleanup & Storage Sanitization) Flow
- **Modules Tested:** `Settings Danger Zone` $\rightarrow$ `Auth API` $\rightarrow$ `Database Cascades` $\rightarrow$ `Cloudflare R2 Storage Service`.
- **End-to-End Sequence:**
  1. Retailer with uploaded datasets, reviews, and subscriptions navigates to `/dashboard/settings`.
  2. Scrolls to **Danger Zone** $\rightarrow$ clicks "Delete Account".
  3. Modal opens requiring user to type confirmation text `"DELETE"` and their current password.
  4. Submits form $\rightarrow$ `DELETE /api/profile`.
  5. **Server Processing:**
     - Verifies password against `passwordHash`.
     - Queries all dataset records belonging to user $\rightarrow$ sends `DeleteObjectCommand` to Cloudflare R2 bucket to delete physical CSV files.
     - Deletes user row from `users` table.
     - Database triggers `ON DELETE CASCADE` across `active_subscriptions`, `datasets`, `reviews`, `feedback_results`, `verification_codes`, and `user_announcement_views`.
     - Associated support tickets in `feedbacks` have `retailer_id` cleaned or soft-deleted.
  6. Frontend clears JWT and local state $\rightarrow$ navigates to Landing Page `/` with toast: `"Your account and associated data have been permanently deleted"`.
  7. Attempting to log in with deleted credentials returns HTTP 401.
- **Expected Result:** Account termination cleans all relational database rows and external object storage files without orphaned records.

---

## 3. Summary Test Matrix

| ID | Category | Scope / Feature | Automated / Manual | Priority |
| :--- | :--- | :--- | :--- | :--- |
| **U01** | Unit | Retailer Registration Form | Automated (Jest / Playwright) | High |
| **U02** | Unit | Retailer Login Form & Role Routing | Automated (Jest / React Testing Lib) | Critical |
| **U03** | Unit | Super Admin Login & Rate Limiting | Automated (Jest / Supertest) | Critical |
| **U04** | Unit | CSV File Extension & Dropzone | Automated (React Testing Lib) | High |
| **U05** | Unit | Terms of Service Checkbox Gate | Automated (React Testing Lib) | Medium |
| **U06** | Unit | CSV Header & Column Schema Check | Automated (Supertest) | Critical |
| **U07** | Unit | Progress Polling Component | Automated (React Testing Lib) | High |
| **U08** | Unit | Dataset Retry Button Action | Automated (React Testing Lib) | Medium |
| **U09** | Unit | Dataset Deletion Confirmation Dialog | Automated (React Testing Lib) | High |
| **U10** | Unit | Reports Dataset Selection Dropdown | Automated (React Testing Lib) | High |
| **U11** | Unit | Sentiment Distribution Pie Chart | Automated (Visual Regression) | High |
| **U12** | Unit | Product Action Matrix 2x2 Scatter Plot | Automated (Visual Regression) | High |
| **U13** | Unit | Aspect Performance Bar Chart | Automated (React Testing Lib) | Medium |
| **U14** | Unit | Deep-Dive Aspect Drill-Down Search | Automated (React Testing Lib) | High |
| **U15** | Unit | Storage Quota Capacity Gauge | Automated (React Testing Lib) | High |
| **U16** | Unit | Stripe Credit Card Element Modal | Manual / Stripe Mock | Critical |
| **U17** | Unit | Cancel Subscription Confirmation | Automated (React Testing Lib) | High |
| **U18** | Unit | User Profile Info Update Form | Automated (React Testing Lib) | Medium |
| **U19** | Unit | Two-Step Password Reset Dialog | Automated (React Testing Lib) | High |
| **U20** | Unit | Theme Preference Switcher | Automated (React Testing Lib) | Low |
| **U21** | Unit | Support Feedback Submission Form | Automated (React Testing Lib) | Medium |
| **U22** | Unit | FAQ Accordion Search Filter | Automated (React Testing Lib) | Low |
| **U23** | Unit | Admin Plan Creation Form | Automated (React Testing Lib) | High |
| **U24** | Unit | Admin User Account Suspension Modal | Automated (React Testing Lib) | Critical |
| **U25** | Unit | Admin Feedback Reply & Status Update | Automated (React Testing Lib) | High |
| **U26** | Unit | Admin Terms & Policy Markdown Editor | Automated (React Testing Lib) | Medium |
| **I01** | Integration | Complete CSV Upload & ABSA Worker Pipeline | Automated (End-to-End Playwright) | Critical |
| **I02** | Integration | Free Trial 75MB Quota Enforcement | Automated (Supertest / Playwright) | Critical |
| **I03** | Integration | Stripe Payment & Webhook Entitlement Sync | Manual Sandbox / Stripe CLI | Critical |
| **I04** | Integration | Subscription Cancellation & Grace Expiry | Automated Integration | High |
| **I05** | Integration | Admin FAQ Update to Public Display | Automated (Playwright E2E) | High |
| **I06** | Integration | Retailer Feedback to Admin Email Reply | Automated Integration | High |
| **I07** | Integration | Admin User Suspension & JWT Interception | Automated Integration | Critical |
| **I08** | Integration | Worker Processing Failure & Retry | Automated Integration | High |
| **I09** | Integration | Plan Announcement Broadcast & Read Tracking | Automated Integration | Medium |
| **I10** | Integration | Account Deletion Cascade & R2 Storage Cleanup | Automated Integration | Critical |

