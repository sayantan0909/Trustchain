-- Enable UUID extension
CREATE EXTENSION IF NOT EXISTS "uuid-ossp";

-- Table: users
CREATE TABLE IF NOT EXISTS users (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  wallet_address TEXT UNIQUE NOT NULL,
  role TEXT CHECK (role IN ('client', 'freelancer', 'admin')),
  banned BOOLEAN DEFAULT false,
  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- Table: escrows
CREATE TABLE IF NOT EXISTS escrows (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  client_wallet TEXT NOT NULL,
  freelancer_wallet TEXT NOT NULL,
  contract_address TEXT,
  total_amount BIGINT NOT NULL,
  status TEXT CHECK (status IN ('funded', 'released', 'refunded')),
  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- Table: milestones
CREATE TABLE IF NOT EXISTS milestones (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  escrow_id UUID REFERENCES escrows(id) ON DELETE CASCADE,
  milestone_index INTEGER NOT NULL,
  title TEXT NOT NULL,
  description TEXT,
  amount BIGINT NOT NULL,
  status TEXT CHECK (status IN ('pending', 'approved', 'refunded')) DEFAULT 'pending',
  submitted_at TIMESTAMP WITH TIME ZONE,
  approved_at TIMESTAMP WITH TIME ZONE,
  txn_id TEXT,
  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- Table: reports
CREATE TABLE IF NOT EXISTS reports (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  escrow_id UUID REFERENCES escrows(id),
  reporter_wallet TEXT NOT NULL,
  reason TEXT,
  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- Enable Row Level Security (RLS)
ALTER TABLE users ENABLE ROW LEVEL SECURITY;
ALTER TABLE escrows ENABLE ROW LEVEL SECURITY;
ALTER TABLE milestones ENABLE ROW LEVEL SECURITY;
ALTER TABLE reports ENABLE ROW LEVEL SECURITY;

-- Note: RLS Policies should be defined based on the authentication strategy.
-- We assume auth.uid() corresponds to users.id

-- Helper functions
CREATE OR REPLACE FUNCTION is_admin() RETURNS BOOLEAN AS $$
  SELECT EXISTS (
    SELECT 1 FROM users WHERE id = auth.uid() AND role = 'admin'
  );
$$ LANGUAGE sql SECURITY DEFINER;

CREATE OR REPLACE FUNCTION get_user_wallet() RETURNS TEXT AS $$
  SELECT wallet_address FROM users WHERE id = auth.uid();
$$ LANGUAGE sql SECURITY DEFINER;

-- ==========================
-- Policy definitions: users
-- ==========================
-- Users can read their own row
CREATE POLICY "Users can read their own row" ON users FOR SELECT
USING (id = auth.uid());

-- Admin can read all
CREATE POLICY "Admin can read all" ON users FOR SELECT
USING (is_admin());

-- Users can update their own row (to allow generic updates)
CREATE POLICY "Users can update their own row" ON users FOR UPDATE
USING (id = auth.uid());

-- Users can insert their own row
CREATE POLICY "Users can insert their own row" ON users FOR INSERT
WITH CHECK (id = auth.uid());

-- Admin can update users
CREATE POLICY "Admin can update users" ON users FOR UPDATE
USING (is_admin());

-- Only admin can update banned status (enforced by trigger since column-level RLS does not exist)
CREATE OR REPLACE FUNCTION prevent_banned_update() RETURNS TRIGGER AS $$
BEGIN
  IF NEW.banned IS DISTINCT FROM OLD.banned AND NOT is_admin() THEN
    RAISE EXCEPTION 'Only admin can update banned status';
  END IF;
  RETURN NEW;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

DROP TRIGGER IF EXISTS restrict_banned_update ON users;
CREATE TRIGGER restrict_banned_update
BEFORE UPDATE ON users
FOR EACH ROW
EXECUTE FUNCTION prevent_banned_update();

-- ==========================
-- Policy definitions: escrows
-- ==========================
-- Client can view their escrows
CREATE POLICY "Client can view their escrows" ON escrows FOR SELECT
USING (client_wallet = get_user_wallet());

-- Freelancer can view assigned escrows
CREATE POLICY "Freelancer can view assigned escrows" ON escrows FOR SELECT
USING (freelancer_wallet = get_user_wallet());

-- Only client can insert escrow
CREATE POLICY "Only client can insert escrow" ON escrows FOR INSERT
WITH CHECK (client_wallet = get_user_wallet());

-- Admin can view all escrows
CREATE POLICY "Admin can view all escrows" ON escrows FOR SELECT
USING (is_admin());

-- ==========================
-- Policy definitions: milestones
-- ==========================
-- Related to escrow visibility
CREATE POLICY "Related to escrow visibility" ON milestones FOR SELECT
USING (
  EXISTS (
    SELECT 1 FROM escrows 
    WHERE escrows.id = milestones.escrow_id 
    AND (escrows.client_wallet = get_user_wallet() OR escrows.freelancer_wallet = get_user_wallet())
  )
);

-- Admin can view all milestones
CREATE POLICY "Admin can view all milestones" ON milestones FOR SELECT
USING (is_admin());

-- Client can update status
CREATE POLICY "Client can update status" ON milestones FOR UPDATE
USING (
  EXISTS (
    SELECT 1 FROM escrows 
    WHERE escrows.id = milestones.escrow_id 
    AND escrows.client_wallet = get_user_wallet()
  )
);


-- ==========================
-- Policy definitions: reports
-- ==========================
-- Any logged user can insert report
CREATE POLICY "Any logged user can insert report" ON reports FOR INSERT
WITH CHECK (auth.uid() IS NOT NULL);

-- Admin can view all reports
CREATE POLICY "Admin can view all reports" ON reports FOR SELECT
USING (is_admin());
