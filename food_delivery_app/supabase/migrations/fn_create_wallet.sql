CREATE OR REPLACE FUNCTION create_wallet(p_user_id UUID, p_role TEXT)
RETURNS JSONB LANGUAGE plpgsql SECURITY DEFINER AS $BODY$
DECLARE v_wallet wallets%ROWTYPE;
BEGIN
  INSERT INTO wallets (user_id, role) VALUES (p_user_id, p_role)
  ON CONFLICT (user_id) DO NOTHING RETURNING * INTO v_wallet;
  IF v_wallet.id IS NULL THEN
    SELECT * INTO v_wallet FROM wallets WHERE user_id = p_user_id;
    RETURN jsonb_build_object('success', true, 'wallet', to_jsonb(v_wallet), 'existing', true);
  END IF;
  RETURN jsonb_build_object('success', true, 'wallet', to_jsonb(v_wallet), 'existing', false);
END;
$BODY$;
