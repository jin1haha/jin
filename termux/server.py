#!/usr/bin/env python3
"""
Tiny local server for JIN. Binds to 127.0.0.1 only (not exposed on the
network). Run this from inside the mysched/ folder:

    python server.py

Then open http://127.0.0.1:8080 in Chrome and "Install app" from the
browser menu so it opens like a real app instead of a website tab.
"""
import http.server
import os
import socketserver

PORT = 8080
BIND = "127.0.0.1"

os.chdir(os.path.dirname(os.path.dirname(os.path.abspath(__file__))))  # serve mysched/, not termux/

class Handler(http.server.SimpleHTTPRequestHandler):
    def end_headers(self):
        # index.html: always revalidate so app updates show up
        # everything else: let the service worker own caching
        if self.path in ("/", "/index.html"):
            self.send_header("Cache-Control", "no-cache")
        super().end_headers()

    def log_message(self, fmt, *args):
        pass  # keep it quiet / lightweight

class ReusableTCPServer(socketserver.TCPServer):
    allow_reuse_address = True

if __name__ == "__main__":
    with ReusableTCPServer((BIND, PORT), Handler) as httpd:
        print(f"JIN is running at http://{BIND}:{PORT}")
        httpd.serve_forever()
