import csv
import firebase_admin
from firebase_admin import credentials, firestore

# 1️⃣ Initialize Firebase
cred = credentials.Certificate("key.json")  # <-- place your Firebase service account JSON here
firebase_admin.initialize_app(cred)
db = firestore.client()

# 2️⃣ CSV file path
csv_file = "payments.csv"

# 3️⃣ Firestore collection name
collection_name = "payments"

# 4️⃣ Open CSV and upload to Firestore
with open(csv_file, newline='', encoding='utf-8') as f:
    reader = csv.DictReader(f)
    for row in reader:
        # Convert numeric fields
        if "amount" in row:
            try:
                row["amount"] = float(row["amount"])
            except ValueError:
                row["amount"] = 0.0

        if "id" in row and row["id"]:  # optional: use CSV 'id' as document ID
            doc_id = str(row["id"])
            db.collection(collection_name).document(doc_id).set(row)
        else:
            db.collection(collection_name).add(row)

print("✅ Payments data uploaded to Firestore successfully!")
