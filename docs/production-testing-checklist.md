# 🧪 Financy Production Testing Checklist

This document provides a comprehensive testing checklist for validating the Financy application in production after deployment to Vercel (frontend) and Railway (backend).

## **Test Environment Information**

- **Frontend URL**: https://financy-frontend.vercel.app/
- **Backend API**: https://web-production-c74f6.up.railway.app/api/v1/
- **Platform**: Vercel + Railway
- **Database**: PostgreSQL on Railway
- **Authentication**: JWT-based

---

## **Phase 1: Basic Infrastructure Testing**

### ✅ **Frontend Connectivity**
- [x] Visit https://financy-frontend.vercel.app/
- [x] Page loads without errors
- [x] CSS styles load properly (glass morphism design)
- [x] No console errors in browser DevTools
- [x] Responsive design works on mobile/desktop

### ✅ **Backend API Testing**
- [x] API root responds: https://web-production-c74f6.up.railway.app/api/v1/
- [x] Health endpoint: https://web-production-c74f6.up.railway.app/api/v1/health
- [x] No 500 errors in Railway logs
- [x] Database connection stable (no connection errors)

**Status**: ✅ **PASSED** - All infrastructure components working correctly
**Re-validated 2026-08-06**: health endpoint OK (uptime 61.8 days — process running untouched since the 2026-06-05 deploy), frontend loading, Telegram bot responding with DB-backed replies.

---

## **Phase 2: Authentication System**

### 🔐 **User Registration**
- [x] Navigate to Register page
- [x] Create new account with valid email/password — **re-verified in production 2026-08-06 via API (201 + JWT) after fixing the regressions below**
- [x] Registration succeeds without errors
- [x] Redirected to dashboard after registration (browser, 2026-08-06)
- [x] JWT token stored properly (session survives page reload)

**Regression 1 (found 2026-08-06, fixed)**: registration failed in the browser with `net::ERR_FAILED`. Commit `051bed1` (2025-12-11) hardcoded the CORS origin to `http://localhost:3000`, dropping the `FRONTEND_URL` lookup, and the 2026-06-05 deploy shipped it — every browser request from the Vercel origin was blocked by CORS. Fixed by restoring env-driven CORS origins in `backend/src/main.ts` (deployed 2026-08-06).

**Regression 2 (found 2026-08-06, root-caused)**: with CORS fixed, registration still failed. The auth service catch-all masked the real error as 401 without logging it (fixed: now logs the cause and returns 500), and the unmasked log revealed the truth: `column User.onboardingCompleted does not exist`. **The production schema has been frozen at its October 2025 state** — `TYPEORM_SYNCHRONIZE=true` was only used for the initial setup and nothing ever ran migrations in production (`start:prod` is just `node dist/main`). Every schema change since October silently never reached the database: `users.onboardingCompleted`, `transactions.dashboardCategory` (all transaction queries broken), and the `chat_contexts` table (never existed anywhere — the entity was missing from the connection entity list — so Telegram account linking could never work). Fixes: `migrationsRun` enabled on production boot, idempotency guards on all migrations, fixed a latent quoting bug in `AddDashboardCategory` (unquoted camelCase identifiers fold to lowercase in Postgres — this migration would have crash-looped the boot), new `CreateChatContexts` migration, and `ChatContext` added to the connection entities. Validated end-to-end against a local replica of the October-state production database: boot applies all 3 migrations, register returns 201, login 200, duplicate email 409, and the category backfill maps legacy data correctly. (An earlier dependency-drift hypothesis proved wrong; the Dockerfile lockfile pinning shipped for it remains as build reproducibility hardening.)

**Registration Requirements** (validated):
- Email: Valid format
- First Name: 2-50 characters
- Last Name: 2-50 characters
- Password: Minimum 8 characters with:
  - At least 1 uppercase letter
  - At least 1 lowercase letter
  - At least 1 number
  - At least 1 special character (@$!%*?&)

### 🔐 **User Login**
- [x] Navigate to Login page
- [x] Login with registered credentials
- [x] Login succeeds
- [x] Redirected to dashboard
- [x] User profile data loads correctly
- [x] Invalid credentials show a friendly error (2026-08-06)

### 🔐 **Authentication Flow**
- [x] Protected routes work (dashboard, transactions — anonymous access redirects to login)
- [x] Logout functionality works (protected routes lock again after logout)
- [x] Login redirects work properly
- [ ] JWT token refresh works (refresh endpoint not explicitly exercised yet)

**Status**: ✅ **PASSED** (2026-08-06) - Full register/login/logout/protected-routes flow verified in production; only the explicit token-refresh call remains untested

---

## **Phase 3: Core Financial Features**

### 💰 **Transaction Management**
- [x] Navigate to Transactions page
- [x] Page loads transaction list (empty initially)
- [x] "Add Transaction" button works
- [x] Create manual transaction form opens
- [x] Successfully create a test transaction (2026-08-06):
  ```
  Description: "Test grocery shopping"
  Amount: 50.00
  Category: "Food"
  Type: "Expense"
  ```
- [x] Transaction appears in list
- [x] Transaction details are correct (amount/description/date — see category regression below)
- [x] Edit transaction functionality works
- [x] Delete transaction works

**Regression 3 (found 2026-08-06)**: the two-tier category system stored the *dashboard* category key (e.g. `fooddining`) in the `category` field, while the list translations, the category-to-dashboard mapping, and the filters all expect the *detailed* key (e.g. `food`). Result: the list showed raw i18n keys (`categories.expense.fooddining.groceries`) and the dashboard bucketed every transaction under "Other". Fixed in the frontend: the form now derives the detailed category from the chosen subcategory and sends `dashboardCategory` separately; `getDashboardCategory` accepts legacy dashboard-key rows; the list falls back to the subcategory name instead of showing raw keys; the category filter now queries `dashboardCategory`. **Deployed and verified in production 2026-08-06** (translated labels and correct dashboard bucketing confirmed).

### 📊 **Dashboard Analytics**
- [x] Navigate to Dashboard
- [x] Summary cards display (income, expenses, balance)
- [x] Charts render properly (note: charts only appear above a minimum number of transactions)
- [ ] Recent transactions section shows data
- [ ] Quick actions work

**Status**: ✅ **PASSED** (2026-08-06) - CRUD, dashboard, and categorization verified in production after the category fix shipped

---

## **Phase 4: Telegram Bot Integration**

### 🤖 **Bot Setup Testing**
- [x] Find your bot: @Financy_Official_Bot
- [x] Send a message to the bot
- [x] Bot responds (unlinked accounts receive the "create an account first" onboarding message — verified 2026-08-06)
- [ ] No errors in Railway logs under "TelegramService"

**Bot Token**: stored in Railway env var `TELEGRAM_BOT_TOKEN` — never commit the value here (see Open Security Actions)
**Webhook URL**: `https://web-production-c74f6.up.railway.app/api/v1/webhooks/telegram`

### 🤖 **Transaction Processing**
- [x] Web → Telegram account linking works (first successful linking ever — `chat_contexts` created 2026-08-06)
- [x] Send simple transaction message (`"Gastei R$15 no almoço"`)
- [x] Bot processes and responds with the structured transaction
- [x] Transaction appears in web dashboard (full product loop verified 2026-08-06)
- [ ] Check Railway logs for AI processing

### 🤖 **Advanced Bot Features**
- [ ] Send voice message with transaction
- [ ] Send multiple transactions: `"Bought coffee $5, lunch $12, gas $40"`
- [ ] Test currency conversion: `"Spent €20 on groceries"`
- [ ] Test context switching (if contexts exist)

**AI Models Configured**:
- Primary: `deepseek/deepseek-chat-v3.1:free`
- Secondary: `qwen/qwen3-coder:free`
- Tertiary: `google/gemini-2.5-flash-lite`

**Status**: 🟡 **CORE PASSED** (2026-08-06) - Linking, text transaction processing, and dashboard sync verified; advanced features (voice, multi-transaction, currency conversion, context switching) still untested

---

## **Phase 5: Error Handling & Edge Cases**

### ⚠️ **Frontend Error Handling**
- [ ] Try invalid login credentials
- [ ] Submit empty forms
- [ ] Network errors (disconnect internet briefly)
- [ ] Invalid JWT token handling

### ⚠️ **Backend Error Handling**
- [ ] Invalid API requests (wrong data)
- [ ] Unauthorized access attempts
- [ ] Database constraint violations
- [ ] Rate limiting (100+ requests in 1 minute)

### ⚠️ **Telegram Error Handling**
- [ ] Send invalid transaction format
- [ ] Send very long messages
- [ ] Send unsupported file types
- [ ] Bot handles unknown commands gracefully

**Status**: ⏳ **PENDING** - Requires core features completion

---

## **Phase 6: Performance & Security**

### 🚀 **Performance Testing**
- [ ] Frontend loads in <3 seconds
- [ ] API responses in <1 second
- [ ] Large transaction lists load properly
- [ ] No memory leaks in long sessions

### 🔒 **Security Testing**
- [x] HTTPS enforced on both frontend/backend
- [x] API requires authentication for protected routes (verified 2026-08-06)
- [x] Telegram webhook rejects forged updates via `secret_token` (2026-08-06)
- [ ] No sensitive data in browser console
- [x] Environment variables not exposed
- [ ] SQL injection protection (try malicious inputs)
- [x] Message content kept out of production logs (2026-08-06) — webhook update dumps, voice transcripts, raw model output, and parsed transactions are reduced to metadata (chat id, content kinds, field presence) when `NODE_ENV=production`; full payloads still log outside production for debugging. Verified locally in both modes.

**Status**: 🟡 **PARTIAL** - HTTPS, route auth, and webhook authentication done; input-level testing pending

---

## **Phase 7: Production Monitoring**

### 📊 **Logs & Monitoring**
- [x] Railway logs show no critical errors
- [x] Vercel deployment logs clean
- [x] Database performance acceptable
- [ ] No repeated error patterns

### 📱 **Cross-Platform Testing**
- [ ] Desktop Chrome/Firefox/Safari
- [ ] Mobile iOS Safari/Chrome
- [ ] Mobile Android Chrome
- [ ] Tablet responsive design

**Status**: 🟡 **PARTIAL** - Server monitoring good, client testing pending

---

## **Phase 8: Shared Contexts (added 2026-08-06)**

### 👥 **Group management**
- [ ] Create a shared context from the Contexts page
- [ ] Invite a second account by email and copy the invitation link
- [ ] Open the link as the invited account and accept
- [ ] Both accounts see the context in their list
- [ ] Change the invited member's role, then remove them
- [ ] Leave a context as a non-owner; delete one as the owner

### 👥 **Shared money**
- [ ] Switch the Transactions page to the shared context
- [ ] Add a transaction while the context is selected; the other member sees it
- [ ] Switch back to "My finances"; the other member's transactions are gone
- [ ] A transaction added in personal view never appears in the shared view

**Status**: ⏳ **PENDING** - Covered by automated e2e tests; needs a manual pass in production

---

## **Priority Testing Order**

### 🔥 **Critical (Test First)**
1. ✅ Frontend loads
2. ✅ Backend API responds
3. ✅ User registration
4. ✅ User login (full auth flow verified 2026-08-06)
5. ✅ Basic transaction creation

### 🔶 **Important (Test Second)**
6. ✅ Telegram bot basic functionality
7. ✅ Dashboard displays data
8. ✅ Transaction management

### 🔵 **Nice to Have (Test Last)**
9. ⏳ Advanced bot features
10. ⏳ Performance testing
11. ⏳ Edge case handling

---

## **Known Issues & Fixes**

### 🚨 **Open Security Actions**
1. **Bot token exposure (found 2026-08-06)**: the Telegram bot token was committed to this file while the repository is public. The value is redacted from the doc now, but it persists in git history — **rotate the token via @BotFather**, update `TELEGRAM_BOT_TOKEN` in Railway, and let the service restart (the webhook re-registers automatically on boot via `TelegramService.onModuleInit`).
2. ~~**Webhook accepts unauthenticated POSTs**~~ — **fixed 2026-08-06**: `setupWebhook()` now registers a `secret_token` and the controller rejects any update whose `X-Telegram-Bot-Api-Secret-Token` header does not match (constant-time comparison). The secret defaults to a value derived from the bot token, so no new environment variable is required; override it with `TELEGRAM_WEBHOOK_SECRET` if desired. Verified locally: forged POSTs with no header, a wrong header, and a near-miss header all return 401 without reaching the update processor, while the correct header is accepted.

### ✅ **Resolved Issues**
1. **Database Connection**: Fixed DATABASE_URL configuration in TypeORM
2. **Docker Build**: Corrected path to `dist/src/main.js`
3. **Table Creation**: Added `TYPEORM_SYNCHRONIZE=true` for initial setup
4. **CORS Configuration**: Properly configured for Vercel ↔ Railway communication *(regressed by `051bed1` on 2025-12-11 — see the Phase 2 regression note; fix pending deploy)*

### ⚠️ **Troubleshooting Guide**

#### **If Registration Fails**
1. Check Railway logs for backend errors
2. Verify password meets complexity requirements
3. Ensure database tables exist (check Railway database tab)
4. Verify CORS configuration

#### **If API Calls Fail**
1. Check browser network tab for CORS errors
2. Verify backend is responding: `curl https://web-production-c74f6.up.railway.app/api/v1/health`
3. Check JWT token validity
4. Verify environment variables in Railway

#### **If Telegram Bot Fails**
1. Verify webhook URL is accessible
2. Check bot token validity
3. Ensure OpenRouter API key is working
4. Check Railway logs for TelegramService errors

---

## **Environment Variables Checklist**

### **Railway Backend Variables**
- [x] `NODE_ENV=production`
- [x] `PORT=3000`
- [x] `FRONTEND_URL=https://financy-frontend.vercel.app`
- [x] `JWT_SECRET=[secure-random-string]`
- [x] `JWT_EXPIRES_IN=7d`
- [x] `DATABASE_URL=[railway-provided]`
- [x] `TELEGRAM_BOT_TOKEN=[configured in Railway — must be rotated after the 2026-08 public exposure, see Open Security Actions]`
- [x] `TELEGRAM_WEBHOOK_URL=https://web-production-c74f6.up.railway.app/api/v1/webhooks/telegram`
- [x] `OPENROUTER_API_KEY=[configured]`
- [x] `PRIMARY_MODEL=deepseek/deepseek-chat-v3.1:free`
- [x] `SECONDARY_MODEL=qwen/qwen3-coder:free`
- [x] `TERTIARY_MODEL=google/gemini-2.5-flash-lite`

### **Vercel Frontend Variables**
- [x] `REACT_APP_API_URL=https://web-production-c74f6.up.railway.app/api/v1`
- [x] `REACT_APP_ENVIRONMENT=production`
- [x] `REACT_APP_APP_NAME=Financy`
- [x] `REACT_APP_VERSION=1.0.0`

---

## **Success Metrics**

### **Deployment Success** ✅
- [x] Frontend accessible via Vercel
- [x] Backend API responding via Railway
- [x] Database connected and operational
- [x] User registration working

### **Application Success** ✅ (achieved 2026-08-06)
- [x] Complete user authentication flow
- [x] Transaction CRUD operations
- [x] Telegram bot processing transactions
- [x] Dashboard displaying financial data

### **Production Ready** (Target)
- [ ] All critical tests passing
- [ ] No security vulnerabilities
- [ ] Performance within acceptable limits
- [ ] Error handling robust

---

**Last Updated**: August 6, 2026  
**Current Status**: Core product loop fully working in production as of 2026-08-06 — auth, transaction CRUD, dashboard, categorization, Telegram linking, and bot → dashboard sync all verified  
**Next Priority**: Phase 5-7 — advanced bot features (voice, multi-transaction, currency), error handling & security (incl. webhook secret_token), performance, cross-platform