-- Safe import script for payments
-- This will skip any payments that already exist (by ID)

-- First, let's use INSERT with ON CONFLICT to handle duplicates
-- Copy your INSERT statements from payments_backup.sql and add ON CONFLICT DO NOTHING

-- Example format (replace with your actual data):
INSERT INTO payments (id, player_id, player_name, payment_type, amount, date, created_by, created_at, updated_at) 
VALUES ('7c62a83b-48c5-4615-9dc4-23718da35c3b', 'f9e38056-bf07-41cc-9ca8-2cf814add815', 'PATRICK KALUNGI', 'pitch', 20000.00, '2025-07-04', NULL, '2025-07-04 08:04:58.501795+00', '2025-07-04 08:04:58.501795+00')
ON CONFLICT (id) DO NOTHING;

-- Or if you want to update existing records:
-- ON CONFLICT (id) DO UPDATE SET 
--   player_id = EXCLUDED.player_id,
--   player_name = EXCLUDED.player_name,
--   payment_type = EXCLUDED.payment_type,
--   amount = EXCLUDED.amount,
--   date = EXCLUDED.date,
--   updated_at = EXCLUDED.updated_at;


