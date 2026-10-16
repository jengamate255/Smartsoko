-- ============================================
-- MIGRATION: nTZS Users Mapping
-- ============================================
-- Stores mapping between SmartSoko profiles and nTZS WaaS users
-- Allows nTZS wallet provisioning, deposits, withdrawals, spends, transfers

CREATE TABLE IF NOT EXISTS ntzs_users (
  id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
  profile_id UUID NOT NULL REFERENCES profiles(id),
  ntzs_user_id UUID NOT NULL UNIQUE,
  wallet_address TEXT,
  kyc_status TEXT DEFAULT 'pending_review'
    CHECK (kyc_status IN ('pending_review', 'approved', 'rejected', 'none')),
  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  UNIQUE(profile_id)
);

-- Index for looking up by nTZS user ID
CREATE INDEX IF NOT EXISTS idx_ntzs_users_ntzs_user_id ON ntzs_users(ntzs_user_id);
CREATE INDEX IF NOT EXISTS idx_ntzs_users_profile_id ON ntzs_users(profile_id);
CREATE INDEX IF NOT EXISTS idx_ntzs_users_kyc_status ON ntzs_users(kyc_status);

-- RLS
ALTER TABLE ntzs_users ENABLE ROW LEVEL SECURITY;

-- Users can view their own nTZS mapping
CREATE POLICY "Users view own nTZS mapping" ON ntzs_users FOR SELECT
  USING (auth.uid() = profile_id);

-- Service role manages all
CREATE POLICY "Service role manages ntzs_users" ON ntzs_users FOR ALL
  USING (auth.role() = 'service_role');

-- ============================================
-- Helper function: Get or create nTZS user mapping
-- ============================================
CREATE OR REPLACE FUNCTION get_or_create_ntzs_user(
  p_profile_id UUID,
  p_ntzs_user_id UUID,
  p_wallet_address TEXT DEFAULT NULL,
  p_kyc_status TEXT DEFAULT 'pending_review'
) RETURNS UUID AS $$
DECLARE
  v_id UUID;
BEGIN
  -- Try to get existing
  SELECT id INTO v_id FROM ntzs_users WHERE profile_id = p_profile_id;
  
  IF v_id IS NOT NULL THEN
    -- Update if needed
    UPDATE ntzs_users SET
      ntzs_user_id = COALESCE(p_ntzs_user_id, ntzs_user_id),
      wallet_address = COALESCE(p_wallet_address, wallet_address),
      kyc_status = COALESCE(p_kyc_status, kyc_status),
      updated_at = NOW()
    WHERE profile_id = p_profile_id;
    RETURN v_id;
  END IF;
  
  -- Create new
  INSERT INTO ntzs_users (profile_id, ntzs_user_id, wallet_address, kyc_status)
  VALUES (p_profile_id, p_ntzs_user_id, p_wallet_address, p_kyc_status)
  RETURNING id INTO v_id;
  
  RETURN v_id;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- ============================================
-- Helper function: Update nTZS user KYC status
-- ============================================
CREATE OR REPLACE FUNCTION update_ntzs_user_kyc(
  p_profile_id UUID,
  p_kyc_status TEXT,
  p_wallet_address TEXT DEFAULT NULL
) RETURNS VOID AS $$
BEGIN
  UPDATE ntzs_users SET
    kyc_status = p_kyc_status,
    wallet_address = COALESCE(p_wallet_address, wallet_address),
    updated_at = NOW()
  WHERE profile_id = p_profile_id;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;