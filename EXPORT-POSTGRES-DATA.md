# Export PostgreSQL Data - Simple Method

## Step 1: Enter PostgreSQL Container

On the server where Docker is running:

```bash
# Find the postgres container name
docker ps | grep postgres

# Enter the container (replace 'postgres' with actual container name if different)
docker exec -it postgres bash
```

## Step 2: Export All Data to JSON

Inside the container:

```bash
# Create export directory
mkdir -p /tmp/export
cd /tmp/export

# Export players
psql -U postgres -d football_manager -t -A -c "COPY (SELECT row_to_json(t) FROM (SELECT * FROM players) t) TO STDOUT" > players.json

# Export payments
psql -U postgres -d football_manager -t -A -c "COPY (SELECT row_to_json(t) FROM (SELECT * FROM payments) t) TO STDOUT" > payments.json

# Export expenses
psql -U postgres -d football_manager -t -A -c "COPY (SELECT row_to_json(t) FROM (SELECT * FROM expenses) t) TO STDOUT" > expenses.json

# Export users
psql -U postgres -d football_manager -t -A -c "COPY (SELECT row_to_json(t) FROM (SELECT * FROM users) t) TO STDOUT" > users.json

# Exit container
exit
```

## Step 3: Copy Files from Container to Server

On the server (outside container):

```bash
# Copy files from container to server
docker cp postgres:/tmp/export/players.json ./players.json
docker cp postgres:/tmp/export/payments.json ./payments.json
docker cp postgres:/tmp/export/expenses.json ./expenses.json
docker cp postgres:/tmp/export/users.json ./users.json
```

## Step 4: Copy to Your Local Machine

From your **local machine** (new terminal):

```bash
cd ~/Desktop/Projects/Munyonyo\ Soccer\ Team/
scp root@srv887319:~/players.json .
scp root@srv887319:~/payments.json .
scp root@srv887319:~/expenses.json .
scp root@srv887319:~/users.json .
```

## Step 5: Import to Firestore

I'll create a script to import these JSON files to Firestore.

---

## EVEN SIMPLER: pg_dump Method

```bash
# On server, create SQL dump
docker exec postgres pg_dump -U postgres football_manager > football_manager_backup.sql

# Copy to local
scp root@srv887319:~/football_manager_backup.sql ~/Desktop/
```

This creates a complete backup that can be used to restore or migrate data.
