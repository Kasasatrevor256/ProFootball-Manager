-- Fixed players import script
-- Converts match_day from DECIMAL to INTEGER and removes table modification statements

-- Remove any existing table modification statements before running
-- This script only contains INSERT statements with proper data types

INSERT INTO players (id, name, phone, annual, monthly, pitch, match_day, created_at, updated_at) 
VALUES 
('7229d0b2-c1a7-403c-b0eb-d4143116b0e5', 'DENIS ZIMBA WAKABI', '0782045399', 150000.00, 10000.00, 60000.00, NULL, '2025-06-29 15:54:16.357324+00', '2025-06-29 15:54:16.357324+00'),
('74ae582e-0ab9-4709-b75e-c4e9da3252e7', 'KOCHE EMMANUEL', '0759961909', 50000.00, 5000.00, 20000.00, NULL, '2025-06-30 19:33:05.126445+00', '2025-06-30 19:33:05.126445+00')
-- Add all other player rows here, converting match_day DECIMAL to INTEGER:
-- If match_day is 5000.00, use 5000
-- If match_day is NULL, use NULL
ON CONFLICT (id) DO NOTHING;


