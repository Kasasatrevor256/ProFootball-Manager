# Export Data from PostgreSQL to Firestore

Since you're SSH'd into the server, here's how to export the data:

## Step 1: Export PostgreSQL Data to JSON

On the server, run these commands:

```bash
# Export players
docker-compose exec postgres psql -U postgres -d football_manager -t -A -F"," -c "SELECT json_agg(row_to_json(t)) FROM (SELECT * FROM players) t" > players.json

# Export payments
docker-compose exec postgres psql -U postgres -d football_manager -t -A -F"," -c "SELECT json_agg(row_to_json(t)) FROM (SELECT * FROM payments) t" > payments.json

# Export expenses
docker-compose exec postgres psql -U postgres -d football_manager -t -A -F"," -c "SELECT json_agg(row_to_json(t)) FROM (SELECT * FROM expenses) t" > expenses.json

# Export users
docker-compose exec postgres psql -U postgres -d football_manager -t -A -F"," -c "SELECT json_agg(row_to_json(t)) FROM (SELECT * FROM users) t" > users.json
```

## Step 2: Copy Files to Your Local Machine

From your **local machine** (new terminal):

```bash
scp root@srv887319:/path/to/docker-compose-directory/*.json ~/Desktop/Projects/Munyonyo\ Soccer\ Team/
```

## Step 3: Run Migration Script Locally

The migration script will read these JSON files and import to Firestore.

---

## OR - Simpler: Use pg_dump

```bash
# On the server, create a complete backup
docker-compose exec postgres pg_dump -U postgres -d football_manager --data-only --inserts > backup.sql

# Copy to local
# scp root@srv887319:/path/backup.sql ~/Desktop/
```

Then I can create a script to parse and import this data.
