"""Authenticated Cloud Run HTTP service invoked by Cloud Scheduler once/minute.

The request is synchronous, non-public, and runs the same validated importer
as the one-off Cloud Run Job version. Request-based billing avoids the Cloud
Run Job minimum one-minute charge on every polling iteration.
"""
import json
import os
import sys
from http.server import BaseHTTPRequestHandler, HTTPServer

from sync import run


class Handler(BaseHTTPRequestHandler):
    def do_GET(self):
        if self.path != "/health":
            self.send_error(404)
            return
        self._reply(200, {"ok": True, "service": "hophdnd-excel-mirror"})

    def do_POST(self):
        if self.path not in ("/", "/sync"):
            self.send_error(404)
            return
        if self.headers.get("Content-Length", "0").isdigit() and \
           int(self.headers.get("Content-Length", "0")) > 1024:
            self.send_error(413)
            return
        try:
            run()
            self._reply(200, {"ok": True, "message": "Source checked, mirror kept/published."})
        except Exception as exc:
            # Never include workbook contents or credentials in HTTP responses.
            print("MIRROR_SYNC_FAILED: " + str(exc), file=sys.stderr, flush=True)
            self._reply(500, {"ok": False, "message": "Sync failed; retained last valid snapshot. See Cloud Run logs."})

    def _reply(self, code, value):
        data=json.dumps(value,separators=(",",":")).encode("utf-8")
        self.send_response(code)
        self.send_header("Content-Type", "application/json; charset=utf-8")
        self.send_header("Cache-Control", "no-store")
        self.send_header("Content-Length", str(len(data)))
        self.end_headers()
        self.wfile.write(data)


if __name__ == "__main__":
    port = int(os.getenv("PORT","8080"))
    if not 1 <= port <= 65535:
        raise ValueError("Invalid Cloud Run PORT")
    print("READY: private mirror HTTP server, port", port, flush=True)
    HTTPServer(("0.0.0.0",port),Handler).serve_forever()
