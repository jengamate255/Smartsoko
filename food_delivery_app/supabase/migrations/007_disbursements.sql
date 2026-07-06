CREATE TABLE IF NOT EXISTS disbursements (
  id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
  user_id UUID NOT NULL REFERENCES profiles(id),
  amount INTEGER NOT NULL CHECK (amount > 0),
  phone_number TEXT NOT NULL,
  provider TEXT DEFAULT 'pesapal',
  provider_ref TEXT,
  tracking_id TEXT,
  status TEXT NOT NULL DEFAULT 'pending'
    CHECK (status IN ('pending', 'processing', 'completed', 'failed', 'cancelled')),
  failure_reason TEXT,
  wallet_debited BOOLEAN DEFAULT FALSE,
  metadata JSONB,
  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  processed_at TIMESTAMP WITH TIME ZONE,
  updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

CREATE INDEX IF NOT EXISTS idx_disbursements_user_id ON disbursements(user_id);
CREATE INDEX IF NOT EXISTS idx_disbursements_status ON disbursements(status);
CREATE INDEX IF NOT EXISTS idx_disbursements_tracking_id ON disbursements(tracking_id);

ALTER TABLE disbursements ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Users can view own disbursements"
  ON disbursements FOR SELECT
  USING (user_id = auth.uid());

CREATE POLICY "Service role can manage disbursements"
  ON disbursements FOR ALL
  USING (auth.role() = 'service_role');

CREATE OR REPLACE FUNCTION request_withdrawal(
  p_user_id UUID,
  p_amount INTEGER,
  p_phone_number TEXT DEFAULT NULL
)
RETURNS JSONB
LANGUAGE plpgsql SECURITY DEFINER
AS $$
DECLARE
  v_wallet wallets%ROWTYPE;
  v_phone TEXT;
  v_disbursement_id UUID;
  v_disbursement_ref TEXT;
BEGIN
  SELECT * INTO v_wallet FROM wallets WHERE user_id = p_user_id FOR UPDATE;
  IF NOT FOUND THEN
    RETURN jsonb_build_object('success', false, 'error', 'Wallet not found');
  END IF;

  IF v_wallet.balance < p_amount THEN
    RETURN jsonb_build_object('success', false, 'error', 'Insufficient balance', 'balance', v_wallet.balance);
  END IF;

  v_phone := COALESCE(p_phone_number, (SELECT phone FROM profiles WHERE id = p_user_id));
  IF v_phone IS NULL OR v_phone = '' THEN
    RETURN jsonb_build_object('success', false, 'error', 'Phone number required for payout');
  END IF;

  v_disbursement_ref := 'DSB-' || upper(substr(md5(random()::text), 1, 12));

  UPDATE wallets
  SET balance = balance - p_amount,
      total_withdrawn = total_withdrawn + p_amount,
      updated_at = NOW()
  WHERE user_id = p_user_id;

  INSERT INTO transactions (user_id, type, amount, balance_before, balance_after, reference, description, status)
  VALUES (
    p_user_id, 'debit', p_amount,
    v_wallet.balance, v_wallet.balance - p_amount,
    v_disbursement_ref,
    'Withdrawal request - sending via PesaPal',
    'pending'
  );

  INSERT INTO disbursements (user_id, amount, phone_number, provider, metadata, wallet_debited)
  VALUES (p_user_id, p_amount, v_phone, 'pesapal',
    jsonb_build_object('reference', v_disbursement_ref, 'wallet_balance_before', v_wallet.balance, 'wallet_balance_after', v_wallet.balance - p_amount),
    TRUE
  )
  RETURNING id INTO v_disbursement_id;

  RETURN jsonb_build_object(
    'success', true,
    'disbursement_id', v_disbursement_id,
    'reference', v_disbursement_ref,
    'amount', p_amount,
    'phone_number', v_phone,
    'balance_before', v_wallet.balance,
    'balance_after', v_wallet.balance - p_amount
  );
END;
$$;

CREATE OR REPLACE FUNCTION complete_disbursement(
  p_disbursement_id UUID,
  p_provider_ref TEXT DEFAULT NULL,
  p_tracking_id TEXT DEFAULT NULL,
  p_status TEXT DEFAULT 'completed'
)
RETURNS JSONB
LANGUAGE plpgsql SECURITY DEFINER
AS $$
DECLARE
  v_disbursement disbursements%ROWTYPE;
BEGIN
  SELECT * INTO v_disbursement FROM disbursements WHERE id = p_disbursement_id;
  IF NOT FOUND THEN
    RETURN jsonb_build_object('success', false, 'error', 'Disbursement not found');
  END IF;

  UPDATE disbursements
  SET status = p_status,
      provider_ref = COALESCE(p_provider_ref, provider_ref),
      tracking_id = COALESCE(p_tracking_id, tracking_id),
      processed_at = CASE WHEN p_status IN ('completed', 'failed') THEN NOW() ELSE processed_at END,
      updated_at = NOW()
  WHERE id = p_disbursement_id;

  IF p_status = 'completed' THEN
    UPDATE transactions
    SET status = 'completed'
    WHERE user_id = v_disbursement.user_id
      AND type = 'debit'
      AND amount = v_disbursement.amount
      AND status = 'pending'
      AND reference = (v_disbursement.metadata->>'reference');
  ELSIF p_status = 'failed' THEN
    UPDATE wallets
    SET balance = balance + v_disbursement.amount,
        total_withdrawn = GREATEST(total_withdrawn - v_disbursement.amount, 0),
        updated_at = NOW()
    WHERE user_id = v_disbursement.user_id;

    UPDATE transactions
    SET status = 'failed'
    WHERE user_id = v_disbursement.user_id
      AND type = 'debit'
      AND amount = v_disbursement.amount
      AND status = 'pending'
      AND reference = (v_disbursement.metadata->>'reference');

    INSERT INTO transactions (user_id, type, amount, description, reference, status)
    VALUES (
      v_disbursement.user_id, 'refund', v_disbursement.amount,
      'Reversal - PesaPal payout failed: ' || COALESCE(v_disbursement.failure_reason, 'Unknown error'),
      'REV-' || v_disbursement.id,
      'completed'
    );
  END IF;

  RETURN jsonb_build_object('success', true, 'disbursement_id', p_disbursement_id, 'status', p_status);
END;
$$;

CREATE OR REPLACE FUNCTION get_disbursements(
  p_user_id UUID,
  p_limit INT DEFAULT 20,
  p_offset INT DEFAULT 0
)
RETURNS JSONB
LANGUAGE plpgsql SECURITY DEFINER
AS $$
DECLARE
  v_result JSONB;
BEGIN
  SELECT jsonb_build_object(
    'disbursements', COALESCE(jsonb_agg(
      jsonb_build_object(
        'id', d.id,
        'amount', d.amount,
        'phone_number', d.phone_number,
        'provider', d.provider,
        'status', d.status,
        'failure_reason', d.failure_reason,
        'created_at', d.created_at,
        'processed_at', d.processed_at
      ) ORDER BY d.created_at DESC
    ), '[]'::jsonb),
    'total', (SELECT COUNT(*) FROM disbursements WHERE user_id = p_user_id)
  ) INTO v_result
  FROM (
    SELECT * FROM disbursements
    WHERE user_id = p_user_id
    ORDER BY created_at DESC
    LIMIT p_limit OFFSET p_offset
  ) d;

  RETURN v_result;
END;
$$;
