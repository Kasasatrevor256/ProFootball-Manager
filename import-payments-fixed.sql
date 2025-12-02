-- Fixed payments import script
-- Removes table modification statements and adds conflict handling

-- IMPORTANT: Remove lines 23-30 from payments_backup.sql (ALTER TABLE, CREATE TABLE statements)
-- Then add ON CONFLICT (id) DO NOTHING; to each INSERT statement

-- Example format (copy all your INSERT statements and add ON CONFLICT):
INSERT INTO payments (id, player_id, player_name, payment_type, amount, date, created_by, created_at, updated_at) 
VALUES ('7c62a83b-48c5-4615-9dc4-23718da35c3b', 'f9e38056-bf07-41cc-9ca8-2cf814add815', 'PATRICK KALUNGI', 'pitch', 20000.00, '2025-07-04', NULL, '2025-07-04 08:04:58.501795+00', '2025-07-04 08:04:58.501795+00')
ON CONFLICT (id) DO NOTHING;

-- Repeat for all payment rows...


