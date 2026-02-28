-- TrustChain Supabase Schema

-- Projects table
CREATE TABLE projects (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  creator_id UUID REFERENCES auth.users(id),
  title TEXT NOT NULL,
  description TEXT,
  client_address TEXT NOT NULL,
  freelancer_address TEXT NOT NULL,
  total_amount BIGINT NOT NULL,
  app_id BIGINT, -- Algorand App ID
  status TEXT CHECK (status IN ('draft', 'funding', 'active', 'completed', 'disputed')) DEFAULT 'draft',
  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- Milestones table
CREATE TABLE milestones (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  project_id UUID REFERENCES projects(id) ON DELETE CASCADE,
  index INT NOT NULL,
  title TEXT NOT NULL,
  amount BIGINT NOT NULL,
  status TEXT CHECK (status IN ('pending', 'approved', 'paid')) DEFAULT 'pending',
  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- Enable RLS
ALTER TABLE projects ENABLE ROW LEVEL SECURITY;
ALTER TABLE milestones ENABLE ROW LEVEL SECURITY;

-- Policies
CREATE POLICY "Users can view their own projects" ON projects
  FOR SELECT USING (auth.uid() = creator_id OR client_address = auth.uid()::text OR freelancer_address = auth.uid()::text);

CREATE POLICY "Users can create projects" ON projects
  FOR INSERT WITH CHECK (auth.uid() = creator_id);

CREATE POLICY "Users can update their own projects" ON projects
  FOR UPDATE USING (auth.uid() = creator_id);

CREATE POLICY "Anyone can view milestones for a project they have access to" ON milestones
  FOR SELECT USING (EXISTS (
    SELECT 1 FROM projects WHERE projects.id = milestones.project_id
  ));
