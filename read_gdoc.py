"""
Read Google Doc (.gdoc) files from Google Drive for Desktop.

Usage:
  python read_gdoc.py "G:/My Drive/path/to/file.gdoc"
  python read_gdoc.py --doc-id 1BDuu4uj4K5VKpEuitHz4wYeNxx230aGfKgUewAGbIxg

First-time setup:
  1. Go to https://console.cloud.google.com/
  2. Create a project (or select existing)
  3. Enable the Google Docs API: APIs & Services > Enable APIs > search "Google Docs API" > Enable
  4. Create OAuth credentials: APIs & Services > Credentials > Create Credentials > OAuth client ID
     - Application type: Desktop app
     - Download the JSON file
  5. Save as C:/Projects/ExpenseTracker/gdoc_credentials.json
  6. Run this script - it will open a browser for one-time authorization
"""

import sys
import os
import json
import sqlite3
import re

SCRIPT_DIR = os.path.dirname(os.path.abspath(__file__))
CREDENTIALS_FILE = os.path.join(SCRIPT_DIR, "gdoc_credentials.json")
TOKEN_FILE = os.path.join(SCRIPT_DIR, "gdoc_token.json")
DRIVEFSDIR = os.path.join(os.environ["LOCALAPPDATA"], "Google", "DriveFS")
SCOPES = ["https://www.googleapis.com/auth/documents.readonly"]


def find_drivefsdb():
    """Find the DriveFS metadata database."""
    if not os.path.isdir(DRIVEFSDIR):
        return None
    for entry in os.listdir(DRIVEFSDIR):
        db_path = os.path.join(DRIVEFSDIR, entry, "metadata_sqlite_db")
        if os.path.isfile(db_path):
            return db_path
    return None


def get_doc_id_from_gdoc(gdoc_path):
    """Extract the Google Doc ID from the DriveFS metadata database."""
    filename = os.path.basename(gdoc_path)
    db_path = find_drivefsdb()
    if not db_path:
        print("ERROR: Could not find DriveFS metadata database.", file=sys.stderr)
        sys.exit(1)

    conn = sqlite3.connect(db_path)
    cursor = conn.cursor()
    cursor.execute(
        "SELECT id FROM items WHERE local_title = ? AND mime_type = 'application/vnd.google-apps.document'",
        (filename,)
    )
    row = cursor.fetchone()
    conn.close()

    if not row:
        # Try without extension
        base = os.path.splitext(filename)[0]
        conn = sqlite3.connect(db_path)
        cursor = conn.cursor()
        cursor.execute(
            "SELECT id FROM items WHERE local_title LIKE ? AND mime_type = 'application/vnd.google-apps.document'",
            (f"%{base}%",)
        )
        row = cursor.fetchone()
        conn.close()

    if not row:
        print(f"ERROR: Could not find doc ID for '{filename}' in DriveFS metadata.", file=sys.stderr)
        sys.exit(1)

    return row[0]


def get_credentials():
    """Get or refresh OAuth credentials."""
    from google.oauth2.credentials import Credentials
    from google_auth_oauthlib.flow import InstalledAppFlow
    from google.auth.transport.requests import Request

    creds = None

    if os.path.exists(TOKEN_FILE):
        creds = Credentials.from_authorized_user_file(TOKEN_FILE, SCOPES)

    if not creds or not creds.valid:
        if creds and creds.expired and creds.refresh_token:
            creds.refresh(Request())
        else:
            if not os.path.exists(CREDENTIALS_FILE):
                print("ERROR: gdoc_credentials.json not found.", file=sys.stderr)
                print("", file=sys.stderr)
                print("Setup instructions:", file=sys.stderr)
                print("  1. Go to https://console.cloud.google.com/", file=sys.stderr)
                print("  2. Create/select a project", file=sys.stderr)
                print("  3. Enable the Google Docs API", file=sys.stderr)
                print("  4. Create OAuth credentials (Desktop app)", file=sys.stderr)
                print(f"  5. Save the JSON as: {CREDENTIALS_FILE}", file=sys.stderr)
                sys.exit(1)

            flow = InstalledAppFlow.from_client_secrets_file(CREDENTIALS_FILE, SCOPES)
            creds = flow.run_local_server(port=0)

        with open(TOKEN_FILE, "w") as f:
            f.write(creds.to_json())

    return creds


def read_google_doc(doc_id):
    """Fetch the content of a Google Doc as plain text."""
    from googleapiclient.discovery import build

    creds = get_credentials()
    service = build("docs", "v1", credentials=creds)
    doc = service.documents().get(documentId=doc_id).execute()

    text_parts = []
    for element in doc.get("body", {}).get("content", []):
        if "paragraph" in element:
            for pe in element["paragraph"].get("elements", []):
                if "textRun" in pe:
                    text_parts.append(pe["textRun"]["content"])

    return "".join(text_parts)


def main():
    if len(sys.argv) < 2:
        print("Usage: python read_gdoc.py <path-to.gdoc>", file=sys.stderr)
        print("       python read_gdoc.py --doc-id <DOCUMENT_ID>", file=sys.stderr)
        sys.exit(1)

    if sys.argv[1] == "--doc-id":
        doc_id = sys.argv[2]
    else:
        gdoc_path = sys.argv[1]
        doc_id = get_doc_id_from_gdoc(gdoc_path)

    text = read_google_doc(doc_id)
    print(text)


if __name__ == "__main__":
    main()
