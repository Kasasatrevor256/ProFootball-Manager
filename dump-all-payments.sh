#!/bin/bash

# Dump all payments data without truncation
# This ensures all records are exported

ssh root@69.62.124.87 "docker exec -i football_manager_db psql -U postgres -d football_manager -c \"COPY (SELECT * FROM payments ORDER BY created_at) TO STDOUT WITH (FORMAT csv, HEADER true, DELIMITER ',');\"" > payments_all.csv

# Or if you prefer SQL INSERT format:
ssh root@69.62.124.87 "docker exec -i football_manager_db pg_dump -U postgres -d football_manager -t payments --data-only --column-inserts --no-owner --no-acl" > payments_datas.sql

# Alternative: Use psql to generate INSERT statements
ssh root@69.62.124.87 "docker exec -i football_manager_db psql -U postgres -d football_manager -c \"SELECT 'INSERT INTO payments (id, player_id, player_name, payment_type, amount, date, created_by, created_at, updated_at) VALUES (' || quote_literal(id) || ', ' || quote_literal(player_id) || ', ' || quote_literal(player_name) || ', ' || quote_literal(payment_type) || ', ' || amount || ', ' || quote_literal(date) || ', ' || COALESCE(quote_literal(created_by), 'NULL') || ', ' || quote_literal(created_at) || ', ' || quote_literal(updated_at) || ');' FROM payments ORDER BY created_at;\" -t" > payments_datas.sql


