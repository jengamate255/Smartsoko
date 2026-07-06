# ✅ M-Pesa Deployment Checklist

Use this checklist to track your deployment progress.

---

## 📋 Pre-Deployment (Already Done ✅)

- [x] Supabase Edge Functions created
- [x] Database migration prepared
- [x] M-Pesa credentials configured
- [x] Documentation created
- [x] Supabase CLI installed
- [x] Project configuration ready

---

## 🚀 Deployment Steps (Your Turn!)

### Step 1: Set Environment Secrets (5 min)

Go to: https://supabase.com/dashboard/project/vonkqyiczeqhuqhahsxm/settings/functions

- [ ] Add secret: `MPESA_API_KEY`
- [ ] Add secret: `MPESA_PUBLIC_KEY`
- [ ] Add secret: `MPESA_SERVICE_PROVIDER_CODE`
- [ ] Add secret: `MPESA_CALLBACK_URL`
- [ ] Add secret: `MPESA_ENVIRONMENT`
- [ ] Verify all 5 secrets are saved

**Reference:** See `QUICK_DEPLOY.md` for exact values

---

### Step 2: Run Database Migration (2 min)

Go to: https://supabase.com/dashboard/project/vonkqyiczeqhuqhahsxm/sql/new

- [ ] Open file: `supabase/migrations/20250124_create_payment_transactions.sql`
- [ ] Copy entire SQL content
- [ ] Paste into SQL Editor
- [ ] Click "Run"
- [ ] Verify success message
- [ ] Check `payment_transactions` table exists

---

### Step 3: Deploy mpesa-payment Function (3 min)

Go to: https://supabase.com/dashboard/project/vonkqyiczeqhuqhahsxm/functions

- [ ] Click "Create a new function"
- [ ] Name: `mpesa-payment`
- [ ] Copy code from: `supabase/functions/mpesa-payment/index.ts`
- [ ] Paste into editor
- [ ] Click "Deploy function"
- [ ] Wait for deployment to complete
- [ ] Verify status shows "Active"

---

### Step 4: Deploy mpesa-callback Function (3 min)

- [ ] Click "Create a new function" again
- [ ] Name: `mpesa-callback`
- [ ] Copy code from: `supabase/functions/mpesa-callback/index.ts`
- [ ] Paste into editor
- [ ] Click "Deploy function"
- [ ] Wait for deployment to complete
- [ ] Verify status shows "Active"

---

### Step 5: Verify Deployment (2 min)

- [ ] Both functions show "Active" status
- [ ] Function URLs are accessible:
  - [ ] `https://vonkqyiczeqhuqhahsxm.supabase.co/functions/v1/mpesa-payment`
  - [ ] `https://vonkqyiczeqhuqhahsxm.supabase.co/functions/v1/mpesa-callback`
- [ ] No errors in function logs

---

### Step 6: Test Functions (5 min)

- [ ] Go to mpesa-payment function
- [ ] Click "Invoke" tab
- [ ] Use test payload:
  ```json
  {
    "amount": 100,
    "phoneNumber": "84123456789",
    "orderId": "test-order-123",
    "customerId": "test-customer-456"
  }
  ```
- [ ] Click "Invoke function"
- [ ] Verify success response
- [ ] Check function logs for any errors
- [ ] Verify transaction created in `payment_transactions` table

---

## 📱 Mobile App Integration

### Step 7: Add Payment Function to App (10 min)

- [ ] Open payment screen/component
- [ ] Import Supabase client
- [ ] Add `processPayment` function (see DEPLOYMENT_SUMMARY.md)
- [ ] Add UI for phone number input
- [ ] Add payment button
- [ ] Add loading state
- [ ] Add success/error messages
- [ ] Test in development

---

### Step 8: End-to-End Testing (15 min)

- [ ] Create test order in app
- [ ] Enter test phone number (84123456789)
- [ ] Initiate payment
- [ ] Verify payment request sent
- [ ] Check transaction in database
- [ ] Verify order status updated
- [ ] Test error cases (invalid phone, insufficient funds, etc.)
- [ ] Test callback handling

---

## 🔍 Monitoring Setup

### Step 9: Set Up Monitoring (5 min)

- [ ] Bookmark function logs page
- [ ] Bookmark payment_transactions table
- [ ] Create SQL query for recent payments
- [ ] Test viewing logs
- [ ] Document any issues found

---

## 📊 Production Readiness

### Step 10: Pre-Production Checklist (10 min)

- [ ] All tests passing
- [ ] No errors in logs
- [ ] Documentation reviewed
- [ ] Team trained on monitoring
- [ ] Rollback plan documented
- [ ] Support contacts ready

---

### Step 11: Production Migration (When Ready)

- [ ] Get production M-Pesa credentials
- [ ] Update `MPESA_API_KEY` secret
- [ ] Update `MPESA_PUBLIC_KEY` secret
- [ ] Update `MPESA_SERVICE_PROVIDER_CODE` secret
- [ ] Change `MPESA_ENVIRONMENT` to `production`
- [ ] Update callback URL if needed
- [ ] Test with small real transaction
- [ ] Monitor closely for 24 hours
- [ ] Document any issues

---

## 🎯 Success Criteria

Mark complete when ALL of these are true:

- [ ] Both functions deployed and active
- [ ] Database migration successful
- [ ] Test payment completes successfully
- [ ] Transaction recorded in database
- [ ] Order status updates correctly
- [ ] Callback handling works
- [ ] No errors in logs
- [ ] Mobile app integration complete
- [ ] End-to-end testing passed
- [ ] Team trained and ready

---

## 📝 Notes & Issues

Use this space to track any issues or notes during deployment:

```
Date: ___________
Issue: 
Resolution:

Date: ___________
Issue:
Resolution:

Date: ___________
Issue:
Resolution:
```

---

## ⏱️ Time Tracking

| Step | Estimated | Actual | Status |
|------|-----------|--------|--------|
| Set Secrets | 5 min | ___ min | ⬜ |
| Database Migration | 2 min | ___ min | ⬜ |
| Deploy Payment Function | 3 min | ___ min | ⬜ |
| Deploy Callback Function | 3 min | ___ min | ⬜ |
| Verify Deployment | 2 min | ___ min | ⬜ |
| Test Functions | 5 min | ___ min | ⬜ |
| Mobile Integration | 10 min | ___ min | ⬜ |
| End-to-End Testing | 15 min | ___ min | ⬜ |
| Monitoring Setup | 5 min | ___ min | ⬜ |
| **TOTAL** | **50 min** | **___ min** | ⬜ |

---

## 🎉 Completion

- [ ] All steps completed
- [ ] All tests passing
- [ ] Documentation updated
- [ ] Team notified
- [ ] Deployment successful! 🚀

**Completed By:** _______________
**Date:** _______________
**Time:** _______________

---

## 📞 Quick Reference

**Project Dashboard:** https://supabase.com/dashboard/project/vonkqyiczeqhuqhahsxm

**Function URLs:**
- Payment: `https://vonkqyiczeqhuqhahsxm.supabase.co/functions/v1/mpesa-payment`
- Callback: `https://vonkqyiczeqhuqhahsxm.supabase.co/functions/v1/mpesa-callback`

**Documentation:**
- Full Guide: `DEPLOYMENT_INSTRUCTIONS.md`
- Quick Reference: `QUICK_DEPLOY.md`
- Summary: `DEPLOYMENT_SUMMARY.md`

**Support:**
- Supabase Docs: https://supabase.com/docs/guides/functions
- M-Pesa Docs: https://developer.mpesa.vm.co.mz/
