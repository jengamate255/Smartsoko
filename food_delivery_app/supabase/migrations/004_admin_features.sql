-- ============================================
-- MIGRATION: Admin Features Tables & Functions
-- ============================================

-- 1. ADMIN AUDIT LOGS
CREATE TABLE IF NOT EXISTS admin_audit_logs (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    admin_id UUID NOT NULL REFERENCES auth.users(id),
    admin_email TEXT NOT NULL,
    action TEXT NOT NULL,
    resource_type TEXT NOT NULL,
    resource_id TEXT,
    old_data JSONB,
    new_data JSONB,
    ip_address INET,
    user_agent TEXT,
    created_at TIMESTAMPTZ DEFAULT NOW()
);

CREATE INDEX idx_admin_audit_logs_admin_id ON admin_audit_logs(admin_id);
CREATE INDEX idx_admin_audit_logs_resource ON admin_audit_logs(resource_type, resource_id);
CREATE INDEX idx_admin_audit_logs_created_at ON admin_audit_logs(created_at DESC);

ALTER TABLE admin_audit_logs ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Admins can view audit logs" ON admin_audit_logs
    FOR SELECT USING (
        EXISTS (
            SELECT 1 FROM profiles 
            WHERE profiles.id = auth.uid() 
            AND profiles.role IN ('admin', 'super_admin')
        )
    );

CREATE POLICY "Admins can insert audit logs" ON admin_audit_logs
    FOR INSERT WITH CHECK (
        EXISTS (
            SELECT 1 FROM profiles 
            WHERE profiles.id = auth.uid() 
            AND profiles.role IN ('admin', 'super_admin')
        )
    );

-- 2. ADMIN NOTIFICATIONS (Broadcast system)
CREATE TABLE IF NOT EXISTS admin_notifications (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    title TEXT NOT NULL,
    message TEXT NOT NULL,
    type TEXT NOT NULL DEFAULT 'info' CHECK (type IN ('info', 'warning', 'error', 'success', 'promo')),
    target_audience TEXT NOT NULL DEFAULT 'all' CHECK (target_audience IN ('all', 'customers', 'merchants', 'drivers', 'admins')),
    target_user_ids UUID[],
    channels TEXT[] NOT NULL DEFAULT ARRAY['in_app'] CHECK (channels <@ ARRAY['in_app', 'push', 'email', 'sms']),
    priority TEXT NOT NULL DEFAULT 'normal' CHECK (priority IN ('low', 'normal', 'high', 'urgent')),
    scheduled_at TIMESTAMPTZ,
    sent_at TIMESTAMPTZ,
    status TEXT NOT NULL DEFAULT 'draft' CHECK (status IN ('draft', 'scheduled', 'sending', 'sent', 'failed')),
    sent_count INTEGER DEFAULT 0,
    failed_count INTEGER DEFAULT 0,
    metadata JSONB DEFAULT '{}',
    created_by UUID REFERENCES auth.users(id),
    created_at TIMESTAMPTZ DEFAULT NOW(),
    updated_at TIMESTAMPTZ DEFAULT NOW()
);

CREATE INDEX idx_admin_notifications_status ON admin_notifications(status);
CREATE INDEX idx_admin_notifications_audience ON admin_notifications(target_audience);
CREATE INDEX idx_admin_notifications_scheduled ON admin_notifications(scheduled_at);

ALTER TABLE admin_notifications ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Admins can manage notifications" ON admin_notifications
    FOR ALL USING (
        EXISTS (
            SELECT 1 FROM profiles 
            WHERE profiles.id = auth.uid() 
            AND profiles.role IN ('admin', 'super_admin')
        )
    );

-- 3. WEBHOOKS CONFIGURATION
CREATE TABLE IF NOT EXISTS admin_webhooks (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    name TEXT NOT NULL,
    url TEXT NOT NULL,
    events TEXT[] NOT NULL DEFAULT ARRAY['*'],
    secret TEXT NOT NULL,
    is_active BOOLEAN DEFAULT TRUE,
    retry_count INTEGER DEFAULT 3,
    timeout_ms INTEGER DEFAULT 30000,
    headers JSONB DEFAULT '{}',
    last_triggered_at TIMESTAMPTZ,
    last_status TEXT,
    last_response JSONB,
    failure_count INTEGER DEFAULT 0,
    created_by UUID REFERENCES auth.users(id),
    created_at TIMESTAMPTZ DEFAULT NOW(),
    updated_at TIMESTAMPTZ DEFAULT NOW()
);

CREATE INDEX idx_admin_webhooks_active ON admin_webhooks(is_active);

ALTER TABLE admin_webhooks ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Admins can manage webhooks" ON admin_webhooks
    FOR ALL USING (
        EXISTS (
            SELECT 1 FROM profiles 
            WHERE profiles.id = auth.uid() 
            AND profiles.role IN ('admin', 'super_admin')
        )
    );

-- 4. ADMIN API KEYS
CREATE TABLE IF NOT EXISTS admin_api_keys (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    name TEXT NOT NULL,
    key_hash TEXT NOT NULL,
    key_prefix TEXT NOT NULL,
    permissions TEXT[] NOT NULL DEFAULT ARRAY['read'],
    rate_limit INTEGER DEFAULT 1000,
    expires_at TIMESTAMPTZ,
    last_used_at TIMESTAMPTZ,
    usage_count BIGINT DEFAULT 0,
    is_active BOOLEAN DEFAULT TRUE,
    created_by UUID REFERENCES auth.users(id),
    created_at TIMESTAMPTZ DEFAULT NOW(),
    updated_at TIMESTAMPTZ DEFAULT NOW()
);

CREATE UNIQUE INDEX idx_admin_api_keys_prefix ON admin_api_keys(key_prefix);
CREATE INDEX idx_admin_api_keys_active ON admin_api_keys(is_active);

ALTER TABLE admin_api_keys ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Admins can manage API keys" ON admin_api_keys
    FOR ALL USING (
        EXISTS (
            SELECT 1 FROM profiles 
            WHERE profiles.id = auth.uid() 
            AND profiles.role IN ('admin', 'super_admin')
        )
    );

-- 5. SYSTEM SETTINGS / FEATURE FLAGS
CREATE TABLE IF NOT EXISTS admin_system_settings (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    key TEXT NOT NULL UNIQUE,
    value JSONB NOT NULL,
    category TEXT NOT NULL DEFAULT 'general',
    description TEXT,
    is_public BOOLEAN DEFAULT FALSE,
    validation_schema JSONB,
    created_by UUID REFERENCES auth.users(id),
    updated_by UUID REFERENCES auth.users(id),
    created_at TIMESTAMPTZ DEFAULT NOW(),
    updated_at TIMESTAMPTZ DEFAULT NOW()
);

CREATE INDEX idx_admin_system_settings_category ON admin_system_settings(category);

ALTER TABLE admin_system_settings ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Admins can manage settings" ON admin_system_settings
    FOR ALL USING (
        EXISTS (
            SELECT 1 FROM profiles 
            WHERE profiles.id = auth.uid() 
            AND profiles.role IN ('admin', 'super_admin')
        )
    );

CREATE POLICY "Public can read public settings" ON admin_system_settings
    FOR SELECT USING (is_public = TRUE);

-- 6. SUPPORT TICKETS
CREATE TABLE IF NOT EXISTS support_tickets (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    ticket_number TEXT NOT NULL UNIQUE,
    user_id UUID REFERENCES auth.users(id),
    user_email TEXT,
    user_name TEXT,
    subject TEXT NOT NULL,
    description TEXT NOT NULL,
    category TEXT NOT NULL DEFAULT 'general' CHECK (category IN ('general', 'order', 'payment', 'delivery', 'account', 'technical', 'refund', 'complaint')),
    priority TEXT NOT NULL DEFAULT 'medium' CHECK (priority IN ('low', 'medium', 'high', 'urgent')),
    status TEXT NOT NULL DEFAULT 'open' CHECK (status IN ('open', 'in_progress', 'waiting_customer', 'waiting_third_party', 'resolved', 'closed', 'reopened')),
    assigned_admin_id UUID REFERENCES auth.users(id),
    sla_due_at TIMESTAMPTZ,
    resolved_at TIMESTAMPTZ,
    closed_at TIMESTAMPTZ,
    tags TEXT[],
    metadata JSONB DEFAULT '{}',
    created_at TIMESTAMPTZ DEFAULT NOW(),
    updated_at TIMESTAMPTZ DEFAULT NOW()
);

CREATE INDEX idx_support_tickets_user ON support_tickets(user_id);
CREATE INDEX idx_support_tickets_status ON support_tickets(status);
CREATE INDEX idx_support_tickets_assigned ON support_tickets(assigned_admin_id);
CREATE INDEX idx_support_tickets_priority ON support_tickets(priority);

ALTER TABLE support_tickets ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Users can view own tickets" ON support_tickets
    FOR SELECT USING (user_id = auth.uid());

CREATE POLICY "Users can create tickets" ON support_tickets
    FOR INSERT WITH CHECK (user_id = auth.uid());

CREATE POLICY "Admins can manage all tickets" ON support_tickets
    FOR ALL USING (
        EXISTS (
            SELECT 1 FROM profiles 
            WHERE profiles.id = auth.uid() 
            AND profiles.role IN ('admin', 'super_admin')
        )
    );

-- 7. SUPPORT TICKET MESSAGES
CREATE TABLE IF NOT EXISTS support_ticket_messages (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    ticket_id UUID NOT NULL REFERENCES support_tickets(id) ON DELETE CASCADE,
    sender_id UUID REFERENCES auth.users(id),
    sender_type TEXT NOT NULL CHECK (sender_type IN ('user', 'admin', 'system')),
    message TEXT NOT NULL,
    is_internal BOOLEAN DEFAULT FALSE,
    attachments JSONB DEFAULT '[]',
    created_at TIMESTAMPTZ DEFAULT NOW()
);

CREATE INDEX idx_support_ticket_messages_ticket ON support_ticket_messages(ticket_id);

ALTER TABLE support_ticket_messages ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Users can view messages for own tickets" ON support_ticket_messages
    FOR SELECT USING (
        EXISTS (
            SELECT 1 FROM support_tickets 
            WHERE support_tickets.id = ticket_id 
            AND support_tickets.user_id = auth.uid()
        )
    );

CREATE POLICY "Admins can manage all messages" ON support_ticket_messages
    FOR ALL USING (
        EXISTS (
            SELECT 1 FROM profiles 
            WHERE profiles.id = auth.uid() 
            AND profiles.role IN ('admin', 'super_admin')
        )
    );

CREATE POLICY "Users can send messages to own tickets" ON support_ticket_messages
    FOR INSERT WITH CHECK (
        EXISTS (
            SELECT 1 FROM support_tickets 
            WHERE support_tickets.id = ticket_id 
            AND support_tickets.user_id = auth.uid()
        )
        AND sender_type = 'user'
    );

-- 8. COUPONS (Marketing)
CREATE TABLE IF NOT EXISTS coupons (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    code TEXT NOT NULL UNIQUE,
    name TEXT NOT NULL,
    description TEXT,
    discount_type TEXT NOT NULL CHECK (discount_type IN ('percentage', 'fixed_amount', 'free_delivery')),
    discount_value NUMERIC(10,2) NOT NULL,
    min_order_amount NUMERIC(10,2) DEFAULT 0,
    max_discount_amount NUMERIC(10,2),
    usage_limit INTEGER,
    usage_count INTEGER DEFAULT 0,
    per_user_limit INTEGER DEFAULT 1,
    valid_from TIMESTAMPTZ NOT NULL DEFAULT NOW(),
    valid_until TIMESTAMPTZ NOT NULL,
    applicable_categories TEXT[],
    applicable_sellers UUID[],
    is_active BOOLEAN DEFAULT TRUE,
    created_by UUID REFERENCES auth.users(id),
    created_at TIMESTAMPTZ DEFAULT NOW(),
    updated_at TIMESTAMPTZ DEFAULT NOW()
);

CREATE INDEX idx_coupons_code ON coupons(code);
CREATE INDEX idx_coupons_active ON coupons(is_active);
CREATE INDEX idx_coupons_dates ON coupons(valid_from, valid_until);

ALTER TABLE coupons ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Public can view active coupons" ON coupons
    FOR SELECT USING (is_active = TRUE AND valid_from <= NOW() AND valid_until >= NOW());

CREATE POLICY "Admins can manage coupons" ON coupons
    FOR ALL USING (
        EXISTS (
            SELECT 1 FROM profiles 
            WHERE profiles.id = auth.uid() 
            AND profiles.role IN ('admin', 'super_admin')
        )
    );

-- 9. BANNERS (Marketing)
CREATE TABLE IF NOT EXISTS banners (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    title TEXT NOT NULL,
    subtitle TEXT,
    image_url TEXT NOT NULL,
    link_url TEXT,
    link_type TEXT CHECK (link_type IN ('external', 'seller', 'category', 'product', 'custom')),
    position TEXT NOT NULL DEFAULT 'home_top' CHECK (position IN ('home_top', 'home_middle', 'home_bottom', 'category_top', 'search_top')),
    display_order INTEGER DEFAULT 0,
    start_date TIMESTAMPTZ,
    end_date TIMESTAMPTZ,
    target_audience TEXT DEFAULT 'all' CHECK (target_audience IN ('all', 'customers', 'merchants', 'drivers')),
    is_active BOOLEAN DEFAULT TRUE,
    created_by UUID REFERENCES auth.users(id),
    created_at TIMESTAMPTZ DEFAULT NOW(),
    updated_at TIMESTAMPTZ DEFAULT NOW()
);

CREATE INDEX idx_banners_position_active ON banners(position, is_active);
CREATE INDEX idx_banners_dates ON banners(start_date, end_date);

ALTER TABLE banners ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Public can view active banners" ON banners
    FOR SELECT USING (
        is_active = TRUE 
        AND (start_date IS NULL OR start_date <= NOW()) 
        AND (end_date IS NULL OR end_date >= NOW())
    );

CREATE POLICY "Admins can manage banners" ON banners
    FOR ALL USING (
        EXISTS (
            SELECT 1 FROM profiles 
            WHERE profiles.id = auth.uid() 
            AND profiles.role IN ('admin', 'super_admin')
        )
    );

-- 10. PAYOUT BATCHES
CREATE TABLE IF NOT EXISTS payout_batches (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    batch_number TEXT NOT NULL UNIQUE,
    payout_type TEXT NOT NULL CHECK (payout_type IN ('seller', 'driver', 'mixed')),
    status TEXT NOT NULL DEFAULT 'pending' CHECK (status IN ('pending', 'processing', 'completed', 'failed', 'cancelled')),
    total_amount NUMERIC(15,2) NOT NULL DEFAULT 0,
    total_count INTEGER NOT NULL DEFAULT 0,
    processed_count INTEGER DEFAULT 0,
    failed_count INTEGER DEFAULT 0,
    payment_method TEXT,
    reference_id TEXT,
    initiated_by UUID REFERENCES auth.users(id),
    completed_at TIMESTAMPTZ,
    metadata JSONB DEFAULT '{}',
    created_at TIMESTAMPTZ DEFAULT NOW(),
    updated_at TIMESTAMPTZ DEFAULT NOW()
);

CREATE INDEX idx_payout_batches_status ON payout_batches(status);
CREATE INDEX idx_payout_batches_type ON payout_batches(payout_type);

ALTER TABLE payout_batches ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Admins can manage payout batches" ON payout_batches
    FOR ALL USING (
        EXISTS (
            SELECT 1 FROM profiles 
            WHERE profiles.id = auth.uid() 
            AND profiles.role IN ('admin', 'super_admin')
        )
    );

-- 11. PAYOUT ITEMS
CREATE TABLE IF NOT EXISTS payout_items (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    batch_id UUID NOT NULL REFERENCES payout_batches(id) ON DELETE CASCADE,
    user_id UUID NOT NULL REFERENCES auth.users(id),
    user_role TEXT NOT NULL CHECK (user_role IN ('seller', 'driver')),
    amount NUMERIC(15,2) NOT NULL,
    currency TEXT DEFAULT 'TZS',
    status TEXT NOT NULL DEFAULT 'pending' CHECK (status IN ('pending', 'processing', 'completed', 'failed', 'reversed')),
    transaction_id TEXT,
    failure_reason TEXT,
    processed_at TIMESTAMPTZ,
    metadata JSONB DEFAULT '{}',
    created_at TIMESTAMPTZ DEFAULT NOW()
);

CREATE INDEX idx_payout_items_batch ON payout_items(batch_id);
CREATE INDEX idx_payout_items_user ON payout_items(user_id);
CREATE INDEX idx_payout_items_status ON payout_items(status);

ALTER TABLE payout_items ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Admins can manage payout items" ON payout_items
    FOR ALL USING (
        EXISTS (
            SELECT 1 FROM profiles 
            WHERE profiles.id = auth.uid() 
            AND profiles.role IN ('admin', 'super_admin')
        )
    );

CREATE POLICY "Users can view own payouts" ON payout_items
    FOR SELECT USING (user_id = auth.uid());

-- 12. ADMIN ROLES & PERMISSIONS (RBAC)
CREATE TABLE IF NOT EXISTS admin_roles (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    name TEXT NOT NULL UNIQUE,
    display_name TEXT NOT NULL,
    description TEXT,
    permissions JSONB NOT NULL DEFAULT '{}',
    is_system BOOLEAN DEFAULT FALSE,
    created_at TIMESTAMPTZ DEFAULT NOW(),
    updated_at TIMESTAMPTZ DEFAULT NOW()
);

INSERT INTO admin_roles (name, display_name, description, permissions, is_system) VALUES
('super_admin', 'Super Admin', 'Full platform access', '{"*": true}', TRUE),
('admin', 'Admin', 'Platform administration', '{"users": ["read", "write", "delete"], "orders": ["read", "write"], "sellers": ["read", "write", "approve"], "drivers": ["read", "write", "approve"], "finance": ["read", "write", "payout"], "analytics": ["read"], "settings": ["read", "write"], "support": ["read", "write"], "marketing": ["read", "write"]}', TRUE),
('support_admin', 'Support Admin', 'Customer support management', '{"support": ["read", "write"], "users": ["read"], "orders": ["read"]}', TRUE),
('finance_admin', 'Finance Admin', 'Financial operations', '{"finance": ["read", "write", "payout"], "orders": ["read"], "sellers": ["read"], "drivers": ["read"]}', TRUE),
('operations_admin', 'Operations Admin', 'Operations & logistics', '{"orders": ["read", "write"], "drivers": ["read", "write"], "sellers": ["read"], "analytics": ["read"]}', TRUE)
ON CONFLICT (name) DO NOTHING;

ALTER TABLE admin_roles ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Admins can view roles" ON admin_roles
    FOR SELECT USING (
        EXISTS (
            SELECT 1 FROM profiles 
            WHERE profiles.id = auth.uid() 
            AND profiles.role IN ('admin', 'super_admin')
        )
    );

CREATE POLICY "Super admins can manage roles" ON admin_roles
    FOR ALL USING (
        EXISTS (
            SELECT 1 FROM profiles 
            WHERE profiles.id = auth.uid() 
            AND profiles.role = 'super_admin'
        )
    );

-- 13. ADMIN USER ROLE ASSIGNMENTS
CREATE TABLE IF NOT EXISTS admin_user_roles (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    user_id UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
    role_id UUID NOT NULL REFERENCES admin_roles(id) ON DELETE CASCADE,
    assigned_by UUID REFERENCES auth.users(id),
    assigned_at TIMESTAMPTZ DEFAULT NOW(),
    expires_at TIMESTAMPTZ,
    is_active BOOLEAN DEFAULT TRUE,
    UNIQUE(user_id, role_id)
);

CREATE INDEX idx_admin_user_roles_user ON admin_user_roles(user_id);
CREATE INDEX idx_admin_user_roles_active ON admin_user_roles(user_id, is_active) WHERE is_active = TRUE;

ALTER TABLE admin_user_roles ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Admins can view role assignments" ON admin_user_roles
    FOR SELECT USING (
        EXISTS (
            SELECT 1 FROM profiles 
            WHERE profiles.id = auth.uid() 
            AND profiles.role IN ('admin', 'super_admin')
        )
    );

CREATE POLICY "Super admins can manage role assignments" ON admin_user_roles
    FOR ALL USING (
        EXISTS (
            SELECT 1 FROM profiles 
            WHERE profiles.id = auth.uid() 
            AND profiles.role = 'super_admin'
        )
    );

-- 14. ADMIN FUNCTIONS

-- Log admin action
CREATE OR REPLACE FUNCTION log_admin_action(
    p_action TEXT,
    p_resource_type TEXT,
    p_resource_id TEXT DEFAULT NULL,
    p_old_data JSONB DEFAULT NULL,
    p_new_data JSONB DEFAULT NULL
) RETURNS VOID
LANGUAGE plpgsql
SECURITY DEFINER
AS $$
BEGIN
    INSERT INTO admin_audit_logs (admin_id, admin_email, action, resource_type, resource_id, old_data, new_data, ip_address)
    VALUES (
        auth.uid(),
        (SELECT email FROM auth.users WHERE id = auth.uid()),
        p_action,
        p_resource_type,
        p_resource_id,
        p_old_data,
        p_new_data,
        inet_client_addr()
    );
END;
$$;

-- Get admin audit logs with filters
CREATE OR REPLACE FUNCTION get_admin_audit_logs(
    p_admin_id UUID DEFAULT NULL,
    p_action TEXT DEFAULT NULL,
    p_resource_type TEXT DEFAULT NULL,
    p_start_date TIMESTAMPTZ DEFAULT NULL,
    p_end_date TIMESTAMPTZ DEFAULT NULL,
    p_limit INTEGER DEFAULT 100,
    p_offset INTEGER DEFAULT 0
) RETURNS JSONB
LANGUAGE plpgsql
SECURITY DEFINER
AS $$
DECLARE
    v_result JSONB;
    v_total INTEGER;
BEGIN
    SELECT jsonb_agg(
        jsonb_build_object(
            'id', id,
            'admin_id', admin_id,
            'admin_email', admin_email,
            'action', action,
            'resource_type', resource_type,
            'resource_id', resource_id,
            'old_data', old_data,
            'new_data', new_data,
            'ip_address', ip_address,
            'user_agent', user_agent,
            'created_at', created_at
        )
        ORDER BY created_at DESC
    ) INTO v_result
    FROM admin_audit_logs
    WHERE (p_admin_id IS NULL OR admin_id = p_admin_id)
      AND (p_action IS NULL OR action = p_action)
      AND (p_resource_type IS NULL OR resource_type = p_resource_type)
      AND (p_start_date IS NULL OR created_at >= p_start_date)
      AND (p_end_date IS NULL OR created_at <= p_end_date)
    LIMIT p_limit OFFSET p_offset;

    SELECT COUNT(*) INTO v_total
    FROM admin_audit_logs
    WHERE (p_admin_id IS NULL OR admin_id = p_admin_id)
      AND (p_action IS NULL OR action = p_action)
      AND (p_resource_type IS NULL OR resource_type = p_resource_type)
      AND (p_start_date IS NULL OR created_at >= p_start_date)
      AND (p_end_date IS NULL OR created_at <= p_end_date);

    RETURN jsonb_build_object('data', COALESCE(v_result, '[]'::jsonb), 'total', v_total);
END;
$$;

-- Send admin notification (broadcast)
CREATE OR REPLACE FUNCTION send_admin_notification(
    p_title TEXT,
    p_message TEXT,
    p_type TEXT DEFAULT 'info',
    p_target_audience TEXT DEFAULT 'all',
    p_target_user_ids UUID[] DEFAULT NULL,
    p_channels TEXT[] DEFAULT ARRAY['in_app'],
    p_priority TEXT DEFAULT 'normal',
    p_scheduled_at TIMESTAMPTZ DEFAULT NULL
) RETURNS UUID
LANGUAGE plpgsql
SECURITY DEFINER
AS $$
DECLARE
    v_notification_id UUID;
BEGIN
    INSERT INTO admin_notifications (
        title, message, type, target_audience, target_user_ids,
        channels, priority, scheduled_at, status, created_by
    ) VALUES (
        p_title, p_message, p_type, p_target_audience, p_target_user_ids,
        p_channels, p_priority, p_scheduled_at, 
        CASE WHEN p_scheduled_at IS NULL OR p_scheduled_at <= NOW() THEN 'sending' ELSE 'scheduled' END,
        auth.uid()
    ) RETURNING id INTO v_notification_id;

    -- If sending immediately, process in background (would be handled by worker)
    IF p_scheduled_at IS NULL OR p_scheduled_at <= NOW() THEN
        PERFORM process_notification(v_notification_id);
    END IF;

    RETURN v_notification_id;
END;
$$;

-- Process notification (send to users)
CREATE OR REPLACE FUNCTION process_notification(p_notification_id UUID) RETURNS VOID
LANGUAGE plpgsql
SECURITY DEFINER
AS $$
DECLARE
    v_notification admin_notifications%ROWTYPE;
    v_user_ids UUID[];
    v_user_id UUID;
BEGIN
    SELECT * INTO v_notification FROM admin_notifications WHERE id = p_notification_id;
    
    IF v_notification.target_user_ids IS NOT NULL AND array_length(v_notification.target_user_ids, 1) > 0 THEN
        v_user_ids := v_notification.target_user_ids;
    ELSE
        -- Get users by audience
        SELECT array_agg(id) INTO v_user_ids
        FROM profiles
        WHERE (v_notification.target_audience = 'all' OR role = v_notification.target_audience);
    END IF;

    -- Create in-app notifications for each user
    FOREACH v_user_id IN ARRAY v_user_ids LOOP
        INSERT INTO notifications (user_id, title, message, type, data, created_at)
        VALUES (
            v_user_id,
            v_notification.title,
            v_notification.message,
            v_notification.type,
            jsonb_build_object('admin_notification_id', p_notification_id),
            NOW()
        ) ON CONFLICT DO NOTHING;
    END LOOP;

    -- Update notification status
    UPDATE admin_notifications
    SET status = 'sent', sent_at = NOW(), sent_count = array_length(v_user_ids, 1)
    WHERE id = p_notification_id;
END;
$$;

-- Create payout batch
CREATE OR REPLACE FUNCTION create_payout_batch(
    p_payout_type TEXT,
    p_user_ids UUID[],
    p_amounts NUMERIC[],
    p_payment_method TEXT DEFAULT 'wallet',
    p_reference_id TEXT DEFAULT NULL
) RETURNS UUID
LANGUAGE plpgsql
SECURITY DEFINER
AS $$
DECLARE
    v_batch_id UUID;
    v_batch_number TEXT;
    v_total_amount NUMERIC := 0;
    v_i INTEGER;
BEGIN
    v_batch_number := 'PAY-' || TO_CHAR(NOW(), 'YYYYMMDD') || '-' || LPAD(nextval('payout_batch_seq')::TEXT, 4, '0');
    
    INSERT INTO payout_batches (batch_number, payout_type, total_amount, total_count, payment_method, reference_id, initiated_by, status)
    VALUES (v_batch_number, p_payout_type, 0, array_length(p_user_ids, 1), p_payment_method, p_reference_id, auth.uid(), 'pending')
    RETURNING id INTO v_batch_id;

    FOR v_i IN 1..array_length(p_user_ids, 1) LOOP
        v_total_amount := v_total_amount + p_amounts[v_i];
        
        INSERT INTO payout_items (batch_id, user_id, user_role, amount, status)
        VALUES (
            v_batch_id,
            p_user_ids[v_i],
            CASE p_payout_type WHEN 'seller' THEN 'seller' WHEN 'driver' THEN 'driver' ELSE 'seller' END,
            p_amounts[v_i],
            'pending'
        );
    END LOOP;

    UPDATE payout_batches SET total_amount = v_total_amount WHERE id = v_batch_id;

    RETURN v_batch_id;
END;
$$;

-- Create sequence for payout batch numbers
CREATE SEQUENCE IF NOT EXISTS payout_batch_seq;

-- Assign admin role to user
CREATE OR REPLACE FUNCTION assign_admin_role(
    p_user_id UUID,
    p_role_name TEXT,
    p_expires_at TIMESTAMPTZ DEFAULT NULL
) RETURNS VOID
LANGUAGE plpgsql
SECURITY DEFINER
AS $$
DECLARE
    v_role_id UUID;
BEGIN
    SELECT id INTO v_role_id FROM admin_roles WHERE name = p_role_name;
    
    IF v_role_id IS NULL THEN
        RAISE EXCEPTION 'Role not found: %', p_role_name;
    END IF;

    INSERT INTO admin_user_roles (user_id, role_id, assigned_by, expires_at)
    VALUES (p_user_id, v_role_id, auth.uid(), p_expires_at)
    ON CONFLICT (user_id, role_id) DO UPDATE SET
        is_active = TRUE,
        expires_at = p_expires_at,
        assigned_by = auth.uid(),
        assigned_at = NOW();

    PERFORM log_admin_action('assign_role', 'admin_user_roles', p_user_id::TEXT, NULL, jsonb_build_object('role', p_role_name));
END;
$$;

-- Revoke admin role from user
CREATE OR REPLACE FUNCTION revoke_admin_role(
    p_user_id UUID,
    p_role_name TEXT
) RETURNS VOID
LANGUAGE plpgsql
SECURITY DEFINER
AS $$
DECLARE
    v_role_id UUID;
BEGIN
    SELECT id INTO v_role_id FROM admin_roles WHERE name = p_role_name;
    
    IF v_role_id IS NULL THEN
        RAISE EXCEPTION 'Role not found: %', p_role_name;
    END IF;

    UPDATE admin_user_roles
    SET is_active = FALSE
    WHERE user_id = p_user_id AND role_id = v_role_id;

    PERFORM log_admin_action('revoke_role', 'admin_user_roles', p_user_id::TEXT, NULL, jsonb_build_object('role', p_role_name));
END;
$$;

-- Get user's admin roles
CREATE OR REPLACE FUNCTION get_user_admin_roles(p_user_id UUID) RETURNS JSONB
LANGUAGE plpgsql
SECURITY DEFINER
AS $$
DECLARE
    v_result JSONB;
BEGIN
    SELECT jsonb_agg(
        jsonb_build_object(
            'role_id', ar.id,
            'role_name', ar.name,
            'display_name', ar.display_name,
            'permissions', ar.permissions,
            'assigned_at', aur.assigned_at,
            'expires_at', aur.expires_at,
            'is_active', aur.is_active
        )
    ) INTO v_result
    FROM admin_user_roles aur
    JOIN admin_roles ar ON ar.id = aur.role_id
    WHERE aur.user_id = p_user_id AND aur.is_active = TRUE AND (aur.expires_at IS NULL OR aur.expires_at > NOW());

    RETURN COALESCE(v_result, '[]'::jsonb);
END;
$$;

-- Get system settings
CREATE OR REPLACE FUNCTION get_system_settings(p_category TEXT DEFAULT NULL) RETURNS JSONB
LANGUAGE plpgsql
SECURITY DEFINER
AS $$
DECLARE
    v_result JSONB;
BEGIN
    SELECT jsonb_object_agg(key, value) INTO v_result
    FROM admin_system_settings
    WHERE (p_category IS NULL OR category = p_category);

    RETURN COALESCE(v_result, '{}'::jsonb);
END;
$$;

-- Update system setting
CREATE OR REPLACE FUNCTION update_system_setting(
    p_key TEXT,
    p_value JSONB,
    p_category TEXT DEFAULT 'general',
    p_description TEXT DEFAULT NULL
) RETURNS VOID
LANGUAGE plpgsql
SECURITY DEFINER
AS $$
BEGIN
    INSERT INTO admin_system_settings (key, value, category, description, created_by, updated_by)
    VALUES (p_key, p_value, p_category, p_description, auth.uid(), auth.uid())
    ON CONFLICT (key) DO UPDATE SET
        value = p_value,
        category = p_category,
        description = p_description,
        updated_by = auth.uid(),
        updated_at = NOW();

    PERFORM log_admin_action('update_setting', 'admin_system_settings', p_key, NULL, p_value);
END;
$$;

-- Grant usage on sequences
GRANT USAGE ON SEQUENCE payout_batch_seq TO authenticated;