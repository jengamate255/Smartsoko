CREATE OR REPLACE FUNCTION debit_wallet(
  p_user_id UUID, p_amount INTEGER, p_order_id UUID DEFAULT NULL,
  p_type TEXT DEFAULT 'debit', p_description TEXT DEFAULT '',
  p_metadata JSONB DEFAULT NULL
) RETURNS JSONB LANGUAGE plpgsql SECURITY DEFINER AS $BODY$
DECLARE
  v_wallet wallets%ROWTYPE;
  v_balance_before INTEGER;
  v_balance_after INTEGER;
BEGIN
  SELECT * INTO v_wallet FROM wallets WHERE user_id = p_user_id FOR UPDATE;
  IF NOT FOUND THEN RAISE EXCEPTION 'Wallet not found for user %', p_user_id; END IF;
  IF v_wallet.balance < p_amount THEN RAISE EXCEPTION 'Insufficient balance: have %, need %', v_wallet.balance, p_amount; END IF;
  v_balance_before := v_wallet.balance;
  v_balance_after := v_wallet.balance - p_amount;
  UPDATE wallets SET balance = v_balance_after, total_withdrawn = total_withdrawn + p_amount, updated_at = NOW() WHERE user_id = p_user_id;
  INSERT INTO transactions (user_id, order_id, type, amount, balance_before, balance_after, description, metadata)
  VALUES (p_user_id, p_order_id, p_type, p_amount, v_balance_before, v_balance_after, p_description, p_metadata);
  RETURN jsonb_build_object('success', true, 'user_id', p_user_id, 'amount', p_amount, 'balance_before', v_balance_before, 'balance_after', v_balance_after);
END;
$BODY$;
