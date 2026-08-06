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
- [ ] Create new account with valid email/password — **broken in production, regression found 2026-08-06 (see below)**
- [ ] Registration succeeds without errors
- [ ] Redirected to dashboard after registration
- [ ] JWT token stored properly

**Regression (found 2026-08-06)**: registration fails in the browser with `net::ERR_FAILED`. Commit `051bed1` (2025-12-11) hardcoded the CORS origin to `http://localhost:3000`, dropping the `FRONTEND_URL` lookup, and the 2026-06-05 deploy shipped it — every browser request from the Vercel origin is blocked by CORS (the October pass predates the regression). Fix restores env-driven CORS origins in `backend/src/main.ts`; pending merge to main + Railway redeploy.

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
- [ ] Navigate to Login page
- [ ] Login with registered credentials
- [ ] Login succeeds
- [ ] Redirected to dashboard
- [ ] User profile data loads correctly

### 🔐 **Authentication Flow**
- [ ] Protected routes work (dashboard, transactions)
- [ ] Logout functionality works
- [ ] Login redirects work properly
- [ ] JWT token refresh works

**Status**: 🔴 **BLOCKED** - CORS regression blocks all browser API calls (registration and login); fix ready, pending deploy

---

## **Phase 3: Core Financial Features**

### 💰 **Transaction Management**
- [ ] Navigate to Transactions page
- [ ] Page loads transaction list (empty initially)
- [ ] "Add Transaction" button works
- [ ] Create manual transaction form opens
- [ ] Successfully create a test transaction:
  ```
  Description: "Test grocery shopping"
  Amount: 50.00
  Category: "Food"
  Type: "Expense"
  ```
- [ ] Transaction appears in list
- [ ] Transaction details are correct
- [ ] Edit transaction functionality works
- [ ] Delete transaction works

### 📊 **Dashboard Analytics**
- [ ] Navigate to Dashboard
- [ ] Summary cards display (income, expenses, balance)
- [ ] Charts render properly
- [ ] Recent transactions section shows data
- [ ] Quick actions work

**Status**: ⏳ **PENDING** - Requires authentication completion first

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
- [ ] Send simple transaction message: `"Spent $15 on lunch at McDonald's"`
- [ ] Bot processes and responds
- [ ] Transaction appears in web dashboard
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

**Status**: ⏳ **PENDING** - Backend ready, requires user setup

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
- [ ] API requires authentication for protected routes
- [ ] No sensitive data in browser console
- [x] Environment variables not exposed
- [ ] SQL injection protection (try malicious inputs)

**Status**: 🟡 **PARTIAL** - HTTPS working, auth testing pending

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

## **Priority Testing Order**

### 🔥 **Critical (Test First)**
1. ✅ Frontend loads
2. ✅ Backend API responds
3. ✅ User registration
4. ⏳ User login
5. ⏳ Basic transaction creation

### 🔶 **Important (Test Second)**
6. ⏳ Telegram bot basic functionality
7. ⏳ Dashboard displays data
8. ⏳ Transaction management

### 🔵 **Nice to Have (Test Last)**
9. ⏳ Advanced bot features
10. ⏳ Performance testing
11. ⏳ Edge case handling

---

## **Known Issues & Fixes**

### 🚨 **Open Security Actions**
1. **Bot token exposure (found 2026-08-06)**: the Telegram bot token was committed to this file while the repository is public. The value is redacted from the doc now, but it persists in git history — **rotate the token via @BotFather**, update `TELEGRAM_BOT_TOKEN` in Railway, and let the service restart (the webhook re-registers automatically on boot via `TelegramService.onModuleInit`).
2. **Webhook accepts unauthenticated POSTs**: `setupWebhook()` does not set Telegram's `secret_token`, so `/api/v1/webhooks/telegram` cannot distinguish genuine Telegram updates from forged ones. Add `secret_token` to the `setWebhook` call and validate the `X-Telegram-Bot-Api-Secret-Token` header in the controller (Phase 6 item).

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

### **Application Success** (Target)
- [ ] Complete user authentication flow
- [ ] Transaction CRUD operations
- [ ] Telegram bot processing transactions
- [ ] Dashboard displaying financial data

### **Production Ready** (Target)
- [ ] All critical tests passing
- [ ] No security vulnerabilities
- [ ] Performance within acceptable limits
- [ ] Error handling robust

---

**Last Updated**: August 6, 2026  
**Current Status**: Phase 2 blocked by CORS regression (fix ready, pending deploy); infrastructure re-validated 2026-08-06 after 2 months idle  
**Next Priority**: Rotate the exposed Telegram bot token, merge + deploy the CORS fix, then complete the authentication flow