"""SQLite/files for loopback development; private S3/DynamoDB for AWS."""
import os
import sqlite3
from pathlib import Path


class LocalStore:
    def __init__(self, root: str):
        self.root = Path(root)
        (self.root / "images").mkdir(parents=True, exist_ok=True)
        self.database = self.root / "shares.sqlite3"
        with self.connect() as db:
            db.execute("CREATE TABLE IF NOT EXISTS shares (id TEXT PRIMARY KEY, owner TEXT NOT NULL, title TEXT NOT NULL, created_at INTEGER NOT NULL, expires_at INTEGER NOT NULL, revoked INTEGER NOT NULL DEFAULT 0)")

    def connect(self):
        db = sqlite3.connect(self.database, timeout=10)
        db.row_factory = sqlite3.Row
        return db

    def create(self, item: dict, png: bytes):
        path = self.root / "images" / (item["id"] + ".png")
        path.write_bytes(png)
        try:
            with self.connect() as db:
                db.execute("INSERT INTO shares VALUES (:id, :owner, :title, :created_at, :expires_at, :revoked)", item)
        except Exception:
            path.unlink(missing_ok=True)
            raise

    def get(self, token: str):
        with self.connect() as db:
            row = db.execute("SELECT * FROM shares WHERE id=?", (token,)).fetchone()
        return dict(row) if row else None

    def list(self, owner: str):
        with self.connect() as db:
            return [dict(r) for r in db.execute("SELECT * FROM shares WHERE owner=? ORDER BY created_at DESC LIMIT 100", (owner,)).fetchall()]

    def read(self, item: dict):
        return (self.root / "images" / (item["id"] + ".png")).read_bytes()

    def revoke(self, item: dict):
        with self.connect() as db:
            db.execute("UPDATE shares SET revoked=1 WHERE id=? AND owner=?", (item["id"], item["owner"]))
        (self.root / "images" / (item["id"] + ".png")).unlink(missing_ok=True)


class AwsStore:
    def __init__(self):
        import boto3
        self.s3 = boto3.client("s3")
        self.bucket = os.environ["SHARES_BUCKET"]
        self.table = boto3.resource("dynamodb").Table(os.environ["SHARES_TABLE"])

    def create(self, item: dict, png: bytes):
        key = "published/" + item["id"] + ".png"
        self.s3.put_object(Bucket=self.bucket, Key=key, Body=png, ContentType="image/png", CacheControl="no-store")
        try:
            self.table.put_item(Item={**item, "ttl": item["expires_at"] + 86400}, ConditionExpression="attribute_not_exists(id)")
        except Exception:
            self.s3.delete_object(Bucket=self.bucket, Key=key)
            raise

    def get(self, token: str):
        # Read current revocation state rather than an eventually consistent copy.
        return self.table.get_item(Key={"id": token}, ConsistentRead=True).get("Item")

    def list(self, owner: str):
        from boto3.dynamodb.conditions import Key
        return self.table.query(IndexName="ByOwner", KeyConditionExpression=Key("owner").eq(owner), ScanIndexForward=False, Limit=100).get("Items", [])

    def read(self, item: dict):
        response = self.s3.get_object(Bucket=self.bucket, Key="published/" + item["id"] + ".png")
        return response["Body"].read()

    def revoke(self, item: dict):
        self.table.update_item(Key={"id": item["id"]}, UpdateExpression="SET revoked=:yes", ConditionExpression="#owner=:owner", ExpressionAttributeNames={"#owner": "owner"}, ExpressionAttributeValues={":yes": 1, ":owner": item["owner"]})
        self.s3.delete_object(Bucket=self.bucket, Key="published/" + item["id"] + ".png")
