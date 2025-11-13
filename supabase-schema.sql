-- Supabase Database Schema for Munyonyo Soccer Team
-- Run this SQL in your Supabase SQL Editor to create all tables

-- Enable UUID extension
CREATE EXTENSION IF NOT EXISTS "uuid-ossp";

-- ============================================
-- USERS TABLE
-- ============================================
CREATE TABLE users (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    name VARCHAR(255) NOT NULL,
    email VARCHAR(255) UNIQUE NOT NULL,
    role VARCHAR(50) NOT NULL DEFAULT 'viewer' CHECK (role IN ('admin', 'manager', 'treasurer', 'viewer')),
    status VARCHAR(50) NOT NULL DEFAULT 'active' CHECK (status IN ('active', 'inactive', 'suspended')),
    password_hash TEXT NOT NULL,
    created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
    updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

-- Indexes for users
CREATE INDEX idx_users_email ON users(email);
CREATE INDEX idx_users_role ON users(role);
CREATE INDEX idx_users_status ON users(status);

-- ============================================
-- PLAYERS TABLE
-- ============================================
CREATE TABLE players (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    name VARCHAR(255) NOT NULL,
    phone VARCHAR(50) NOT NULL,
    annual DECIMAL(10, 2) NOT NULL DEFAULT 150000.00,
    monthly DECIMAL(10, 2) NOT NULL DEFAULT 10000.00,
    pitch DECIMAL(10, 2) NOT NULL DEFAULT 5000.00,
    match_day INTEGER,
    created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
    updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

-- Indexes for players
CREATE INDEX idx_players_name ON players(name);
CREATE INDEX idx_players_phone ON players(phone);

-- ============================================
-- MATCH DAYS TABLE
-- ============================================
CREATE TABLE match_days (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    match_date DATE NOT NULL,
    opponent VARCHAR(255),
    venue VARCHAR(255),
    match_type VARCHAR(50) NOT NULL CHECK (match_type IN ('friendly', 'league', 'cup', 'tournament', 'training', 'expense')),
    created_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

-- Indexes for match_days
CREATE INDEX idx_match_days_date ON match_days(match_date DESC);
CREATE INDEX idx_match_days_type ON match_days(match_type);

-- ============================================
-- PAYMENTS TABLE
-- ============================================
CREATE TABLE payments (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    player_id UUID REFERENCES players(id) ON DELETE CASCADE,
    player_name VARCHAR(255) NOT NULL,
    payment_type VARCHAR(50) NOT NULL CHECK (payment_type IN ('annual', 'monthly', 'pitch', 'matchday')),
    amount DECIMAL(10, 2) NOT NULL,
    date DATE NOT NULL,
    created_by UUID REFERENCES users(id) ON DELETE SET NULL,
    created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
    updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

-- Indexes for payments
CREATE INDEX idx_payments_player_id ON payments(player_id);
CREATE INDEX idx_payments_date ON payments(date DESC);
CREATE INDEX idx_payments_type ON payments(payment_type);
CREATE INDEX idx_payments_player_type ON payments(player_id, payment_type);

-- ============================================
-- EXPENSES TABLE
-- ============================================
CREATE TABLE expenses (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    description TEXT NOT NULL,
    category VARCHAR(100) NOT NULL CHECK (category IN ('Facilities', 'Equipment', 'Food & Drinks', 'Transport', 'Medical', 'Officials')),
    amount DECIMAL(10, 2) NOT NULL,
    expense_date DATE NOT NULL,
    match_day_id UUID REFERENCES match_days(id) ON DELETE SET NULL,
    created_by UUID REFERENCES users(id) ON DELETE SET NULL,
    created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
    updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

-- Indexes for expenses
CREATE INDEX idx_expenses_date ON expenses(expense_date DESC);
CREATE INDEX idx_expenses_category ON expenses(category);
CREATE INDEX idx_expenses_match_day ON expenses(match_day_id);

-- ============================================
-- TRIGGERS FOR UPDATED_AT
-- ============================================
-- Function to update updated_at timestamp
CREATE OR REPLACE FUNCTION update_updated_at_column()
RETURNS TRIGGER AS $$
BEGIN
    NEW.updated_at = NOW();
    RETURN NEW;
END;
$$ language 'plpgsql';

-- Apply triggers to tables with updated_at
CREATE TRIGGER update_users_updated_at BEFORE UPDATE ON users
    FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();

CREATE TRIGGER update_players_updated_at BEFORE UPDATE ON players
    FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();

CREATE TRIGGER update_payments_updated_at BEFORE UPDATE ON payments
    FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();

CREATE TRIGGER update_expenses_updated_at BEFORE UPDATE ON expenses
    FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();

-- ============================================
-- ROW LEVEL SECURITY (RLS) POLICIES
-- ============================================
-- Enable RLS on all tables
ALTER TABLE users ENABLE ROW LEVEL SECURITY;
ALTER TABLE players ENABLE ROW LEVEL SECURITY;
ALTER TABLE match_days ENABLE ROW LEVEL SECURITY;
ALTER TABLE payments ENABLE ROW LEVEL SECURITY;
ALTER TABLE expenses ENABLE ROW LEVEL SECURITY;

-- Users policies
CREATE POLICY "Users can read all users" ON users
    FOR SELECT USING (true);

CREATE POLICY "Only admins can create users" ON users
    FOR INSERT WITH CHECK (
        EXISTS (
            SELECT 1 FROM users
            WHERE id = auth.uid() AND role = 'admin'
        )
    );

CREATE POLICY "Users can update own profile or admins can update any" ON users
    FOR UPDATE USING (
        id = auth.uid() OR
        EXISTS (
            SELECT 1 FROM users
            WHERE id = auth.uid() AND role = 'admin'
        )
    );

CREATE POLICY "Only admins can delete users" ON users
    FOR DELETE USING (
        EXISTS (
            SELECT 1 FROM users
            WHERE id = auth.uid() AND role = 'admin'
        )
    );

-- Players policies
CREATE POLICY "Authenticated users can read players" ON players
    FOR SELECT USING (true);

CREATE POLICY "Authenticated users can create players" ON players
    FOR INSERT WITH CHECK (true);

CREATE POLICY "Authenticated users can update players" ON players
    FOR UPDATE USING (true);

CREATE POLICY "Authenticated users can delete players" ON players
    FOR DELETE USING (true);

-- Match days policies
CREATE POLICY "Authenticated users can read match days" ON match_days
    FOR SELECT USING (true);

CREATE POLICY "Authenticated users can create match days" ON match_days
    FOR INSERT WITH CHECK (true);

CREATE POLICY "Authenticated users can update match days" ON match_days
    FOR UPDATE USING (true);

CREATE POLICY "Authenticated users can delete match days" ON match_days
    FOR DELETE USING (true);

-- Payments policies
CREATE POLICY "Authenticated users can read payments" ON payments
    FOR SELECT USING (true);

CREATE POLICY "Authenticated users can create payments" ON payments
    FOR INSERT WITH CHECK (true);

CREATE POLICY "Authenticated users can update payments" ON payments
    FOR UPDATE USING (true);

CREATE POLICY "Authenticated users can delete payments" ON payments
    FOR DELETE USING (true);

-- Expenses policies
CREATE POLICY "Authenticated users can read expenses" ON expenses
    FOR SELECT USING (true);

CREATE POLICY "Authenticated users can create expenses" ON expenses
    FOR INSERT WITH CHECK (true);

CREATE POLICY "Authenticated users can update expenses" ON expenses
    FOR UPDATE USING (true);

CREATE POLICY "Authenticated users can delete expenses" ON expenses
    FOR DELETE USING (true);

-- ============================================
-- HELPER VIEWS
-- ============================================
-- View for payment summary statistics
CREATE OR REPLACE VIEW payment_summary AS
SELECT
    COUNT(*) as total_payments,
    SUM(amount) as total_amount,
    SUM(CASE WHEN payment_type = 'annual' THEN amount ELSE 0 END) as annual_total,
    SUM(CASE WHEN payment_type = 'monthly' THEN amount ELSE 0 END) as monthly_total,
    SUM(CASE WHEN payment_type = 'pitch' THEN amount ELSE 0 END) as pitch_total,
    SUM(CASE WHEN payment_type = 'matchday' THEN amount ELSE 0 END) as matchday_total
FROM payments;

-- View for player payment status
CREATE OR REPLACE VIEW player_payment_status AS
SELECT
    p.id,
    p.name,
    p.phone,
    p.annual,
    p.monthly,
    p.pitch,
    COALESCE(SUM(CASE WHEN pay.payment_type = 'annual' THEN pay.amount ELSE 0 END), 0) as annual_paid,
    COALESCE(SUM(CASE WHEN pay.payment_type = 'monthly' THEN pay.amount ELSE 0 END), 0) as monthly_paid,
    COALESCE(SUM(CASE WHEN pay.payment_type = 'pitch' THEN pay.amount ELSE 0 END), 0) as pitch_paid
FROM players p
LEFT JOIN payments pay ON pay.player_id = p.id
GROUP BY p.id, p.name, p.phone, p.annual, p.monthly, p.pitch;

