-- =====================================================
-- RBAC (Role-Based Access Control) Schema
-- High-Ticket Strategist Portal
-- =====================================================

-- User profiles table (extends Supabase auth.users)
CREATE TABLE IF NOT EXISTS user_profiles (
  id UUID PRIMARY KEY REFERENCES auth.users(id) ON DELETE CASCADE,
  email TEXT NOT NULL,
  full_name TEXT NOT NULL,
  role TEXT NOT NULL DEFAULT 'viewer' CHECK (role IN ('admin', 'strategist', 'viewer')),
  is_active BOOLEAN NOT NULL DEFAULT true,
  avatar_url TEXT,
  invited_by UUID REFERENCES auth.users(id),
  invited_at TIMESTAMPTZ,
  last_login_at TIMESTAMPTZ,
  created_at TIMESTAMPTZ DEFAULT NOW(),
  updated_at TIMESTAMPTZ DEFAULT NOW()
);

-- Permissions table
CREATE TABLE IF NOT EXISTS permissions (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  name TEXT NOT NULL UNIQUE,
  description TEXT,
  category TEXT NOT NULL,
  created_at TIMESTAMPTZ DEFAULT NOW()
);

-- Role permissions (many-to-many)
CREATE TABLE IF NOT EXISTS role_permissions (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  role TEXT NOT NULL CHECK (role IN ('admin', 'strategist', 'viewer')),
  permission_id UUID NOT NULL REFERENCES permissions(id) ON DELETE CASCADE,
  created_at TIMESTAMPTZ DEFAULT NOW(),
  UNIQUE(role, permission_id)
);

-- User invitations table
CREATE TABLE IF NOT EXISTS user_invitations (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  email TEXT NOT NULL,
  role TEXT NOT NULL DEFAULT 'viewer' CHECK (role IN ('admin', 'strategist', 'viewer')),
  invited_by UUID NOT NULL REFERENCES auth.users(id),
  token TEXT NOT NULL UNIQUE,
  expires_at TIMESTAMPTZ NOT NULL,
  accepted_at TIMESTAMPTZ,
  created_at TIMESTAMPTZ DEFAULT NOW()
);

-- =====================================================
-- Indexes
-- =====================================================

CREATE INDEX IF NOT EXISTS idx_user_profiles_email ON user_profiles(email);
CREATE INDEX IF NOT EXISTS idx_user_profiles_role ON user_profiles(role);
CREATE INDEX IF NOT EXISTS idx_user_profiles_is_active ON user_profiles(is_active);
CREATE INDEX IF NOT EXISTS idx_role_permissions_role ON role_permissions(role);
CREATE INDEX IF NOT EXISTS idx_user_invitations_email ON user_invitations(email);
CREATE INDEX IF NOT EXISTS idx_user_invitations_token ON user_invitations(token);

-- =====================================================
-- Row Level Security
-- =====================================================

ALTER TABLE user_profiles ENABLE ROW LEVEL SECURITY;
ALTER TABLE permissions ENABLE ROW LEVEL SECURITY;
ALTER TABLE role_permissions ENABLE ROW LEVEL SECURITY;
ALTER TABLE user_invitations ENABLE ROW LEVEL SECURITY;

-- User profiles policies
CREATE POLICY "Users can view their own profile" ON user_profiles
  FOR SELECT USING (auth.uid() = id);

CREATE POLICY "Admins can view all profiles" ON user_profiles
  FOR SELECT USING (
    EXISTS (
      SELECT 1 FROM user_profiles WHERE id = auth.uid() AND role = 'admin'
    )
  );

CREATE POLICY "Users can update their own profile" ON user_profiles
  FOR UPDATE USING (auth.uid() = id)
  WITH CHECK (auth.uid() = id);

CREATE POLICY "Admins can update all profiles" ON user_profiles
  FOR UPDATE USING (
    EXISTS (
      SELECT 1 FROM user_profiles WHERE id = auth.uid() AND role = 'admin'
    )
  );

CREATE POLICY "Admins can insert profiles" ON user_profiles
  FOR INSERT WITH CHECK (
    EXISTS (
      SELECT 1 FROM user_profiles WHERE id = auth.uid() AND role = 'admin'
    )
  );

-- Permissions policies (read-only for all authenticated)
CREATE POLICY "Authenticated users can view permissions" ON permissions
  FOR SELECT USING (auth.role() = 'authenticated');

-- Role permissions policies
CREATE POLICY "Authenticated users can view role permissions" ON role_permissions
  FOR SELECT USING (auth.role() = 'authenticated');

CREATE POLICY "Admins can manage role permissions" ON role_permissions
  FOR ALL USING (
    EXISTS (
      SELECT 1 FROM user_profiles WHERE id = auth.uid() AND role = 'admin'
    )
  );

-- Invitations policies
CREATE POLICY "Admins can manage invitations" ON user_invitations
  FOR ALL USING (
    EXISTS (
      SELECT 1 FROM user_profiles WHERE id = auth.uid() AND role = 'admin'
    )
  );

-- =====================================================
-- Default Permissions
-- =====================================================

INSERT INTO permissions (name, description, category) VALUES
  -- Dashboard
  ('view_dashboard', 'View main dashboard', 'dashboard'),
  
  -- Delivery Checklist
  ('view_delivery_checklist', 'View delivery checklist', 'delivery'),
  ('edit_delivery_checklist', 'Edit delivery checklist items', 'delivery'),
  
  -- Clients
  ('view_clients', 'View client list', 'clients'),
  ('edit_clients', 'Edit client information', 'clients'),
  ('view_client_context', 'View client context/ICP', 'clients'),
  ('edit_client_context', 'Edit client context/ICP', 'clients'),
  
  -- Campaigns
  ('view_campaigns', 'View campaigns', 'campaigns'),
  ('edit_campaigns', 'Edit campaigns', 'campaigns'),
  ('submit_campaigns', 'Submit campaigns for review', 'campaigns'),
  
  -- Mailbox Health
  ('view_mailbox_health', 'View mailbox health', 'mailbox'),
  
  -- Submissions
  ('view_submissions', 'View submissions', 'submissions'),
  ('review_submissions', 'Review and approve/reject submissions', 'submissions'),
  
  -- Communications
  ('view_communications', 'View communications', 'communications'),
  ('send_communications', 'Send communications', 'communications'),
  
  -- Admin
  ('view_admin_users', 'View user management', 'admin'),
  ('manage_users', 'Create, edit, delete users', 'admin'),
  ('view_admin_requirements', 'View requirements config', 'admin'),
  ('edit_admin_requirements', 'Edit requirements config', 'admin'),
  ('view_admin_best_practices', 'View best practices', 'admin'),
  ('edit_admin_best_practices', 'Edit best practices', 'admin'),
  
  -- Settings
  ('view_settings', 'View settings', 'settings'),
  ('edit_settings', 'Edit settings', 'settings')
ON CONFLICT (name) DO NOTHING;

-- =====================================================
-- Default Role Permissions
-- =====================================================

-- Admin gets all permissions
INSERT INTO role_permissions (role, permission_id)
SELECT 'admin', id FROM permissions
ON CONFLICT (role, permission_id) DO NOTHING;

-- Strategist permissions
INSERT INTO role_permissions (role, permission_id)
SELECT 'strategist', id FROM permissions
WHERE name IN (
  'view_dashboard',
  'view_delivery_checklist',
  'edit_delivery_checklist',
  'view_clients',
  'view_client_context',
  'view_campaigns',
  'edit_campaigns',
  'submit_campaigns',
  'view_mailbox_health',
  'view_submissions',
  'view_communications',
  'send_communications',
  'view_settings'
)
ON CONFLICT (role, permission_id) DO NOTHING;

-- Viewer permissions
INSERT INTO role_permissions (role, permission_id)
SELECT 'viewer', id FROM permissions
WHERE name IN (
  'view_dashboard',
  'view_delivery_checklist',
  'view_clients',
  'view_client_context',
  'view_campaigns',
  'view_mailbox_health',
  'view_submissions',
  'view_settings'
)
ON CONFLICT (role, permission_id) DO NOTHING;

-- =====================================================
-- Functions
-- =====================================================

-- Function to check if user has a specific permission
CREATE OR REPLACE FUNCTION has_permission(user_id UUID, permission_name TEXT)
RETURNS BOOLEAN AS $$
DECLARE
  user_role TEXT;
BEGIN
  SELECT role INTO user_role FROM user_profiles WHERE id = user_id AND is_active = true;
  
  IF user_role IS NULL THEN
    RETURN FALSE;
  END IF;
  
  RETURN EXISTS (
    SELECT 1 FROM role_permissions rp
    JOIN permissions p ON p.id = rp.permission_id
    WHERE rp.role = user_role AND p.name = permission_name
  );
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- Function to get all permissions for a user
CREATE OR REPLACE FUNCTION get_user_permissions(user_id UUID)
RETURNS TABLE(permission_name TEXT) AS $$
DECLARE
  user_role TEXT;
BEGIN
  SELECT role INTO user_role FROM user_profiles WHERE id = user_id AND is_active = true;
  
  IF user_role IS NULL THEN
    RETURN;
  END IF;
  
  RETURN QUERY
  SELECT p.name FROM role_permissions rp
  JOIN permissions p ON p.id = rp.permission_id
  WHERE rp.role = user_role;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- Trigger to update updated_at
CREATE OR REPLACE FUNCTION update_updated_at_column()
RETURNS TRIGGER AS $$
BEGIN
  NEW.updated_at = NOW();
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

CREATE TRIGGER update_user_profiles_updated_at
  BEFORE UPDATE ON user_profiles
  FOR EACH ROW
  EXECUTE FUNCTION update_updated_at_column();

-- =====================================================
-- Service role policies (for API routes)
-- =====================================================

-- Allow service role full access
CREATE POLICY "Service role full access on user_profiles" ON user_profiles
  FOR ALL USING (auth.jwt() ->> 'role' = 'service_role');

CREATE POLICY "Service role full access on permissions" ON permissions
  FOR ALL USING (auth.jwt() ->> 'role' = 'service_role');

CREATE POLICY "Service role full access on role_permissions" ON role_permissions
  FOR ALL USING (auth.jwt() ->> 'role' = 'service_role');

CREATE POLICY "Service role full access on user_invitations" ON user_invitations
  FOR ALL USING (auth.jwt() ->> 'role' = 'service_role');
