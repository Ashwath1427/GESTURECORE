import http.server
import socketserver
import mimetypes
import sys

PORT = 8000

class CustomHandler(http.server.SimpleHTTPRequestHandler):
    def end_headers(self):
        # Force disable caching to prevent "hard refresh" issues
        self.send_header('Cache-Control', 'no-store, no-cache, must-revalidate, max-age=0')
        super().end_headers()

# Force standard MIME types because Windows Registry sometimes corrupts them
mimetypes.init()
mimetypes.add_type('text/css', '.css')
mimetypes.add_type('application/javascript', '.js')
mimetypes.add_type('text/html', '.html')

with socketserver.TCPServer(("", PORT), CustomHandler) as httpd:
    print(f"Server started at http://localhost:{PORT}")
    print("Serving files with correct MIME types and no-cache headers.")
    try:
        httpd.serve_forever()
    except KeyboardInterrupt:
        sys.exit(0)
