# Escrow and manual payouts

Verified PesaPal payments are held until delivery. Delivery atomically credits
the merchant wallet (`orders.restaurant_id`) and driver wallet (text
`orders.driver_id`), records both ledger movements, and queues one pending
`vendor_payouts` row per order. A missing driver account blocks release when
there is a delivery fee; the reconciler retries after the assignment is fixed.

`wallets.balance` is money owed, not proof that a bank/mobile-money transfer
has occurred. A queued payout represents that same liability, not additional
money. The customer wallet still uses the separate `payments` ledger.

## Record a manual transfer

1. The merchant opens **Finance**, checks real wallet earnings/history, and saves
   their mobile-money or bank destination for review.
2. Read `GET /api/admin/payout-accounts` using an authenticated admin account.
   Independently verify the registered account holder and destination, then call
   `POST /api/admin/payout-accounts/<merchant-id>/verify` with
   `{"revision":1,"confirmed":true}` using the actual reviewed revision.
   Changing destination details invalidates approval and increments the revision.
3. Read `GET /api/admin/payouts` using the same authenticated admin account.
4. Verify the order, payee ownership, destination and amount independently.
   `vendor_id` can be null when no `vendors.restaurant_id` mapping exists;
   `walletId` and `orderId` identify the liability, not a verified destination.
5. Transfer the funds outside SmartSoko.
6. Record that transfer with the same admin session:

    ```http
    POST /api/admin/payouts/<payout-id>/complete
    Content-Type: application/json
    Authorization: Bearer <admin-session-token>

    {"merchantId":"seller-uuid","revision":1,"transactionRef":"actual-bank-or-mobile-money-reference"}
    ```

This endpoint **does not send funds**. It marks the payout paid and atomically
debits its wallet, recording `total_withdrawn` and a ledger movement. Duplicate
completion is refused. Missing references and insufficient balances are refused.
If details change after a transfer, a revision conflict requires manual
reconciliation. Do not repeat the money transfer to retry the API call.
Do not mark rows paid by editing the table directly: that bypasses wallet debit.
Legacy requests without credited wallet balances require review, not backfilling
money to force them through. The merchant dashboard now reads real wallet
balances; held earnings come from escrow, not delivered-COD revenue estimates.
Queued amounts are the same liability already included in the released wallet
balance. No second withdrawal request is needed; `/api/merchant/payout` refuses
new requests because releases already create payout instructions.

Restaurant wallets are included only through the owner's existing vendor link.
If that owner has multiple stores, the restaurant mapping is ambiguous and
finance fails closed for admin review rather than exposing another store's money.

## Unpaid orders

The five-minute reconciler cancels open unpaid PesaPal orders after two hours
(`PESAPAL_UNPAID_TIMEOUT_MS`; `0` disables cancellation). Linked attempts are
checked with PesaPal first. Lookup failures, unknown statuses, missing tracking
IDs and multiple attempts require review rather than guessing nonpayment.
Orders with no payment ledger are cancelled after the timeout.

A payment arriving after cancellation is atomically credited back to the
customer wallet, less the existing non-refundable fee. A reversal after release
is not automatically refunded: it remains a manual dispute/recovery case.

## Verification

- `npm.cmd test` covers retry/cancellation and admin endpoint authorization.
- `supabase/tests/escrow_atomicity.sql` exercises database money movements inside
  a transaction that rolls back all fixtures.
- `supabase/tests/merchant_payout_accounts.sql` checks verification, revision
  changes, ownership and payout debit inside a rollback-only transaction.
- `node --test tests/merchant-os/merchant-finance-ui.test.cjs` runs an isolated
  browser regression. It needs Puppeteer's Chrome or `PUPPETEER_EXECUTABLE_PATH`
  pointing to an installed Chrome executable; it never touches live payments.
- New finance RPCs are service-role-only; the wallet ledger has RLS and no
  client write policy. Existing unrelated legacy RPC/security advisories are
  outside this migration and still need a separate review.
  The [RLS-without-policies advisory](https://supabase.com/docs/guides/database/database-linter?lint=0008_rls_enabled_no_policy)
  on `merchant_payout_accounts` is intentional: all reads/writes go through
  authenticated server routes, and client table privileges are revoked.
  In particular, audit the older [public SECURITY DEFINER RPCs](https://supabase.com/docs/guides/database/database-linter?lint=0028_anon_security_definer_function_executable)
  and their [mutable search paths](https://supabase.com/docs/guides/database/database-linter?lint=0011_function_search_path_mutable).
