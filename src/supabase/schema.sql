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
-- Example: Policy to allow users to view their own escrow records
-- CREATE POLICY "Users can view their own escrows" ON escrows
-- FOR SELECT USING (auth.uid()::text = client_wallet OR auth.uid()::text = freelancer_wallet);
