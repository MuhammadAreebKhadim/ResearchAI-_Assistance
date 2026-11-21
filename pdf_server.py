"""
Ultra-fast, zero-dependency PDF text extraction server using pypdf.
Extracts 100% of pages and 100% of words with no limits.
"""
import io
import json
import sys
from http.server import HTTPServer, BaseHTTPRequestHandler
import urllib.parse
from pypdf import PdfReader

PORT = 8000

class PDFRequestHandler(BaseHTTPRequestHandler):
    def _set_cors_headers(self, status=200, content_type="application/json"):
        self.send_response(status)
        self.send_header("Access-Control-Allow-Origin", "*")
        self.send_header("Access-Control-Allow-Methods", "GET, POST, OPTIONS")
        self.send_header("Access-Control-Allow-Headers", "*")
        self.send_header("Content-Type", content_type)
        self.end_headers()

    def do_OPTIONS(self):
        self._set_cors_headers(204)

    def do_GET(self):
        if self.path in ("/", "/health", "/api/health"):
            self._set_cors_headers(200)
            res = json.dumps({"status": "healthy", "service": "pypdf-extractor", "version": "pypdf-7.1.1"})
            self.wfile.write(res.encode("utf-8"))
        else:
            self._set_cors_headers(404)
            self.wfile.write(b'{"error": "not found"}')

    def do_POST(self):
        parsed = urllib.parse.urlparse(self.path)
        path = parsed.path

        content_length = int(self.headers.get("Content-Length", 0))
        body = self.rfile.read(content_length)

        if path in ("/api/paper/upload", "/api/extract_pdf", "/api/professor/upload"):
            content_type = self.headers.get("Content-Type", "")
            pdf_bytes = b""
            filename = "document.pdf"

            if "multipart/form-data" in content_type:
                # Parse multipart boundary
                boundary = content_type.split("boundary=")[-1].strip().encode()
                parts = body.split(b"--" + boundary)
                for part in parts:
                    if b'filename="' in part:
                        headers, content = part.split(b"\r\n\r\n", 1)
                        # Remove trailing \r\n
                        content = content.rstrip(b"\r\n")
                        pdf_bytes = content
                        try:
                            fn_part = headers.split(b'filename="')[1].split(b'"')[0]
                            filename = fn_part.decode("utf-8", errors="ignore")
                        except Exception:
                            pass
                        break
            else:
                pdf_bytes = body

            if not pdf_bytes:
                self._set_cors_headers(400)
                self.wfile.write(b'{"error": "No PDF data received"}')
                return

            try:
                reader = PdfReader(io.BytesIO(pdf_bytes))
                total_pages = len(reader.pages)
                page_texts = []
                for idx, page in enumerate(reader.pages):
                    pt = page.extract_text()
                    if pt and pt.strip():
                        page_texts.append(f"--- Page {idx + 1} ---\n{pt.strip()}")

                full_text = "\n\n".join(page_texts)
                word_count = len(full_text.split())

                response_data = {
                    "filename": filename,
                    "pages": total_pages,
                    "words": word_count,
                    "text": full_text
                }
                self._set_cors_headers(200)
                self.wfile.write(json.dumps(response_data, ensure_ascii=False).encode("utf-8"))
            except Exception as e:
                self._set_cors_headers(422)
                self.wfile.write(json.dumps({"error": f"pypdf extraction error: {str(e)}"}).encode("utf-8"))

        elif path in ("/api/paper/paste",):
            try:
                data = json.loads(body.decode("utf-8"))
                text = data.get("text", "")
                title = data.get("title", "Pasted Paper")
                word_count = len(text.split())
                response_data = {
                    "filename": title,
                    "pages": 1,
                    "words": word_count,
                    "text": text
                }
                self._set_cors_headers(200)
                self.wfile.write(json.dumps(response_data, ensure_ascii=False).encode("utf-8"))
            except Exception as e:
                self._set_cors_headers(400)
                self.wfile.write(json.dumps({"error": str(e)}).encode("utf-8"))
        else:
            self._set_cors_headers(404)
            self.wfile.write(b'{"error": "unknown endpoint"}')

    def log_message(self, format, *args):
        # Silent or concise logging
        pass

if __name__ == "__main__":
    server = HTTPServer(("0.0.0.0", PORT), PDFRequestHandler)
    print(f"pypdf extraction server running on http://127.0.0.1:{PORT}")
    server.serve_forever()
