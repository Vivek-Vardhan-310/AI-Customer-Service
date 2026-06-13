-- SQL schema for Supabase / Postgres
-- Run these in your Supabase SQL editor or psql connected to the project database.

-- Enable helper extension for UUID generation
CREATE EXTENSION IF NOT EXISTS pgcrypto;

-- Profiles: optional app-level profile that can mirror auth.users
-- You can set `id` to the same UUID as the Supabase auth user id.
CREATE TABLE IF NOT EXISTS profiles (
  id UUID PRIMARY KEY,
  full_name TEXT,
  email TEXT,
  avatar_url TEXT,
  created_at TIMESTAMPTZ DEFAULT now()
);

-- Products registered to users
CREATE TABLE IF NOT EXISTS products (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  name TEXT NOT NULL,
  serial TEXT,
  warranty_end DATE,
  owner UUID,
  created_at TIMESTAMPTZ DEFAULT now()
);

-- Tickets table: id is text (frontend uses 'TKT-xxxxx' strings)
CREATE TABLE IF NOT EXISTS tickets (
  id TEXT PRIMARY KEY,
  ticket_number TEXT UNIQUE,
  product_id UUID REFERENCES products(id) ON DELETE SET NULL,
  owner UUID,
  category TEXT,
  status TEXT DEFAULT 'Open',
  priority TEXT,
  date DATE,
  description TEXT,
  timeline JSONB DEFAULT '[]'::jsonb,
  created_at TIMESTAMPTZ DEFAULT now()
);
CREATE INDEX IF NOT EXISTS idx_tickets_owner ON tickets(owner);
CREATE INDEX IF NOT EXISTS idx_tickets_status ON tickets(status);

-- Feedback linked to tickets
CREATE TABLE IF NOT EXISTS feedback (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  ticket_id TEXT REFERENCES tickets(id) ON DELETE CASCADE,
  owner UUID,
  rating INT CHECK (rating >= 1 AND rating <= 5),
  comment TEXT,
  created_at TIMESTAMPTZ DEFAULT now()
);

-- Attachments for tickets (can be stored in Supabase Storage; store URLs here)
CREATE TABLE IF NOT EXISTS attachments (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  ticket_id TEXT REFERENCES tickets(id) ON DELETE CASCADE,
  filename TEXT,
  url TEXT,
  created_at TIMESTAMPTZ DEFAULT now()
);

-- Sample product row (optional)
INSERT INTO products (id, name, serial, warranty_end)
SELECT gen_random_uuid(), 'ThinkPad X1 Carbon Gen 11', 'PF-4R2K7X', (current_date + INTERVAL '210 days')::date
WHERE NOT EXISTS (SELECT 1 FROM products WHERE serial = 'PF-4R2K7X');

-- Notes:
-- 1) Supabase provides an `auth.users` table in the `auth` schema. You may mirror
--    that user id into `profiles.id` when a user signs up, or simply store the
--    Supabase user UUID into the `owner` columns above.
-- 2) If you prefer a strict foreign key to auth.users, you can alter the tables
--    to add FOREIGN KEY (owner) REFERENCES auth.users(id) but Supabase projects
--    sometimes restrict cross-schema FK operations depending on policies.
