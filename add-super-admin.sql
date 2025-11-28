-- Add Super Admin User to Supabase
-- Run this in Supabase SQL Editor
-- Replace the email and password with your desired credentials

-- Enable pgcrypto extension for password hashing
CREATE EXTENSION IF NOT EXISTS pgcrypto;

-- Insert super admin user
-- Replace 'admin@example.com' with your admin email
-- Replace 'admin123' with your desired password
INSERT INTO users (
    name,
    email,
    role,
    status,
    password_hash,
    created_at,
    updated_at
) VALUES (
    'Super Admin',
    'kasasatrevor25@gmail.com',
    'admin',
    'active',
    crypt('Kasasa@3843.', gen_salt('bf', 10)),
    NOW(),
    NOW()
)
ON CONFLICT (email) DO UPDATE
SET 
    role = 'admin',
    status = 'active',
    password_hash = crypt('admin123', gen_salt('bf', 10)),
    updated_at = NOW();

-- Verify the admin was created
SELECT id, name, email, role, status, created_at 
FROM users 
WHERE email = 'admin@example.com';

