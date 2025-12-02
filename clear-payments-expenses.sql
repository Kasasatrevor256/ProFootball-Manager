-- Clear all payments and expenses data
-- Run this in Supabase SQL Editor before importing new data

-- Clear payments table
DELETE FROM payments;

-- Clear expenses table
DELETE FROM expenses;

-- Optional: Reset sequences if you're using auto-increment IDs
-- (Not needed for UUID primary keys)

-- Verify tables are empty
SELECT COUNT(*) as payments_count FROM payments;
SELECT COUNT(*) as expenses_count FROM expenses;


