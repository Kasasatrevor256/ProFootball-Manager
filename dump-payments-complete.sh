#!/bin/bash

# Complete dump of all payments - ensures no truncation
# This method uses COPY which handles large datasets better

echo "Dumping all payments data..."

# Method 1: Using COPY (CSV format - most reliable for large datasets)
ssh root@69.62.124.87 "docker exec -i football_manager_db psql -U postgres -d football_manager" << 'EOF' > payments_all.csv
\copy (SELECT * FROM payments ORDER BY created_at) TO STDOUT WITH (FORMAT csv, HEADER true, DELIMITER ',');
EOF

# Method 2: Using pg_dump with no limits (SQL INSERT format)
ssh root@69.62.124.87 "docker exec -i football_manager_db pg_dump -U postgres -d football_manager -t payments --data-only --column-inserts --no-owner --no-acl --verbose" > payments_datas.sql 2>&1

# Method 3: Direct psql query to count and verify
echo "Verifying record count..."
ssh root@69.62.124.87 "docker exec -i football_manager_db psql -U postgres -d football_manager -c 'SELECT COUNT(*) FROM payments;'"

echo "Done! Check payments_datas.sql for all records"

