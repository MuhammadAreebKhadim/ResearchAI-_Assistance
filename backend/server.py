"""
ResearchAI Backend Server
Built with Python standard library (http.server + sqlite3)
Zero C-extension dependencies - 100% compatible with Windows Application Control / WDAC.
Features:
- Google OAuth / Demo Authentication
- Chat Sessions with strict 8-Session Quota (Gemini-style)
- Cascading Session Deletion to free quota slots
- Message History Persistence
- Full CORS support for standalone preview and Next.js frontend
"""

import http.server
import json
import os
import sqlite3
import sys
import time
import uuid
import hmac
import hashlib
import base64
import urllib.request
import urllib.error
import urllib.parse
from datetime import datetime, timezone

PORT = 8000
DB_PATH = os.path.join(os.path.dirname(os.path.abspath(__file__)), "research_assistant.db")
SECRET_KEY = os.environ.get("JWT_SECRET", "research-assistant-super-secret-key-2026")
MAX_SESSIONS_PER_USER = 8

# Initialize SQLite tables
def init_db():
    conn = sqlite3.connect(DB_PATH)
    c = conn.cursor()
    c.execute("PRAGMA foreign_keys = ON;")
    
    c.execute("""
    CREATE TABLE IF NOT EXISTS users (
        id TEXT PRIMARY KEY,
        email TEXT UNIQUE NOT NULL,
        name TEXT NOT NULL,
        avatar_url TEXT,
        google_id TEXT UNIQUE,
        created_at TEXT NOT NULL
    )
    """)
    
    c.execute("""
    CREATE TABLE IF NOT EXISTS conversations (
        id TEXT PRIMARY KEY,
        user_id TEXT NOT NULL,
        title TEXT NOT NULL,
        created_at TEXT NOT NULL,
        updated_at TEXT NOT NULL,
        FOREIGN KEY (user_id) REFERENCES users(id) ON DELETE CASCADE
    )
    """)
    
    c.execute("""
    CREATE TABLE IF NOT EXISTS messages (
        id TEXT PRIMARY KEY,
        conversation_id TEXT NOT NULL,
        role TEXT NOT NULL,
        content TEXT NOT NULL,
        sources TEXT,
        created_at TEXT NOT NULL,
        FOREIGN KEY (conversation_id) REFERENCES conversations(id) ON DELETE CASCADE
    )
    """)
    
    # Create default demo user if not exists
    c.execute("SELECT id FROM users WHERE id = 'demo-user-123'")
    if not c.fetchone():
        c.execute(
            "INSERT INTO users (id, email, name, avatar_url, google_id, created_at) VALUES (?, ?, ?, ?, ?, ?)",
            (
                "demo-user-123",
                "researcher@example.com",
                "Dr. Researcher",
                "https://api.dicebear.com/7.x/bottts/svg?seed=Researcher",
                "demo-google-id",
                datetime.now(timezone.utc).isoformat()
            )
        )
    
    conn.commit()
    conn.close()

# Simple HMAC token generator & validator (Standard Library)
def create_access_token(user_id: str, email: str, name: str) -> str:
    payload = {
        "sub": user_id,
        "email": email,
        "name": name,
        "exp": int(time.time()) + (30 * 24 * 3600) # 30 days
    }
    payload_json = json.dumps(payload, separators=(',', ':'))
    payload_b64 = base64.urlsafe_b64encode(payload_json.encode()).decode().rstrip('=')
    signature = hmac.new(SECRET_KEY.encode(), payload_b64.encode(), hashlib.sha256).hexdigest()
    return f"{payload_b64}.{signature}"

def decode_access_token(token: str):
    try:
        parts = token.split('.')
        if len(parts) != 2:
            return None
        payload_b64, signature = parts
        expected_sig = hmac.new(SECRET_KEY.encode(), payload_b64.encode(), hashlib.sha256).hexdigest()
        if not hmac.compare_digest(signature, expected_sig):
            return None
        # Add back padding if needed
        padding = 4 - (len(payload_b64) % 4)
        if padding != 4:
            payload_b64 += '=' * padding
        payload = json.loads(base64.urlsafe_b64decode(payload_b64).decode())
        if payload.get("exp", 0) < time.time():
            return None
        return payload
    except Exception:
        return None

class RequestHandler(http.server.BaseHTTPRequestHandler):
    def end_headers(self):
        self.send_header("Access-Control-Allow-Origin", "*")
        self.send_header("Access-Control-Allow-Methods", "GET, POST, PATCH, DELETE, OPTIONS")
        self.send_header("Access-Control-Allow-Headers", "Content-Type, Authorization, X-Requested-With")
        super().end_headers()

    def do_OPTIONS(self):
        self.send_response(200)
        self.send_header("Content-Length", "0")
        self.end_headers()

    def send_json(self, status_code: int, data: dict):
        body = json.dumps(data).encode("utf-8")
        self.send_response(status_code)
        self.send_header("Content-Type", "application/json")
        self.send_header("Content-Length", str(len(body)))
        self.end_headers()
        self.wfile.write(body)

    def send_error_json(self, status_code: int, detail: str, code: str = None):
        res = {"detail": detail}
        if code:
            res["code"] = code
        self.send_json(status_code, res)

    def get_auth_user(self):
        auth_header = self.headers.get("Authorization", "")
        if not auth_header or not auth_header.startswith("Bearer "):
            return None
        
        token = auth_header.split(" ")[1]
        payload = decode_access_token(token)
        if not payload or not payload.get("sub"):
            return None
        
        conn = sqlite3.connect(DB_PATH)
        c = conn.cursor()
        c.execute("SELECT id, email, name, avatar_url FROM users WHERE id = ?", (payload["sub"],))
        row = c.fetchone()
        conn.close()
        if row:
            return {"id": row[0], "email": row[1], "name": row[2], "avatar_url": row[3]}
        return None

    def read_json_body(self):
        content_length = int(self.headers.get("Content-Length", 0))
        if content_length == 0:
            return {}
        raw = self.rfile.read(content_length).decode("utf-8")
        try:
            return json.loads(raw)
        except Exception:
            return {}

    # ------------------ GET ROUTES ------------------
    def do_GET(self):
        parsed = urllib.parse.urlparse(self.path)
        path = parsed.path.rstrip("/")
        if not path:
            path = "/"

        # Health
        if path == "/api/health" or path == "/":
            return self.send_json(200, {
                "status": "online",
                "service": "ResearchAI API",
                "version": "2.0.0",
                "max_sessions_per_user": MAX_SESSIONS_PER_USER
            })

        # Auth Config (Public Google Client ID)
        if path == "/api/auth/config":
            return self.send_json(200, {
                "google_client_id": os.environ.get("GOOGLE_CLIENT_ID", "")
            })

        # Auth Me
        if path == "/api/auth/me":
            user = self.get_auth_user()
            if not user:
                return self.send_error_json(401, "Not authenticated")
            return self.send_json(200, {"user": user})

        # List Chat Sessions
        if path == "/api/sessions":
            user = self.get_auth_user()
            if not user:
                return self.send_error_json(401, "Not authenticated")
            
            conn = sqlite3.connect(DB_PATH)
            c = conn.cursor()
            c.execute("""
                SELECT c.id, c.title, c.created_at, c.updated_at, COUNT(m.id) as msg_count
                FROM conversations c
                LEFT JOIN messages m ON c.id = m.conversation_id
                WHERE c.user_id = ?
                GROUP BY c.id
                ORDER BY c.updated_at DESC
            """, (user["id"],))
            rows = c.fetchall()
            conn.close()

            sessions = []
            for r in rows:
                sessions.append({
                    "id": r[0],
                    "title": r[1],
                    "created_at": r[2],
                    "updated_at": r[3],
                    "message_count": r[4]
                })

            total = len(sessions)
            remaining = max(0, MAX_SESSIONS_PER_USER - total)
            return self.send_json(200, {
                "sessions": sessions,
                "total": total,
                "max_sessions": MAX_SESSIONS_PER_USER,
                "remaining": remaining,
                "quota_full": total >= MAX_SESSIONS_PER_USER
            })

        # Get Single Session with Messages
        if path.startswith("/api/sessions/"):
            session_id = path.replace("/api/sessions/", "").strip()
            user = self.get_auth_user()
            if not user:
                return self.send_error_json(401, "Not authenticated")
            
            conn = sqlite3.connect(DB_PATH)
            c = conn.cursor()
            c.execute("SELECT id, user_id, title, created_at, updated_at FROM conversations WHERE id = ? AND user_id = ?", (session_id, user["id"]))
            conv = c.fetchone()
            if not conv:
                conn.close()
                return self.send_error_json(404, "Session not found")
            
            c.execute("SELECT id, role, content, sources, created_at FROM messages WHERE conversation_id = ? ORDER BY created_at ASC", (session_id,))
            msg_rows = c.fetchall()
            conn.close()

            messages = []
            for m in msg_rows:
                sources = []
                if m[3]:
                    try:
                        sources = json.loads(m[3])
                    except Exception:
                        sources = []
                messages.append({
                    "id": m[0],
                    "role": m[1],
                    "content": m[2],
                    "sources": sources,
                    "created_at": m[4]
                })

            return self.send_json(200, {
                "id": conv[0],
                "user_id": conv[1],
                "title": conv[2],
                "created_at": conv[3],
                "updated_at": conv[4],
                "messages": messages
            })

        self.send_error_json(404, "Endpoint not found")

    # ------------------ POST ROUTES ------------------
    def do_POST(self):
        parsed = urllib.parse.urlparse(self.path)
        path = parsed.path.rstrip("/")
        body = self.read_json_body()

        # Save/Update Google Client ID Config
        if path == "/api/auth/config":
            client_id = body.get("google_client_id", "").strip()
            if client_id:
                os.environ["GOOGLE_CLIENT_ID"] = client_id
                env_path = os.path.join(os.path.dirname(os.path.abspath(__file__)), ".env")
                try:
                    content = ""
                    if os.path.exists(env_path):
                        with open(env_path, 'r', encoding='utf-8') as f:
                            content = f.read()
                    import re
                    if "GOOGLE_CLIENT_ID=" in content:
                        content = re.sub(r'GOOGLE_CLIENT_ID=.*', f'GOOGLE_CLIENT_ID={client_id}', content)
                    else:
                        content += f"\nGOOGLE_CLIENT_ID={client_id}\n"
                    with open(env_path, 'w', encoding='utf-8') as f:
                        f.write(content)
                except Exception:
                    pass
            return self.send_json(200, {"success": True, "google_client_id": os.environ.get("GOOGLE_CLIENT_ID", "")})

        # Google OAuth Login / Real User Sign-in
        if path == "/api/chat":
            api_key = os.environ.get("OPENAI_API_KEY", "")
            if not api_key:
                env_path = os.path.join(os.path.dirname(os.path.dirname(os.path.abspath(__file__))), ".env")
                if os.path.exists(env_path):
                    with open(env_path, "r", encoding="utf-8") as f:
                        for line in f:
                            if line.startswith("OPENAI_API_KEY="):
                                api_key = line.strip().split("=", 1)[1].strip('"\'')
            if not api_key:
                return self.send_error_json(500, "OPENAI_API_KEY is not configured on server")

            messages = body.get("messages", [])
            model = body.get("model", "gpt-6-luna")

            req_payload = {"model": model, "messages": messages, "stream": True}
            if "luna" not in model.lower() and "o1" not in model.lower() and "o3" not in model.lower():
                req_payload["temperature"] = 0.2

            payload = json.dumps(req_payload).encode("utf-8")
            req = urllib.request.Request(
                "https://api.openai.com/v1/chat/completions",
                data=payload,
                headers={
                    "Content-Type": "application/json",
                    "Authorization": f"Bearer {api_key}"
                },
                method="POST"
            )
            try:
                with urllib.request.urlopen(req, timeout=60) as resp:
                    self.send_response(200)
                    self.send_header("Content-Type", "text/event-stream; charset=utf-8")
                    self.send_header("Cache-Control", "no-cache")
                    self.send_header("Connection", "keep-alive")
                    self.send_header("Access-Control-Allow-Origin", "*")
                    self.end_headers()
                    while True:
                        chunk = resp.read(1024)
                        if not chunk:
                            break
                        self.wfile.write(chunk)
                        self.wfile.flush()
                return
            except urllib.error.HTTPError as e:
                err_text = e.read().decode("utf-8")
                return self.send_error_json(e.code, err_text)
            except Exception as e:
                return self.send_error_json(500, str(e))

        # Google OAuth Login / Real User Sign-in
        if path == "/api/auth/google":
            credential = body.get("credential", "")
            user_info = None

            if credential and credential != "demo":
                # Real Google ID token: verify via Google tokeninfo endpoint
                try:
                    verify_url = f"https://oauth2.googleapis.com/tokeninfo?id_token={urllib.parse.quote(credential)}"
                    req = urllib.request.Request(verify_url, headers={"User-Agent": "ResearchAI-Backend"})
                    with urllib.request.urlopen(req, timeout=5) as resp:
                        token_info = json.loads(resp.read().decode())
                        user_info = {
                            "email": token_info.get("email"),
                            "name": token_info.get("name", "Google User"),
                            "avatar_url": token_info.get("picture"),
                            "google_id": token_info.get("sub")
                        }
                except Exception as e:
                    # Direct client-decoded real Google token payload pass-through
                    user_info = {
                        "email": body.get("email"),
                        "name": body.get("name", "Google User"),
                        "avatar_url": body.get("avatar_url") or f"https://api.dicebear.com/7.x/bottts/svg?seed={urllib.parse.quote(body.get('name', 'GoogleUser'))}",
                        "google_id": "google-id-" + hashlib.md5((body.get("email") or str(uuid.uuid4())).encode()).hexdigest()[:8]
                    }
            else:
                # Direct real email & name sign in
                email = body.get("email", "").strip()
                name = body.get("name", "").strip()
                if email:
                    user_info = {
                        "email": email,
                        "name": name or email.split("@")[0],
                        "avatar_url": body.get("avatar_url") or f"https://api.dicebear.com/7.x/bottts/svg?seed={urllib.parse.quote(name or email)}",
                        "google_id": "user-" + hashlib.md5(email.encode()).hexdigest()[:8]
                    }

            if not user_info or not user_info.get("email"):
                return self.send_error_json(400, "Invalid Google credential or token")

            # Upsert user into SQLite
            conn = sqlite3.connect(DB_PATH)
            c = conn.cursor()
            c.execute("SELECT id, email, name, avatar_url FROM users WHERE email = ?", (user_info["email"],))
            existing = c.fetchone()
            now_iso = datetime.now(timezone.utc).isoformat()

            if existing:
                user_id = existing[0]
                c.execute(
                    "UPDATE users SET name = ?, avatar_url = ?, google_id = ? WHERE id = ?",
                    (user_info["name"], user_info["avatar_url"], user_info["google_id"], user_id)
                )
            else:
                user_id = str(uuid.uuid4())
                c.execute(
                    "INSERT INTO users (id, email, name, avatar_url, google_id, created_at) VALUES (?, ?, ?, ?, ?, ?)",
                    (user_id, user_info["email"], user_info["name"], user_info["avatar_url"], user_info["google_id"], now_iso)
                )
            conn.commit()
            conn.close()

            access_token = create_access_token(user_id, user_info["email"], user_info["name"])
            return self.send_json(200, {
                "access_token": access_token,
                "token_type": "bearer",
                "user": {
                    "id": user_id,
                    "email": user_info["email"],
                    "name": user_info["name"],
                    "avatar_url": user_info["avatar_url"]
                }
            })

        # Create New Chat Session (Enforces Strict 8-Session Quota)
        if path == "/api/sessions":
            user = self.get_auth_user()
            if not user:
                return self.send_error_json(401, "Not authenticated")
            
            conn = sqlite3.connect(DB_PATH)
            c = conn.cursor()
            c.execute("SELECT COUNT(*) FROM conversations WHERE user_id = ?", (user["id"],))
            current_count = c.fetchone()[0]

            # QUOTA CHECK: STRICT 8 SESSIONS LIMIT (Gemini-style)
            if current_count >= MAX_SESSIONS_PER_USER:
                conn.close()
                return self.send_json(400, {
                    "detail": f"Storage limit reached ({current_count}/{MAX_SESSIONS_PER_USER} sessions). Please delete an existing session to start a new chat.",
                    "code": "QUOTA_EXCEEDED",
                    "total": current_count,
                    "max_sessions": MAX_SESSIONS_PER_USER,
                    "remaining": 0
                })

            session_id = str(uuid.uuid4())
            title = body.get("title", "New Research Chat")
            now_iso = datetime.now(timezone.utc).isoformat()

            c.execute(
                "INSERT INTO conversations (id, user_id, title, created_at, updated_at) VALUES (?, ?, ?, ?, ?)",
                (session_id, user["id"], title, now_iso, now_iso)
            )
            conn.commit()
            conn.close()

            new_total = current_count + 1
            return self.send_json(201, {
                "id": session_id,
                "user_id": user["id"],
                "title": title,
                "created_at": now_iso,
                "updated_at": now_iso,
                "total": new_total,
                "max_sessions": MAX_SESSIONS_PER_USER,
                "remaining": MAX_SESSIONS_PER_USER - new_total
            })

        # Append Message to Session
        if path.startswith("/api/sessions/") and path.endswith("/messages"):
            session_id = path.replace("/api/sessions/", "").replace("/messages", "").strip()
            user = self.get_auth_user()
            if not user:
                return self.send_error_json(401, "Not authenticated")
            
            role = body.get("role", "user")
            content = body.get("content", "")
            sources = body.get("sources", [])
            sources_json = json.dumps(sources) if sources else None

            if not content:
                return self.send_error_json(400, "Content cannot be empty")

            conn = sqlite3.connect(DB_PATH)
            c = conn.cursor()
            c.execute("SELECT id, title FROM conversations WHERE id = ? AND user_id = ?", (session_id, user["id"]))
            conv = c.fetchone()
            if not conv:
                conn.close()
                return self.send_error_json(404, "Session not found")

            msg_id = str(uuid.uuid4())
            now_iso = datetime.now(timezone.utc).isoformat()
            c.execute(
                "INSERT INTO messages (id, conversation_id, role, content, sources, created_at) VALUES (?, ?, ?, ?, ?, ?)",
                (msg_id, session_id, role, content, sources_json, now_iso)
            )

            # Auto-update session title if it's default and message is from user
            if conv[1] in ("New Research Chat", "New Chat", "Untitled Chat") and role == "user":
                clean_title = content.strip().replace("\n", " ")
                if len(clean_title) > 40:
                    clean_title = clean_title[:37] + "..."
                c.execute("UPDATE conversations SET title = ?, updated_at = ? WHERE id = ?", (clean_title, now_iso, session_id))
            else:
                c.execute("UPDATE conversations SET updated_at = ? WHERE id = ?", (now_iso, session_id))

            conn.commit()
            conn.close()

            return self.send_json(201, {
                "id": msg_id,
                "conversation_id": session_id,
                "role": role,
                "content": content,
                "sources": sources,
                "created_at": now_iso
            })

        self.send_error_json(404, "Endpoint not found")

    # ------------------ PATCH ROUTES ------------------
    def do_PATCH(self):
        parsed = urllib.parse.urlparse(self.path)
        path = parsed.path.rstrip("/")
        body = self.read_json_body()

        # Rename Session Title
        if path.startswith("/api/sessions/"):
            session_id = path.replace("/api/sessions/", "").strip()
            user = self.get_auth_user()
            if not user:
                return self.send_error_json(401, "Not authenticated")

            new_title = body.get("title", "").strip()
            if not new_title:
                return self.send_error_json(400, "Title cannot be empty")

            now_iso = datetime.now(timezone.utc).isoformat()
            conn = sqlite3.connect(DB_PATH)
            c = conn.cursor()
            c.execute("UPDATE conversations SET title = ?, updated_at = ? WHERE id = ? AND user_id = ?", (new_title, now_iso, session_id, user["id"]))
            if c.rowcount == 0:
                conn.close()
                return self.send_error_json(404, "Session not found")
            conn.commit()
            conn.close()

            return self.send_json(200, {
                "id": session_id,
                "title": new_title,
                "updated_at": now_iso
            })

        self.send_error_json(404, "Endpoint not found")

    # ------------------ DELETE ROUTES ------------------
    def do_DELETE(self):
        parsed = urllib.parse.urlparse(self.path)
        path = parsed.path.rstrip("/")

        # Delete Session & Free Quota Slot
        if path.startswith("/api/sessions/"):
            session_id = path.replace("/api/sessions/", "").strip()
            user = self.get_auth_user()
            if not user:
                return self.send_error_json(401, "Not authenticated")

            conn = sqlite3.connect(DB_PATH)
            c = conn.cursor()
            c.execute("PRAGMA foreign_keys = ON;")
            # Delete messages first (or via cascade)
            c.execute("DELETE FROM messages WHERE conversation_id = ?", (session_id,))
            c.execute("DELETE FROM conversations WHERE id = ? AND user_id = ?", (session_id, user["id"]))
            deleted = c.rowcount > 0
            
            # Fetch remaining count
            c.execute("SELECT COUNT(*) FROM conversations WHERE user_id = ?", (user["id"],))
            new_count = c.fetchone()[0]
            conn.commit()
            conn.close()

            if not deleted:
                return self.send_error_json(404, "Session not found")

            return self.send_json(200, {
                "deleted": True,
                "session_id": session_id,
                "total": new_count,
                "max_sessions": MAX_SESSIONS_PER_USER,
                "remaining": MAX_SESSIONS_PER_USER - new_count
            })

        self.send_error_json(404, "Endpoint not found")

    def log_message(self, format, *args):
        # Quiet log for clean console output
        sys.stderr.write(f"[{datetime.now().strftime('%H:%M:%S')}] {args[0]} {args[1]}\n")

def run():
    init_db()
    server_address = ('', PORT)
    httpd = http.server.ThreadingHTTPServer(server_address, RequestHandler)
    print(f"ResearchAI Backend running on http://127.0.0.1:{PORT}")
    print(f"Database: {DB_PATH}")
    print(f"Chat Session Quota: Strictly {MAX_SESSIONS_PER_USER} sessions max (Gemini-style)")
    try:
        httpd.serve_forever()
    except KeyboardInterrupt:
        print("\nShutting down server.")
        httpd.server_close()

if __name__ == "__main__":
    run()
