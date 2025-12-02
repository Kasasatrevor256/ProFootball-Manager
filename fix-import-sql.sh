#!/bin/bash

# Fix players_data.sql - Convert match_day DECIMAL to INTEGER and remove table statements
echo "Fixing players_data.sql..."
sed -i.bak \
  -e '/^ALTER TABLE/d' \
  -e '/^CREATE TABLE/d' \
  -e '/^SET default_tablespace/d' \
  -e '/^SET default_table_access_method/d' \
  -e 's/match_day, \(NULL\|[0-9]*\.[0-9]*\)/match_day, \1/g' \
  -e 's/, \(5000\|20000\|60000\|40000\|80000\|15000\)\.00/, \1/g' \
  -e 's/);$/)\nON CONFLICT (id) DO NOTHING;/' \
  players_data.sql

# Fix payments_backup.sql - Remove table statements and add conflict handling
echo "Fixing payments_backup.sql..."
sed -i.bak \
  -e '/^ALTER TABLE/d' \
  -e '/^CREATE TABLE/d' \
  -e '/^SET default_tablespace/d' \
  -e '/^SET default_table_access_method/d' \
  -e '/^-- Name: payments/d' \
  -e '/^-- Data for Name: payments/d' \
  -e 's/);$/)\nON CONFLICT (id) DO NOTHING;/' \
  payments_backup.sql

echo "Done! Backup files created with .bak extension"
echo "Now you can run the fixed SQL files in Supabase"


